# CLAUDE.md — Flatmate Finder

This file is the source of truth for architecture, schema, and UI rules. Read it before making changes; update it when a decision changes.

## 1. Overview & Tech Stack

Flatmate Finder is a full-stack web app that helps people find compatible flatmates. Users build a profile with lifestyle preferences (smoking, pets, house parties, cleanliness, budget, move-in date) and a location (city, neighborhood/area, search radius). The app computes a **match score** between users, lets them filter candidates with location and preference pills, send connection requests, and message each other once connected.

| Layer | Tech |
|---|---|
| Client | React 18, Vite, Tailwind CSS 3, React Router, TanStack Query, axios, socket.io-client, lucide-react (icons) |
| Server | Node.js 20, Express, mysql2/promise, bcrypt, jsonwebtoken, zod, socket.io, cookie-parser, cors |
| Database | MySQL 8 (utf8mb4, InnoDB) |
| Language | JavaScript (ESM: `"type": "module"`) on both sides |

Key decisions:
- **Auth:** email + password, bcrypt hashes, JWT stored in an **httpOnly cookie**.
- **DB access:** `mysql2/promise` pool + hand-written SQL migrations. **No ORM.**
- **Messaging:** REST for history, **Socket.IO** for real-time delivery.
- **Radius filter:** `areas` table seeded with lat/lng; distance via **Haversine** in SQL/JS. No paid geocoding API.
- **Validation:** zod schemas on every write endpoint.

## 2. Folder Structure

```
/client
  index.html, vite.config.js, tailwind.config.js, postcss.config.js
  src/
    main.jsx, App.jsx, index.css
    api/            # axios instance + per-resource API fns (auth, profiles, matches, connections, messages)
    components/
      ui/           # Button, Card, StatusBadge, Pill, Input, Select, Slider, Avatar, Modal
      filters/      # LocationFilter, CitySelect, AreaPills, RadiusSlider, PreferencePills
      profile/      # ProfileCard, PreferenceList, ProfileForm
      matches/      # MatchCard, MatchScoreRing, MatchBreakdown
      messages/     # ConversationList, ChatWindow, MessageBubble
      layout/       # Navbar, PageShell
    pages/          # Landing, Login, Register, Onboarding, Browse, ProfileView, MyProfile, Connections, Inbox, Chat
    hooks/          # useAuth, useSocket, useFilters
    context/        # AuthContext
    lib/            # constants (enums), formatters, statusColor.js
/server
  package.json, .env.example
  src/
    index.js        # http server + socket.io bootstrap
    app.js          # express app, middleware, route mounting
    config/         # env.js, db.js (mysql2 pool)
    routes/         # auth, profiles, locations, matches, connections, conversations
    controllers/    # thin: parse req -> call service -> send res
    services/       # business logic: matchService.js, locationService.js (haversine), ...
    models/         # thin parameterized SQL query modules, one per table
    middleware/     # requireAuth (JWT), validate (zod), errorHandler
    validators/     # zod schemas
    sockets/        # chat.js
  db/
    migrations/     # 001_init.sql, 002_..., run in order
    seeds/          # 01_cities_areas.sql, sampleUsers.js
    migrate.js      # migration runner
```

## 3. Database Schema (MySQL 8, utf8mb4, InnoDB)

