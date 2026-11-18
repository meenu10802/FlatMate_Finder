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
    seeds/          # cities_areas.sql, demo_users.sql
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
  avatar_url      VARCHAR(500)
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

conversations
  id              INT UNSIGNED PK AUTO_INCREMENT
  user_a_id       INT UNSIGNED NOT NULL FK -> users.id   -- always the smaller id
  user_b_id       INT UNSIGNED NOT NULL FK -> users.id   -- always the larger id
  created_at
  UNIQUE (user_a_id, user_b_id)

messages
  id              BIGINT UNSIGNED PK AUTO_INCREMENT
  conversation_id INT UNSIGNED NOT NULL FK -> conversations.id ON DELETE CASCADE
  sender_id       INT UNSIGNED NOT NULL FK -> users.id
  body            TEXT NOT NULL
  read_at         DATETIME NULL
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  INDEX (conversation_id, created_at)
```

Rules:
- Users may only message each other when a connection between them is `accepted`.
- Conversations store the pair ordered (`user_a_id < user_b_id`) so each pair has exactly one row.

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
- Matches: `GET /matches?cityId&areaIds[]&radiusKm&smoking&pets&parties&budgetMax&moveInBefore&minScore&sort&page` → paginated profiles with `score` + `breakdown`
- Connections: `POST /connections` `{ addresseeId }`, `PATCH /connections/:id` `{ status }`, `GET /connections`
- Conversations: `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`
- Socket.IO events: `message:new`, `message:read`, `typing` (handshake authenticated via JWT cookie)

Error shape: `{ error: { code, message, details? } }`.

## 6. STRICT UI Color Guidelines (non-negotiable)

**Base palette is monochrome only:** `black`, `white`, and Tailwind `neutral-*` grays. All surfaces, text, borders, buttons, focus rings, icons, links, and hover states use only these.

**Red, Green, Yellow are status accents ONLY** — used subtly on small indicators (badges, dots, thin borders, score-breakdown chips). Never on buttons, large backgrounds, headings, links, logos, or brand elements.

| Accent | Classes | Meaning |
|---|---|---|
| Green (`status-ok` = emerald-500) | `text-status-ok`, `bg-status-ok/10`, `border-status-ok/30` | Match, Allowed (Yes), Flexible, Accepted |
| Yellow (`status-warn` = amber-500) | `text-status-warn`, `bg-status-warn/10`, `border-status-warn/30` | Occasionally, Pending, Partial match |
| Red (`status-bad` = red-500) | `text-status-bad`, `bg-status-bad/10`, `border-status-bad/30` | Strict No, Conflict, Declined |

Enforcement:
- All status → color mapping lives in `client/src/lib/statusColor.js` and is rendered via `components/ui/StatusBadge.jsx`. **Never hardcode accent classes anywhere else.**
- `tailwind.config.js` **replaces** (not extends) `theme.colors` with: `transparent`, `current`, `black`, `white`, `neutral`, plus `status.ok` (emerald), `status.warn` (amber), `status.bad` (red). Stray colors like `blue-*` must not compile.
- Primary button: black bg / white text (inverted in dark mode). Secondary: white bg, `neutral-300` border, black text.
- Filter pills: inactive = neutral outline + neutral text; active = solid black (white in dark mode) with inverted text.
- Match score ring: grayscale only (black stroke on `neutral-200` track). Color meaning lives only in breakdown badges.
- Dark mode via Tailwind `class` strategy — still strictly monochrome.
- Typography and spacing carry the visual hierarchy, not color.

## 7. Conventions & Commands

- Client: `cd client && npm run dev` (Vite on :5173; proxies `/api` and `/socket.io` to :4000).
- Server: `cd server && npm run dev` (nodemon on :4000); `npm run migrate`, `npm run seed`, `npm test`.
- Server `.env` keys: `PORT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, CLIENT_ORIGIN`. Never commit `.env`; keep `.env.example` current.
- Parameterized SQL only (`?` placeholders) — never string-concatenate user input into queries.
- Controllers are thin; business logic lives in services; models are plain SQL.
- zod-validate every request body/query on write and filter endpoints.
- Filter state in Browse is synced to the URL query string.

## 8. Roadmap

1. **Scaffold** — client (Vite + Tailwind with restricted palette), server (Express, db pool, error handler), migrations + seeds.
2. **Auth** — register/login/logout, JWT cookie, AuthContext, protected routes.
3. **Profiles** — onboarding wizard (preferences, budget range, move-in date, city/area), profile view with StatusBadges.
4. **Locations & filters** — cities/areas endpoints; LocationFilter (city select → area pills → radius slider), preference pills, URL-synced filters.
5. **Matching** — matchService + `/matches`; Browse grid with MatchCard + breakdown; unit tests for scoring.
6. **Connections** — request / accept / decline; Connections page.
7. **Messaging** — conversations, Socket.IO real-time chat, unread counts.
8. **Polish** — empty/loading states, responsive layout, accessibility, demo seed data.
