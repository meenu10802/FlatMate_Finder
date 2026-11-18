# New laptop setup & live-site health check

Use this guide if your laptop is lost, broken or replaced.

**Contents:**
- [0. What you need first](#0-before-you-start-what-you-need)
- [1. Install the tools](#1-install-the-tools-windows)
- [2. Get the code](#2-get-the-code-from-github)
- [3. Secret config files](#3-recreate-your-secret-config-files)
- [4. Run it locally](#4-run-the-app-on-the-new-laptop-local-development)
- [5. Is the live site healthy?](#5-is-the-live-site-healthy-5-minute-check)
- [6. Back up](#6-back-up-the-live-data)
- [7. Fixes & restore](#7-somethings-wrong-fixes)
- [8. Monthly checklist](#8-monthly-checklist-5-minutes)

> **Good news first:** losing your laptop does **not** take the website down or lose any data.
> The code lives on **GitHub**, the running site on **Render**, and all the data in **TiDB Cloud**.
> The laptop only holds a working copy, your local test database, and your backup files.

---

## 0. Before you start: what you need

| You need | Where to find it |
|---|---|
| GitHub login | Your password manager / email |
| Render login (you signed up with GitHub) | <https://dashboard.render.com> |
| TiDB Cloud login | <https://tidbcloud.com> |
| The cloud database details (host, user, password) | Your password manager (you saved the contents of `server/.env.cloud`). Lost the password? You can generate a new one; see [§7.3](#73-i-lost-the-tidb-password). |
| Your latest backup file (`.sql`) | Wherever you copied it (Google Drive / OneDrive / USB). It is **not** on GitHub, on purpose. |

Live site: **<https://flatmate-finder-4wqe.onrender.com>**
Repository: **<https://github.com/meenu10802/FlatMate_Finder>**

---

## 1. Install the tools (Windows)

Install these in order and accept the default options:

| Tool | Why | Download | Check it worked (new terminal) |
|---|---|---|---|
| **Git** | Downloads the code and pushes changes. Also installs **Git Bash**. | <https://git-scm.com/download/win> | `git --version` |
| **Node.js 22 LTS** | Runs the server, the build tools and the tests. Includes `npm`. | <https://nodejs.org> (choose the LTS) | `node -v` → `v22.x`, `npm -v` |
| **VS Code** *(recommended)* | Editor with a built-in terminal | <https://code.visualstudio.com> | — |
| **MySQL 8 Community Server** *(only for local development)* | A local database to experiment with, without touching live data | <https://dev.mysql.com/downloads/installer/> | `mysql --version` |

> When the MySQL installer asks for a **root password**, write it down. You'll need it in step 3.
> If you only want to check the live site or take backups, you can skip MySQL.

---

## 2. Get the code from GitHub

Open a terminal (VS Code → **Terminal → New Terminal**, or PowerShell) and run:

```powershell
cd $HOME\Desktop
git clone https://github.com/meenu10802/FlatMate_Finder.git
cd FlatMate_Finder
```

Tell Git who you are, so your future commits are labelled correctly:

```powershell
git config --global user.name  "meenu10802"
git config --global user.email "<the email on your GitHub account>"
```

Install the project's libraries. This creates `node_modules` folders, which are never stored on GitHub:

```powershell
cd server
npm install
cd ..\client
npm install
cd ..
```

---

## 3. Recreate your secret config files

These files are **deliberately not on GitHub** (see `.gitignore`), so you have to recreate them.

### 3.1 `server/.env`: your local database

Copy the template and edit it:

```powershell
copy server\.env.example server\.env
notepad server\.env
```

Set `DB_PASSWORD` to your **local** MySQL root password. Set `JWT_SECRET` to any long random string; you can generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3.2 `server/.env.cloud`: the live database (for backups and checks)

Create `server/.env.cloud` with these lines, filled from your password manager:

```env
DB_HOST=gateway01.ap-northeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=xxxxxxxx.root
DB_PASSWORD=your-tidb-password
DB_NAME=flatmate_finder
DB_SSL=true
JWT_SECRET=local-scripts-only
```

> ⚠️ **Never commit** `.env`, `.env.cloud` or anything in `server/backups/`. `.gitignore` already blocks them.
> Run `git status` before every commit; those files must never appear in the list.

---

## 4. Run the app on the new laptop (local development)

This runs a private copy on your laptop against your **local** MySQL. It never touches the live data.

```powershell
cd server
npm run migrate     # creates the local database + tables
npm run seed        # adds cities, neighbourhoods and 9 sample flatmates
npm run dev         # API + live chat on http://localhost:4000  (leave this terminal running)
```

Open a **second** terminal:

```powershell
cd client
npm run dev         # website on http://localhost:5173
```

Open **<http://localhost:5173>**, sign up, and complete the profile wizard.

**Run the tests** (optional, but a good sign everything installed correctly):

```powershell
cd server ; npm test      # expect: tests 30, pass 30
cd ..\client ; npm test   # expect: 16 passed
```

> **Don't** run `npm run dev` or `npm test` against `.env.cloud`. The tests create and delete temporary users, and the dev server would write to live data. Use the cloud file only for the checks and backups below.

---

## 5. Is the live site healthy? (5-minute check)

### 5.1 The website itself

1. Open **<https://flatmate-finder-4wqe.onrender.com/api/health>**.
   - If it was asleep, the first load takes **about a minute**. That's normal on the free plan.
   - You should see: `{"status":"ok","db":"up"}`
     - `status: ok` → Render is running the app.
     - `db: up` → the app can reach TiDB.
2. Open **<https://flatmate-finder-4wqe.onrender.com>**, log in, and check your **Connections** and **Inbox** are as you left them.

### 5.2 Render dashboard (the app)

Go to <https://dashboard.render.com> → **flatmate-finder**:

| Where | What healthy looks like |
|---|---|
| Top of the page | Status **Live** (or **Suspended / sleeping** when idle, which is fine) |
| **Events** | The latest deploy says **Deploy live** with a recent commit from `main` |
| **Logs** | Contains `API + Socket.IO listening on port … (production, serving client build)` and no repeated errors |
| **Environment** | `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_PORT=4000`, `DB_NAME=flatmate_finder`, `DB_SSL=true`, `NODE_ENV=production`, `JWT_SECRET`, `CLIENT_ORIGIN=https://flatmate-finder-4wqe.onrender.com` |

To force a fresh deploy: **Manual Deploy → Deploy latest commit**. Your data is not affected.

### 5.3 TiDB Cloud console (the data)

Go to <https://tidbcloud.com> and open your instance:

| Where | What healthy looks like |
|---|---|
| Instance list | Status **Available** |
| **Overview / Usage** | Storage and Request Units well inside the free quota (this app uses a tiny fraction) |
| **SQL Editor** | Run the query below and confirm the numbers look right |

```sql
USE flatmate_finder;
SELECT (SELECT COUNT(*) FROM users)       AS users,
       (SELECT COUNT(*) FROM connections) AS connections,
       (SELECT COUNT(*) FROM messages)    AS messages;
```

### 5.4 From your laptop (proves your saved credentials still work)

In `server`, take a backup (next section). If it prints `→ …tidbcloud.com:4000/flatmate_finder (TLS)` followed by row counts, the database is reachable and your credentials are correct.

---

## 6. Back up the live data

```powershell
cd server
npm run backup:cloud
```

It writes `server/backups/flatmate_finder-<date>T<time>Z.sql` (the time is UTC). **Copy that file somewhere private off the laptop.** It contains private messages and password hashes, so never put it anywhere public. Do this monthly, and always before big changes.

---

## 7. Something's wrong: fixes

### 7.1 Quick troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Site takes ~1 min to load | Free plan was asleep | Normal. Wait. |
| `/api/health` shows an error, or `db` isn't `up` | Render can't reach TiDB | Check TiDB is **Available** (§5.3). Check Render **Environment** values match your saved ones. Redeploy. |
| Render deploy **failed** | Build error in the latest commit | Render keeps the previous working version live. Open **Logs**, fix it, and push again. Or roll back: **Events → previous deploy → Rollback**. |
| Render says Node version unsupported | Node 22 went end-of-life (April 2027) | Change `.node-version` from `22` to `24`, commit and push |
| `npm run migrate` says *Access denied* | Wrong password in `server/.env` | Fix `DB_PASSWORD`. (`server/.env` always wins over any machine-wide `DB_PASSWORD` variable.) |
| Everyone got logged out | `JWT_SECRET` changed on Render | Harmless: just log in again. Data is unaffected. |
| Forgot your site password | No reset feature yet | Ask for help: a new password hash can be written directly to the database |

### 7.2 Commands that target the cloud database

`npm run backup:cloud` works in any terminal. For **other** scripts against the cloud DB, set `ENV_FILE` first.

**PowerShell:**
```powershell
$env:ENV_FILE = ".env.cloud"
npm run migrate                 # e.g. after pulling a new migration
Remove-Item Env:ENV_FILE        # IMPORTANT: switch back to local afterwards
```

**Git Bash:**
```bash
ENV_FILE=.env.cloud npm run migrate
```

Every script prints its target first, e.g. `→ …tidbcloud.com:4000/flatmate_finder (TLS) [.env.cloud]`. **Read that line** so you always know which database you're touching.

### 7.3 I lost the TiDB password
TiDB Cloud → your instance → **Connect** → **Generate password** / **Reset password**. Then update **both**:
1. `server/.env.cloud` on your laptop, and
2. Render → **Environment** → `DB_PASSWORD` → **Save changes**. Render restarts the app with the new password.

### 7.4 The TiDB database is gone (worst case)
This is what your backups are for.

1. Create a new free **TiDB Cloud Starter** instance. Click **Connect**, then generate a password and note the host, user and password.
2. Put the new details into `server/.env.cloud`.
3. Create the tables, then load your newest backup. The restore only runs on an **empty** database and is all-or-nothing:
   ```bash
   # Git Bash, inside /server
   ENV_FILE=.env.cloud npm run migrate
   ENV_FILE=.env.cloud npm run restore -- backups/<your-newest-file>.sql
   ```
   Do **not** run `seed` here; the backup already contains the cities and sample flatmates.
4. On Render → **Environment**, update `DB_HOST`, `DB_USER` and `DB_PASSWORD` to the new values and save.
5. Check `/api/health`, then log in and look at your Inbox.

### 7.5 Render service is gone (worst case)
Your code is safe on GitHub. Render → **New → Blueprint** → choose **FlatMate_Finder**. It reads `render.yaml`. Fill in `DB_HOST`, `DB_USER`, `DB_PASSWORD` and `CLIENT_ORIGIN` (the new `…onrender.com` address) → **Apply**. The data is still in TiDB, so everything reappears as soon as the deploy is live.

---

## 8. Monthly checklist (5 minutes)

- [ ] Open the site and log in; Connections and Inbox look right
- [ ] `npm run backup:cloud`, then copy the file off the laptop
- [ ] Skim your email for notices from **Render** or **TiDB** about free-tier changes
- [ ] (Only if you changed code) `git status` is clean, `git push` is done, and Render shows **Deploy live**