```
users
  id              INT UNSIGNED PK AUTO_INCREMENT
  email           VARCHAR(255) NOT NULL UNIQUE
  password_hash   VARCHAR(255) NOT NULL
  name            VARCHAR(100) NOT NULL
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

cities
  id              INT UNSIGNED PK AUTO_INCREMENT
  name            VARCHAR(100) NOT NULL
  state           VARCHAR(100)
  country         VARCHAR(100) NOT NULL
  lat             DECIMAL(9,6) NOT NULL
  lng             DECIMAL(9,6) NOT NULL
  UNIQUE (name, country)

areas
  id              INT UNSIGNED PK AUTO_INCREMENT
  city_id         INT UNSIGNED NOT NULL FK -> cities.id
  name            VARCHAR(100) NOT NULL
  lat             DECIMAL(9,6) NOT NULL
  lng             DECIMAL(9,6) NOT NULL
  UNIQUE (city_id, name)

profiles                                  -- 1:1 with users
  user_id         INT UNSIGNED PK, FK -> users.id ON DELETE CASCADE
  bio             TEXT
  age             TINYINT UNSIGNED
  gender          VARCHAR(30)
  occupation      VARCHAR(100)
  avatar_url      VARCHAR(500)              -- photo of the PERSON
  has_room        BOOLEAN DEFAULT FALSE     -- true = has a room to share, false = looking for a place (002)
  room_photo_url  VARCHAR(500) NULL         -- photo of the ROOM; forced NULL when has_room is false (002)
  city_id         INT UNSIGNED FK -> cities.id
  area_id         INT UNSIGNED NULL FK -> areas.id
  search_radius_km INT UNSIGNED DEFAULT 5
  smoking         ENUM('no','yes','flexible') NOT NULL
  pets            ENUM('no','yes','flexible') NOT NULL
  parties         ENUM('no','occasionally','flexible') NOT NULL
  cleanliness     TINYINT UNSIGNED NOT NULL   -- 1 (relaxed) .. 5 (spotless)
  budget_min      INT UNSIGNED NOT NULL
  budget_max      INT UNSIGNED NOT NULL
  move_in_date    DATE NOT NULL
  is_active       BOOLEAN DEFAULT TRUE
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  INDEX (city_id, area_id), INDEX (move_in_date)

connections
  id              INT UNSIGNED PK AUTO_INCREMENT
  requester_id    INT UNSIGNED NOT NULL FK -> users.id
  addressee_id    INT UNSIGNED NOT NULL FK -> users.id
  status          ENUM('pending','accepted','declined') DEFAULT 'pending'
  created_at, updated_at
  UNIQUE (requester_id, addressee_id)

messages                                   -- migration 003 (replaced the old conversations + messages tables)
  id              BIGINT UNSIGNED PK AUTO_INCREMENT
  connection_id   INT UNSIGNED NOT NULL FK -> connections.id ON DELETE CASCADE   -- one accepted connection = one chat thread
  sender_id       INT UNSIGNED NOT NULL FK -> users.id ON DELETE CASCADE
  body            TEXT NOT NULL                -- trimmed, 1–2000 chars (enforced in messageService)
  read_at         DATETIME NULL                -- UTC; NULL = unread by the recipient
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP   -- UTC
  INDEX (connection_id, id), INDEX (connection_id, read_at, sender_id)
```

Rules:
- Users may only message each other when their connection is `accepted`. A FK can't express that, so `messageService.assertThread()` checks it on every read and write (REST and socket).
- There is no `conversations` table. A conversation's id **is** the connection id.
- One connection per pair in either direction. `connectionService.request()` checks the reverse direction (and auto-accepts if they already asked you). The UNIQUE key only covers `(requester_id, addressee_id)`. A DB-level unordered-pair constraint isn't possible here, because MySQL forbids generated columns over FK-CASCADE base columns.
- **Time zone:** the app pool runs `SET time_zone = '+00:00'` on every connection, so new timestamps are UTC. Models return ISO strings via `toIsoUtc()`. Older `users`/`profiles` timestamps from before migration 003 are in IST; only message times are shown to users.

## 4. Match Score Algorithm (`server/src/services/matchService.js`)

Score is 0–100, a weighted sum of factor scores (each 0..1), returned with a per-factor breakdown.

| Factor | Weight | Rule |
|---|---|---|
| Smoking | 15 | equal → 1.0; either side `flexible` → 0.7; `yes` vs `no` → 0 |
| Pets | 15 | same as smoking |
| Parties | 15 | equal → 1.0; `flexible` with anything → 0.7; `occasionally` vs `no` → 0.4 |
| Cleanliness | 15 | `1 − |a − b| / 4` |
| Budget | 20 | overlap length of [min,max] ranges ÷ smaller range length; no overlap → 0 |
| Move-in date | 10 | ≤ 14 days apart → 1.0; linear decay to 0 at 90 days |
| Location | 10 | same area → 1.0; otherwise decays linearly with Haversine distance to 0 at the viewer's radius |

Each breakdown entry: `{ factor, score, weight, status }` where `status` is:
- `match` (score ≥ 0.85) → green
- `partial` (0.35 ≤ score < 0.85) → yellow
- `conflict` (score < 0.35) → red

