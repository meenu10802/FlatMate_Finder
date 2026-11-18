# How Flatmate Finder was built: a learning guide

This document walks through the project **in the order it was built**. Each step covers:

- **What we built** — the concrete result
- **Why this choice** — the reasoning, and what was rejected
- **📘 Theory** — the general concept, so you can reuse it in other projects

Read it top to bottom to understand the whole stack, or jump to a topic. The code it refers to is in this repo. CLAUDE.md is the short technical reference; this file is the story and the explanations.

> **Live:** <https://flatmate-finder-4wqe.onrender.com> · **Author:** Meenakshi Kalimuthu ([GitHub](https://github.com/meenu10802) · [LinkedIn](https://www.linkedin.com/in/meenu-chettiar/))

---

## Contents

1. [The idea and the plan](#1-the-idea-and-the-plan)
2. [Choosing the tech stack](#2-choosing-the-tech-stack)
3. [Phase 1: Scaffolding the project](#3-phase-1-scaffolding-the-project)
4. [Phase 2: Authentication](#4-phase-2-authentication)
5. [Design system: from generic to distinctive](#5-design-system-from-generic-to-distinctive)
6. [Phase 3: Profiles and the onboarding wizard](#6-phase-3-profiles-and-the-onboarding-wizard)
7. [Phase 4a: Distance search with Haversine](#7-phase-4a-distance-search-with-haversine)
8. [Phases 6 and 7: Connections and real-time messaging](#8-phases-6-and-7-connections-and-real-time-messaging)
9. [Phases 4b and 5: Filters and the match score](#9-phases-4b-and-5-filters-and-the-match-score)
10. [Phase 8: Polish and accessibility](#10-phase-8-polish-and-accessibility)
11. [Testing strategy](#11-testing-strategy)
12. [Deployment: free hosting that keeps data](#12-deployment-free-hosting-that-keeps-data)
13. [Backups](#13-backups)
14. [Git workflow](#14-git-workflow)
15. [Lessons learned](#15-lessons-learned)
16. [Glossary](#16-glossary)

---

## 1. The idea and the plan

**What we built:** a written plan and a `CLAUDE.md` file before any code. It records the architecture, folder structure, database schema, API surface, the match-score formula and strict UI colour rules, plus an 8-phase roadmap.

**Why:** a full-stack app has many moving parts. Writing the decisions down first means:
- everyone, including an AI assistant in later sessions, follows the same rules;
- the database design is thought through before code depends on it;
- the work splits into small phases that each end in something working.

**📘 Theory: "design docs" and incremental delivery.** Professional teams write short design documents before building. They also ship in **vertical slices**: each phase touches database → API → UI and ends with a working feature, rather than building all the backend first and all the frontend later. You can test each slice, and you always have something working to show.

---

## 2. Choosing the tech stack

| Layer | Choice | Why this one |
|---|---|---|
| UI library | **React 18** | Component model, huge ecosystem, the industry standard for interactive UIs |
| Build tool | **Vite 5** | Near-instant dev server and fast production builds (replaced Create React App) |
| Styling | **Tailwind CSS 3** | Utility classes keep styles next to the markup; the theme config lets us *enforce* the colour palette |
| Routing | **React Router 6** | Standard client-side routing with nested layouts and route guards |
| Server state | **TanStack Query 5** | Caching, refetching and loading/error states for API data, with no hand-written `useEffect` fetching |
| HTTP client | **axios** | Interceptors let us normalise every API error in one place |
| Backend | **Node.js + Express 5** | Same language (JavaScript) on both sides; Express is minimal and well understood. Version 5 forwards async errors automatically. |
| Database | **MySQL 8** | Relational data (users ↔ profiles ↔ connections ↔ messages) with foreign keys and transactions |
| DB driver | **mysql2** | Promise API, connection pooling, parameterised queries. **No ORM**, on purpose: hand-written SQL to learn SQL properly. |
| Validation | **zod 4** | Declarative schemas that both validate and *transform* input |
| Real-time | **Socket.IO 4** | WebSockets with automatic fallback, rooms and acknowledgements |
| Icons | **lucide-react** | Clean, consistent, monochrome line icons |

**📘 Theory: what "full stack" means.**
- **Frontend (client):** runs in the browser and draws the UI.
- **Backend (server):** runs on a machine you control and holds the business rules and secrets.
- **Database:** stores data permanently.

The browser never talks to the database directly. It calls the server's **API**, and the server decides what's allowed. That boundary is what keeps data safe.

**📘 Theory: ORM vs raw SQL.** An ORM (Prisma, Sequelize) maps tables to objects and writes the SQL for you. It's convenient, but it hides what the database actually does. Writing SQL yourself teaches joins, indexes and query cost. That knowledge paid off here: the distance search and the inbox query both needed precise SQL.

---

## 3. Phase 1: Scaffolding the project

**What we built:**
```
/client   React app (Vite + Tailwind)
/server   Express API
  src/  config · routes · controllers · services · models · middleware · validators · sockets
  db/   migrations/*.sql · seeds/ · migrate.js · seed.js
```
We also added a health endpoint (`GET /api/health` runs `SELECT 1`), a migration runner, and seeds for 4 cities and 21 neighbourhoods.

**Why this folder layout:** each layer has one job:
- **routes**: URLs and validation;
- **controllers**: turn an HTTP request into a function call;
- **services**: business rules;
- **models**: SQL only.

When something breaks you know where to look, and services can be tested without HTTP.

**📘 Theory: layered (n-tier) architecture.** Separating *transport* (HTTP), *logic* (services) and *data access* (models) is called **separation of concerns**. For example, the socket handlers reuse the exact same `messageService.send()` as the REST endpoint, because the logic doesn't know or care which transport called it.

**📘 Theory: database migrations.** A migration is a numbered SQL file that changes the schema (`001_init.sql`, `002_room_listing.sql`, …). The runner records applied files in a `_migrations` table and only runs new ones. That gives you:
- a **history** of how the schema evolved, versioned in Git;
- **reproducibility**: any new database (a teammate's laptop, the cloud) gets the identical schema by running `npm run migrate`.

**Never edit a migration that has already run in production; add a new one.** We made two documented exceptions, explained in §12, where the edit was harmless.

**📘 Theory: seeds and idempotency.** Seeds insert reference data (cities, sample users). They're written to be **idempotent**, meaning running them twice gives the same result as once (`ON DUPLICATE KEY UPDATE`, `INSERT IGNORE`). Idempotent scripts are safe to re-run.

**📘 Theory: connection pooling.** Opening a database connection is slow (TCP plus a TLS handshake). A **pool** keeps about 10 connections open and lends them out per query. `server/src/config/db.js` creates one pool for the whole app.

**Design enforcement from day one:** `tailwind.config.js` **replaces** Tailwind's colour palette instead of extending it. Only black, white, greys, the sand background and three `status-*` accents exist. A stray `bg-blue-500` doesn't compile, so the "strict monochrome" rule is enforced by the tooling, not just remembered.

---

## 4. Phase 2: Authentication

**What we built:** register, login, logout and `GET /auth/me`; protected routes in React; a password-strength meter.

### 4.1 Password storage: bcrypt
Passwords are never stored. We store `bcrypt(password)` with **cost 12**.

**📘 Theory: hashing vs encryption.**
- **Encryption** can be reversed with a key.
- **Hashing** is one-way.

On login we hash what the user typed and compare the two hashes. bcrypt adds:
- a **salt**: random data mixed in, so two people with the same password get different hashes, and precomputed "rainbow tables" don't work;
- a **cost factor**: it's deliberately slow (about 250 ms at cost 12), so guessing billions of passwords is impractical.

### 4.2 Sessions: JWT in an httpOnly cookie
After login the server signs a **JWT** `{ sub: userId }` and sends it in a cookie with `HttpOnly; Secure; SameSite=Lax`, valid for 7 days.

**📘 Theory: JWT (JSON Web Token).** A JWT is `header.payload.signature`. The server signs it with a secret (`JWT_SECRET`); if anyone changes the payload, the signature check fails. It's **stateless**: the server needs no session table, it just verifies the signature.

**📘 Theory: why a cookie and not localStorage?**
- Anything in `localStorage` can be read by JavaScript, so one XSS bug would leak every token.
- An **httpOnly** cookie is invisible to JavaScript.
- **SameSite=Lax** stops other sites from making your browser send it on cross-site POSTs (CSRF protection).
- **Secure** means it's only sent over HTTPS.

### 4.3 Other security details
- **Rate limiting** (`express-rate-limit`): 20 login/register attempts per 15 min per IP, which slows brute-force guessing.
- **Timing-safe login:** if the email doesn't exist we still run bcrypt against a dummy hash, and the error message is identical. An attacker can't tell which emails are registered (*user enumeration*).
- **zod validation** on every request body: wrong types or out-of-range values are rejected before any code runs.
- **Parameterised SQL everywhere** (`WHERE id = ?`), which makes SQL injection impossible.

**📘 Theory: SQL injection.** Gluing user input into SQL (`"... WHERE email = '" + email + "'"`) lets an attacker type SQL. With placeholders, the driver sends the query and the values **separately**, so values can never be executed as code.

### 4.4 Frontend auth
`AuthContext` wraps the app; `RequireAuth` and `GuestOnly` route guards redirect users who aren't logged in. The `/auth/me` response includes `hasProfile`, so new users are sent to onboarding automatically.

**📘 Theory: server state vs client state.**
- **Client state** is local UI (is a menu open?).
- **Server state** is data owned by the server (the logged-in user, messages).

TanStack Query is built for server state: it caches by key, deduplicates requests, refetches, and gives `isLoading`/`error` for free.

**Password-strength meter:** red Weak → yellow Medium → green Good, scored on length, mixed case, digits and symbols, with a list of common passwords to reject. Sign-up is blocked while the password is Weak.

---

## 5. Design system: from generic to distinctive

**What happened:** the first version looked generic. It was redesigned as "bold, warm, editorial":

- **Type:** Bricolage Grotesque ExtraBold for headlines and Plus Jakarta Sans for text. An early thin serif was replaced because it was hard to read.
- **Colour:** a warm sand background (`#f4ecdf`) with ink black and warm greys. **Red, green and yellow appear only as small status indicators.**
- **Shared UI components** in `components/ui/`: `Button`, `Pill`, `Card`, `Input`, `OptionCards`, `Slider`, `Avatar`, `StatusBadge`.

**Why a component library:** one `<Button>` used everywhere means one place to fix focus rings, sizes or dark mode. `StatusBadge` is the **only** component allowed to show status colours, and the colour mapping lives in a single file (`lib/statusColor.js`).

**📘 Theory: design tokens.** Instead of hard-coding `#f4ecdf` in 50 places, you name it (`sand-100`) and use the name. Changing the brand colour becomes a one-line edit. Tailwind's theme config is our token system.

**📘 Theory: colour as meaning.** Using colour *only* for status (green = match / allowed, yellow = occasionally / partial, red = strict no / conflict) gives the colour real meaning. Users learn that colour means "pay attention", because it's never decorative.

---

## 6. Phase 3: Profiles and the onboarding wizard

**What we built:** a 4-step wizard (About you → Where → How you live → Budget & timing), plus profile pages and an edit mode. The schema has `cities` → `areas` → `profiles` with foreign keys, and the API is `GET/PUT /api/profiles/me` and `GET /api/profiles/:id`.

**Why a wizard:** 15 fields on one screen is overwhelming. Steps with their own validation and a progress sidebar make onboarding feel short. The same component is reused for editing (`mode="edit"`).

**📘 Theory: database normalisation.** Cities and neighbourhoods live in their own tables, and profiles reference them by id (**foreign keys**). Why not just store `"Chennai"` as text in each profile?
- no spelling variants ("chennai", "Madras");
- coordinates are stored once per area;
- the database itself refuses an `area_id` that doesn't exist.

**📘 Theory: upsert.** `PUT /profiles/me` uses `INSERT … ON DUPLICATE KEY UPDATE`: insert if missing, update if present, in one atomic statement. It's simpler and safer than "SELECT, then INSERT or UPDATE", which can race.

**📘 Theory: camelCase API vs snake_case DB.** SQL convention is `budget_min`; JavaScript convention is `budgetMin`. The **models** translate (`toProfile()`), so neither side has to use the other's style.

**Person photo vs room photo (migration 002):** users mark whether they're *looking* or *have a room*. They can add a photo of themselves (shown grayscale in a circle) and, separately, a room photo, each with a **live preview** so it's obvious which is which.

---

## 7. Phase 4a: Distance search with Haversine

**What we built:** `GET /api/flatmates?areaId&radiusKm` returns people within 1–25 km, nearest first, with the exact distance (e.g. **2.1 km**) on each card.

**📘 Theory: the Haversine formula.** The Earth is (nearly) a sphere, so straight-line maths on latitude and longitude is wrong. Haversine gives the **great-circle distance** between two points:

```
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlng/2)
d = 2 · R · asin(√a)        R = 6371 km (Earth's mean radius)
```

We compute it **inside MySQL**, so the database filters and sorts. We wrap it in `LEAST(1, …)` because floating-point rounding can make `√a` a hair above 1, which would break `asin`.

**📘 Theory: bounding-box pre-filter.** Haversine is expensive, so first we discard anything outside a cheap rectangle (±radius/111 km in latitude). Only rows inside the box get the full formula.

**Why the coordinates were checked:** the first seed had Malad West at the station on the east–west boundary, about 1.3 km off. The seed now *updates* coordinates (`ON DUPLICATE KEY UPDATE`), so fixes apply to existing databases. A test checks that the SQL Haversine matches a JavaScript reference for all 21 × 21 neighbourhood pairs.

**📘 Theory: state in the URL.** Browse filters live in the query string (`?cityId=1&radiusKm=10&smoking=no`). A search can then be bookmarked, shared and refreshed, and the browser's back button works.

**📘 Theory: debouncing.** Dragging the radius slider fires dozens of change events. We wait 250 ms after the last change before calling the API, so one request goes out instead of thirty.

---

## 8. Phases 6 and 7: Connections and real-time messaging

### 8.1 Connections
`connections(requester_id, addressee_id, status: pending | accepted | declined)`. You can message someone only once they **accept**.
- Only the person who received the request can accept it.
- If they had already asked you, your request auto-accepts.

**Why "messages belong to an accepted connection":** a chat thread *is* the connection (`messages.connection_id`), so there's no separate conversations table to keep in sync. The rule "only when accepted" can't be a foreign key, so `messageService.assertThread()` checks it on **every** read and write.

### 8.2 Real-time with Socket.IO
**📘 Theory: HTTP vs WebSockets.**
- **HTTP** is request → response: the server can't speak first. Polling (asking "any new messages?" every few seconds) is wasteful and slow.
- **WebSockets** keep one connection open both ways, so the server *pushes* new messages instantly.
- **Socket.IO** adds automatic reconnection, a fallback when WebSockets are blocked, **rooms** and **acknowledgements** (a callback confirming the server got your event).

How it fits together:
- **Authentication:** the socket handshake reads the same httpOnly JWT cookie as the REST API.
- **Rooms:** each user joins `user:<id>`, and the server emits to that room, which reaches every tab they have open.
- **Events:** `message:send` (with ack), `message:new`, `message:read`, `typing`, `presence:list` / `presence:update`, `connection:update`.
- **Presence:** an in-memory count of open tabs per user. Green dot = online, grey = offline, shown only to accepted connections. This works for one server process; several processes would need a shared store such as Redis.
- **Flood guard:** at most 20 messages per 10 s per socket.

**📘 Theory: optimistic UI.** When you hit send, the bubble appears immediately (greyed, "Sending"). When the server's ack arrives, it becomes real ("Sent"). On failure it shows Retry / Discard. The app feels instant even on a slow network.

**📘 Theory: cursor pagination.** Chat history loads 50 messages at a time using `WHERE id < :oldestId`, not `OFFSET`. Offsets break when new messages arrive mid-scroll; a cursor ("older than this id") never skips or repeats.

**📘 Theory: time zones.** The database server ran on IST. Storing local times means a user in another country sees wrong times. So all app connections run `SET time_zone = '+00:00'`, timestamps are stored in **UTC**, and the API sends ISO strings (`2026-11-18T16:18:13Z`). The browser converts them to the viewer's local time. **Rule: store UTC, display local.**

---

## 9. Phases 4b and 5: Filters and the match score

**What we built:** preference filter pills (smoking, pets, parties, budget, move-in, room, minimum match) and a **0–100 match score** on every card. Profiles show a "How you match" breakdown.

**The formula** (`server/src/services/matchService.js`): a weighted sum over seven factors.

| Factor | Weight | Rule |
|---|---:|---|
| Budget | 20 | overlap of the two rent ranges ÷ the smaller range |
| Smoking | 15 | same → 1 · either flexible → 0.7 · yes vs no → 0 |
| Pets | 15 | same as smoking |
| Parties | 15 | same → 1 · flexible → 0.7 · occasionally vs no → 0.4 |
| Cleanliness | 15 | 1 − |a − b| / 4 |
| Move-in | 10 | ≤ 14 days apart → 1, linear to 0 at 90 days |
| Location | 10 | same area → 1, else decays to 0 at your radius |

Each factor is labelled **match** (≥ 0.85), **partial** (≥ 0.35) or **conflict**, with a plain-English reason ("Budgets overlap by ₹5,000").

**📘 Theory: weighted scoring.** Normalise each factor to 0–1, multiply by its importance, then add. It's transparent: users see *why* they scored 69, which builds more trust than a black-box number.

**📘 Theory: pure functions and testability.** `computeMatch(viewer, candidate)` touches no database and no network; the same input always gives the same output. That makes it trivial to unit-test, and 10 tests pin every rule, including a worked example checked by hand.

**Trade-off we chose:** scores are computed in JavaScript, so the SQL fetches every filtered candidate within the radius (capped at 500). The server then scores, sorts and paginates. At this scale that's simple and fast. If the data grew a lot, the scoring would move into SQL.

---

## 10. Phase 8: Polish and accessibility

**What we built:**
- a mobile menu;
- WCAG AA contrast fixes;
- a skip link;
- per-page titles;
- a 404 page;
- an error boundary;
- an automated **axe-core** audit of every page.

**📘 Theory: WCAG contrast.** The Web Content Accessibility Guidelines require a contrast ratio of at least **4.5 : 1** for normal text. The ratio comes from the *relative luminance* of the two colours: `(L1 + 0.05) / (L2 + 0.05)`. We **measured** our colours instead of guessing:
- The yellow "Partial" badge text was **1.99 : 1**, nearly unreadable.
- The fix: badge **text** uses darker "ink" shades of each hue (6.6 : 1), while the bright hue stays in the dot and tint. It looks the same, but it's readable.
- Grey text on the sand background moved from `neutral-500` (4.09) to `neutral-600` (6.51).

**📘 Theory: ARIA and semantic HTML.** Screen readers announce *roles*. Custom controls need them:
- option cards are `role="radio"` inside a `radiogroup`;
- pills use `aria-pressed`;
- the score ring is `role="img"` with `aria-label="Match score 74 out of 100"`.

The automated audit caught one real bug: an `aria-label` on a plain `<div>`, which screen readers ignore.

**Other polish:**
- **Skip link:** keyboard users can jump past the navbar to the content.
- **Page titles:** `"(2) Inbox · Flatmate Finder"`, so screen readers announce each page change, and the unread count shows in the browser tab.
- **Error boundary:** a crash on one page shows a friendly message, and the navbar keeps working.

---

## 11. Testing strategy

| Suite | Tool | What it covers | Count |
|---|---|---|---|
| Server | Node's built-in `node --test` | Auth, validation, profiles, Haversine (SQL vs JS), filters, scoring, connections, **live sockets with two real clients**, message ordering and paging | 30 |
| Client | Vitest + jsdom + axe-core | Accessibility audit of 11 pages and every wizard step; mobile menu, titles, skip link | 16 |

**📘 Theory: the testing pyramid.**
- Many fast **unit tests**: pure functions like scoring.
- Fewer **integration tests**: API + real database.
- Fewest end-to-end tests: real browser.

Our server tests are integration tests **against a real MySQL**, not mocks, because the risky parts are the SQL. Each test creates temporary users and deletes them afterwards.

**📘 Theory: mocks.** The client tests replace the network (`api/client.js`) and `socket.io-client` with fakes. That lets us render real pages without a running server and test the *UI* in isolation.

**Why the test files run one at a time (`--test-concurrency=1`):** they share one database. When they ran in parallel, one file's temporary users appeared in another file's results. On the slow cloud database this made a test flaky. Shared state plus parallel tests is a classic cause of flaky tests.

---

## 12. Deployment: free hosting that keeps data

**Goal:** a permanent URL, free, with data that survives for months.

| Piece | Chosen | Rejected and why |
|---|---|---|
| Database | **TiDB Cloud Starter**: MySQL-compatible, free, no expiry, TLS required | **Aiven free MySQL** is retired on 21 Dec 2026 and its data deleted. **PlanetScale** no longer has a free tier. Switching to Postgres would have meant a big rewrite. |
| App | **Render** free web service | Sleeps after 15 min idle (about 1 min to wake), but data is unaffected and WebSockets work |

**📘 Theory: PaaS.** *Platform as a Service* (Render, Heroku) takes your Git repo, builds it and runs it. You don't manage servers. A **Blueprint** (`render.yaml`) describes the service as code: build command, start command, health check and environment variables.

**📘 Theory: serverless / scale-to-zero databases.** TiDB Starter shuts compute down when idle and keeps the storage. You pay (or, on the free tier, use quota) only for actual work. Cold starts are the trade-off.

**One origin for everything:** in production, Express also serves the built React app (`client/dist`). Any other GET request gets `index.html`, and React Router takes over. This is the *SPA fallback*.

**📘 Theory: same-origin and cookies.** If the site and the API were on different domains, the session cookie would be a **third-party cookie**, which modern browsers block. Serving both from `flatmate-finder-4wqe.onrender.com` keeps the cookie **first-party**, so no CORS or cookie configuration is needed.

**📘 Theory: environment variables (the "12-factor" idea).** Config that differs between environments (database host, secrets) lives in **environment variables**, not in code. Locally they come from `server/.env`, which is never committed; on Render they're set in the dashboard. The same code runs everywhere.

**📘 Theory: reverse proxy and `trust proxy`.** Render puts a proxy in front of the app. Without `app.set('trust proxy', 1)`, every request would appear to come from the proxy's IP, and rate limiting would treat all users as one person.

### What the cloud database taught us (real bugs found)

Running the full test suite against TiDB found five problems that local MySQL hid:

1. **Row aliases ignored.** TiDB parses `INSERT … AS new … new.col` but doesn't apply it (pingcap/tidb#70814). We switched to `VALUES(col)`, which works on both databases.
2. **ids allocated in batches.** TiDB hands out AUTO_INCREMENT ids per node in chunks, so a newer message could get a *smaller* id, breaking chat order. The fix is `/*T![auto_id_cache] AUTO_ID_CACHE=1 */` on `messages`; MySQL ignores it as a comment.
3. **No subqueries in `ON`.** The inbox query was rewritten with grouped derived tables.
4. **One ALTER can't reference a column it adds.** Migration 002 was split into two statements.
5. **A real race condition:** socket handlers were registered *after* two database awaits. Locally those took about 1 ms; on TiDB about 300 ms. A message sent right after connecting **arrived before its handler existed and was silently dropped**. The fix is to register handlers first and do async work after, and a regression test now covers it.

> Items 1, 2 and 4 edited already-applied migrations or seeds. That was acceptable only because the edits had **identical results on MySQL** and the cloud database was brand new. Normally you'd add a new migration instead.

**📘 Theory: why "works on my machine" isn't enough.** Local databases are about 1 ms away; production is about 300 ms. Higher latency widens timing windows and exposes **race conditions** (bugs that depend on the order of events). Testing against the real production database (or a copy of it) catches what local tests can't.

---

## 13. Backups

**What we built:** `npm run backup:cloud` writes a `.sql` file of every table (plain `INSERT`s in foreign-key order, with original ids). `npm run restore -- <file>` loads one back.

**Why our own backups:** TiDB's free tier keeps its automatic backups for only **1 day**, and free-tier terms can change.

**📘 Theory: logical vs physical backups.**
- A **physical** backup copies the database's files.
- A **logical** backup writes SQL statements that recreate the data.

Logical backups are portable (MySQL ↔ TiDB) and readable. That's why we generate them with mysql2 instead of depending on the `mysqldump` version.

**A bug the round-trip test caught:** the first version used `INSERT IGNORE` and allowed restoring into a database that already had data. Users whose ids collided were skipped, but **their profiles were still inserted, attached to the wrong people**. The fix:
- restore refuses any non-empty database;
- it runs inside a **transaction** (all or nothing);
- the backup uses plain `INSERT`, so any conflict fails loudly.

The round trip was then verified table by table with SHA-256 hashes: byte-identical.

**📘 Theory: transactions (ACID).** A transaction groups statements so they all succeed or none do (*Atomicity*). If a restore fails halfway, `ROLLBACK` leaves the database untouched, never half-restored.

**Rule of thumb:** a backup you've never restored is just a hope. **Test the restore.**

---

## 14. Git workflow

- `main` always holds working code, and Render auto-deploys every push to it.
- Larger work went on a **feature branch** (`feature/matching-and-polish`), then a **fast-forward merge** into `main`, then the branch was deleted.
- `.gitignore` blocks `node_modules/`, `dist/`, every `.env*` file except `.env.example`, and `server/backups/`. **Secrets and private data never enter Git history.**
- Commit messages explain *why*, not just *what*.

**📘 Theory: why secrets must never be committed.** Git history is forever: deleting a file later doesn't remove it from old commits. A leaked database password in a public repo can be found by bots within minutes. If one ever leaks, **rotate it** (generate a new one) immediately.

**📘 Theory: fast-forward merge.** If `main` hasn't changed since the branch was created, merging just moves the `main` pointer forward. There's no merge commit, and the history stays linear.

---

## 15. Lessons learned

1. **Write the plan and rules down first** (CLAUDE.md). It kept a long project consistent.
2. **Enforce rules with tools, not memory:** a Tailwind palette that won't compile stray colours, axe-core for accessibility, zod for input.
3. **Measure, don't guess:** contrast ratios, Haversine accuracy and backup integrity were all *measured*.
4. **Test against the real production environment:** TiDB exposed five bugs that MySQL hid.
5. **Latency exposes races:** never `await` before registering event handlers.
6. **Store UTC, display local.**
7. **Back up, and test the restore.** The restore test caught a data-mixing bug.
8. **Keep the session cookie first-party** by serving the frontend and API from one origin.
9. **Free tiers change:** have an exit plan (portable logical backups, MySQL-compatible SQL).
10. **Accessibility is mostly about details:** contrast, labels, focus, and roles on custom controls.

---

## 16. Glossary

| Term | Meaning |
|---|---|
| **API** | The set of URLs the frontend calls to read and change data |
| **REST** | An API style: resources as URLs and HTTP verbs (`GET` read, `POST` create, `PUT` replace, `PATCH` update) |
| **SPA** | Single-Page App: one HTML page, and JavaScript swaps the views |
| **Migration** | A numbered, version-controlled schema change |
| **Seed** | A script that inserts starter or reference data |
| **Foreign key** | A column that must match a row in another table (enforced by the DB) |
| **Index** | A lookup structure that makes `WHERE` and `ORDER BY` fast |
| **Upsert** | Insert, or update if it already exists, in one statement |
| **Connection pool** | Reusable open DB connections shared by requests |
| **bcrypt** | Slow, salted password-hashing algorithm |
| **JWT** | Signed token that proves who you are without a server-side session |
| **httpOnly / Secure / SameSite** | Cookie flags: hidden from JS / HTTPS only / not sent on cross-site requests |
| **XSS / CSRF** | Injected-script attacks / tricking a browser into sending authenticated requests |
| **Rate limiting** | Capping requests per time window per client |
| **WebSocket** | Persistent two-way connection between browser and server |
| **Socket.IO room** | A named group of sockets you can broadcast to |
| **Ack (acknowledgement)** | Server callback confirming an event was received and processed |
| **Optimistic UI** | Show the result immediately; confirm or roll back when the server answers |
| **Cursor pagination** | "Give me items before id X" instead of page offsets |
| **Haversine** | Formula for distance on a sphere from latitude/longitude |
| **Debounce** | Wait until input stops before acting |
| **Pure function** | Output depends only on input; no side effects |
| **WCAG / contrast ratio** | Accessibility guidelines / luminance ratio between text and background |
| **ARIA** | Attributes that tell assistive technology what a custom element is |
| **axe-core** | Automated accessibility checker |
| **Mock** | Fake replacement for a dependency in tests |
| **PaaS** | Platform that builds and runs your app from a repo |
| **Cold start** | Delay while a sleeping service starts up |
| **Environment variable** | Config passed to a program from outside its code |
| **Reverse proxy** | Server in front of your app that forwards traffic to it |
| **TLS** | Encryption for data in transit (the "S" in HTTPS) |
| **Transaction** | All-or-nothing group of database statements |
| **Logical backup** | Data exported as SQL statements |
| **Race condition** | Bug that depends on the timing or order of events |
| **Fast-forward merge** | Merge that just moves the branch pointer (no merge commit) |