Keep scoring pure (no DB calls) so it is unit-testable.

## 5. API Surface (REST, prefix `/api`)

- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- Profiles: `GET /profiles/me`, `PUT /profiles/me`, `GET /profiles/:userId`
- Locations: `GET /locations/cities`, `GET /locations/cities/:id/areas`
- Flatmates (built): `GET /flatmates?cityId&areaId&radiusKm&page&limit` returns active profiles (excluding the viewer) within `radiusKm` (1–25) of an origin, nearest first, each with `distanceKm` (1 dp), plus `{ origin, radiusKm, total, hasMore }`.
  - Origin = the `areaId` centre, else the `cityId` centre, else the viewer's own area/city. With none of these it returns `400 LOCATION_REQUIRED`. Radius defaults to the viewer's `searchRadiusKm`.
  - A flatmate's position is their area centre, or their city centre if they have no area.
  - The distance is computed **in MySQL with Haversine** (`models/flatmateModel.js`, R = 6371 km, `ASIN(LEAST(1, SQRT(…)))`), after a lat/lng bounding-box pre-filter. `services/locationService.js#haversineKm` is the JS mirror, and a test asserts they agree for all 21×21 area pairs. Keep the two in sync.
  - Uses `pool.query`, not `execute`, because mysql2 prepared statements reject numeric LIMIT params on MySQL 8.0.22+.
- Matches (planned, Phase 5): extend `/flatmates` with preference filters (`smoking&pets&parties&budgetMax&moveInBefore&minScore&sort`) and add `score` + `breakdown` per result, rather than adding a separate `/matches` endpoint.
- Connections (built): `GET /connections` → `{ incoming, outgoing, accepted }`; `GET /connections/with/:userId` → `{ connection | null }`; `POST /connections` `{ addresseeId }`; `PATCH /connections/:id` `{ status: accepted|declined }` (addressee only, pending only).
- Conversations (built; `:connectionId` = the accepted connection): `GET /conversations` (thread list with `lastMessage`, `unread`, `user.online`), `GET /conversations/:connectionId/messages?before&limit` (oldest→newest page + `hasMore`), `POST /conversations/:connectionId/messages` (REST fallback), `POST /conversations/:connectionId/read`.
- **Socket.IO** (`server/src/sockets/index.js`): the handshake is authenticated with the same JWT cookie (`connect_error: UNAUTHENTICATED` otherwise), and each user joins room `user:<id>`.
  - Client → server, all with ack `{ ok, data | error }`: `message:send {connectionId, body}` (limited to 20 per 10 s per socket), `message:read {connectionId}`, `typing {connectionId, isTyping}`.
  - Server → client: `message:new`, `message:read {connectionId, readerId, readAt}`, `typing`, `presence:list [userIds]` (on connect), `presence:update {userId, online}`, `connection:update {id, status}`.
  - Presence is an in-memory per-process count of open tabs, sent only to accepted connections. Scaling to multiple processes would need the socket.io Redis adapter.
  - Services emit via `emitToUser()`, so REST and socket sends behave identically.
- Client: `SocketContext` owns the socket, presence and typing state, and patches TanStack caches (`['conversations']`, `['messages', id]` infinite query with pages[0] = newest). Sends are optimistic (temp bubble → ack, with Retry/Discard on failure). Inbox lives at `/inbox` and `/inbox/:connectionId`.
- **Inbox colours:** strictly black, white and gray (no `sand-*`). The only colour is the presence dot: green (`status-ok`) = online, `neutral-400` = offline, via `OnlineDot` and `toneFor('online'|'offline')`. Unread badges are black pills (inverted when inside an active black nav pill).

Error shape: `{ error: { code, message, details? } }`.

## 6. STRICT UI Color Guidelines (non-negotiable)

**Base palette:** warm ink `black` (#14120f), `white`, warm grays (`neutral-*` = Tailwind *stone*), and the **`sand-*` background family** (page bg `sand-100` #f4ecdf, soft surfaces `sand-50`, borders/tracks `sand-200/300`). The user asked for a warmer, less "dull white" look on 2026-11-18, which replaced the pure white/gray base. All surfaces, text, borders, buttons, focus rings, icons, links and hover states use only these colors.

**Red, Green, Yellow are status accents ONLY** — used subtly on small indicators (badges, dots, thin borders, score-breakdown chips). Never on buttons, large backgrounds, headings, links, logos, or brand elements.

| Accent | Classes | Meaning |
|---|---|---|
| Green (`status-ok` = emerald-600) | `text-status-ok`, `bg-status-ok/10`, `border-status-ok/30` | Match, Allowed (Yes), Flexible, Accepted |
| Yellow (`status-warn` = amber-500) | `text-status-warn`, `bg-status-warn/10`, `border-status-warn/30` | Occasionally, Pending, Partial match |
| Red (`status-bad` = red-500) | `text-status-bad`, `bg-status-bad/10`, `border-status-bad/30` | Strict No, Conflict, Declined |

Password strength uses the same tones: Weak = red, Medium = yellow, Good = green (`PasswordStrength.jsx`, `lib/passwordStrength.js`). Sign-up is blocked while the password is Weak.

Enforcement:
- All status → color mapping lives in `client/src/lib/statusColor.js` and is rendered via `components/ui/StatusBadge.jsx`. **Never hardcode accent classes anywhere else.**
- `tailwind.config.js` **replaces** (not extends) `theme.colors` with: `transparent`, `current`, `black`, `white`, `neutral`, plus `status.ok` (emerald), `status.warn` (amber), `status.bad` (red). Stray colors like `blue-*` must not compile.
- Primary button: black bg / white text (inverted in dark mode). Secondary: white bg, `neutral-300` border, black text.
- Filter pills: inactive = neutral outline + neutral text; active = solid black (white in dark mode) with inverted text.
- Match score ring: grayscale only (black stroke on `neutral-200` track). Color meaning lives only in breakdown badges.
- Dark mode via Tailwind `class` strategy — still strictly monochrome.
- Typography and spacing carry the visual hierarchy, not color.

### Visual language ("bold, warm, editorial")
- **Type, chosen for readability:** `font-display` = **Bricolage Grotesque ExtraBold (800)** for headlines, big numbers and quotes. To emphasise a word, wrap it in `<em>`, which renders as a thick underline, not italics. `font-sans` = **Plus Jakarta Sans** for UI and body text (15px base). Small labels (`<Eyebrow>`) are `text-xs font-bold uppercase tracking-wider text-neutral-500`. Don't use tiny (<12px) or thin light-gray text. Don't use italic display text. Fonts load in `client/index.html`.
- **Surfaces:** page bg `sand-100`. Cards are white, `rounded-3xl`/`rounded-[28px]`, `shadow-card`. Soft inner panels use `sand-50`. Hero/feature blocks are solid black with `grain` + `bg-dots-inverse`. Use `bg-dots` + `mask-radial` behind heroes.
- Footer shows only the logo and © line; no taglines.
- **Controls:** buttons are `rounded-full` (`primary`, `secondary`, `ghost`, `inverse`, `inverse-outline`). Selected choices (`Pill`, `OptionCards`, cleanliness scale) are solid black with inverted text.
- **Photos:** person photos (`avatarUrl`) always render `grayscale`, in round frames. When there's no photo, `Avatar` shows initials. Room photos (`roomPhotoUrl`) use wide 4:3 or 16:10 frames: grayscale, switching to colour on hover. Both are entered via `PhotoUrlField`, which shows a live preview and labels which kind of photo is wanted.
- Motion: `animate-rise` for entering content, `animate-float` for showcase cards, `animate-marquee` for the neighbourhood band; all disabled under `prefers-reduced-motion`.
- UI building blocks live in `components/ui/`: `Button`, `Card`, `Pill`, `Input`/`Field`, `Textarea`, `Slider`, `OptionCards`, `Avatar`, `Eyebrow`, `StatusBadge`.

## 7. Conventions & Commands

- Client: `cd client && npm run dev` (Vite on :5173; proxies `/api` and `/socket.io` to :4000).
- Server: `cd server && npm run dev` (nodemon on :4000); `npm run migrate`, `npm run seed`, `npm test`.
- Server `.env` keys: `PORT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, CLIENT_ORIGIN`. Never commit `.env`; keep `.env.example` current.
- Parameterized SQL only (`?` placeholders) — never string-concatenate user input into queries.
- Controllers are thin; business logic lives in services; models are plain SQL.
- zod-validate every request body/query on write and filter endpoints.
- Filter state in Browse is synced to the URL query string.
- Server runs **Express 5** (async errors reach the error handler automatically; `req.query` is read-only, so validated queries live on `req.validatedQuery`) and **zod 4** (`z.flattenError`).
- Auth: `requireAuth` middleware sets `req.userId`; `verifyToken()` in `authService.js` is reused for the Socket.IO handshake. `/auth/me` returns `has_profile`, which drives routing to `/onboarding`.
- Client routing: `RequireAuth` (optionally `requireProfile`) and `GuestOnly` guards in `components/layout/RequireAuth.jsx`. Use `<Button as={Link}>` instead of nesting a button inside a link.
- Form errors are shown in **neutral** text with a dark outline — never red (red is a status accent only).
- Server tests: `server/test/*.test.js` with `node --test`.
- **API JSON is camelCase** (`hasProfile`, `budgetMin`, `city: { id, name }`); DB columns are snake_case. Models (`toUser`, `toProfile`) do the mapping.
- Profiles: `PUT /profiles/me` is a full upsert (`INSERT … AS new ON DUPLICATE KEY UPDATE`). The service checks that `areaId` belongs to `cityId`. Currency is INR (`lib/format.js`). Dates are `YYYY-MM-DD` strings (pool uses `dateStrings: true`); parse them with `parseISODate` to avoid UTC off-by-one errors.
- `ProfileWizard` (4 steps: About → Where → How you live → Budget & timing) is used both for `/onboarding` (`mode="create"`) and `/me/edit` (`mode="edit"`). Option labels and descriptions live in `lib/constants.js`.
- Location endpoints were pulled forward into Phase 3 because onboarding needs them.
- `areas` and `cities` carry `lat`/`lng` (DECIMAL(9,6)) locality centres, accurate to roughly ±0.5 km. The seed upserts them, so fixing a coordinate in `01_cities_areas.sql` and re-running `npm run seed` applies the fix.
- Browse (`pages/Browse.jsx`): the filters (`cityId`, `areaId`, `radiusKm`) live in the URL query string and default to the viewer's profile. The radius slider is debounced 250 ms. Every `FlatmateCard` shows the distance with one decimal place (`formatKm`).
- **Portfolio piece by Meenakshi Kalimuthu** (GitHub `meenu10802`, LinkedIn `meenu-chettiar`). The site-wide `Footer.jsx` credits her with GitHub and LinkedIn links (`AUTHOR` constant). Keep it on every page; the brand SVGs are in `components/ui/BrandIcons.jsx`.
- **No demo login.** A 1-click demo login was built and then removed at the user's request (2026-11-18). Don't re-add it.
- `npm run seed` runs `db/seeds/*.sql` and then `db/seeds/sampleUsers.js`, which upserts 9 sample flatmates (`*@sample.flatmatefinder.dev`) for Browse/matching. They get random passwords (they can't be logged into), and their move-in dates are set relative to today.
- `README.md` is the public portfolio README. Keep its API tables and roadmap checkboxes in sync when endpoints or phases change. Screenshots go in `docs/screenshots/`.

## 8. Roadmap

Status (2026-11-18): phases 1–3 done, 4a (distance Browse) done, 6 (connections) and 7 (real-time inbox) done. Still to do: 4b preference filters, 5 match score, 8 polish.

1. **Scaffold** — client (Vite + Tailwind with restricted palette), server (Express, db pool, error handler), migrations + seeds.
2. **Auth** — register/login/logout, JWT cookie, AuthContext, protected routes.
3. **Profiles** — onboarding wizard (preferences, budget range, move-in date, city/area), profile view with StatusBadges.
4. **Locations & filters** — cities/areas endpoints; LocationFilter (city select → area pills → radius slider), preference pills, URL-synced filters.
5. **Matching** — matchService + `/matches`; Browse grid with MatchCard + breakdown; unit tests for scoring.
6. **Connections** — request / accept / decline; Connections page.
7. **Messaging** — conversations, Socket.IO real-time chat, unread counts.
8. **Polish** — empty/loading states, responsive layout, accessibility, more sample data.
