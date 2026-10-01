# OllJira Website — Deployment Guide

> **Recommended setup (all-in-one cPanel):** frontend AND backend both live on cPanel. GitHub Actions auto-deploy both on every push to `main`. No VPS, no tunnel, one host.
> The Dokploy/homelab alternative is kept at the bottom as a fallback.

## Architecture (all-in-one cPanel)

```
Visitor
  ├─► olljira.com        → cPanel static site (dist/, auto-deployed)
  │        │ cross-origin, cookies
  │        ▼
  └─► api.olljira.com    → cPanel "Setup Node.js App" (Passenger)
                             └── cPanel MySQL/MariaDB database
```

---

## 1. cPanel one-time setup

### a) Database
1. cPanel → **MySQL® Databases** → create database `olljira` and a user with a strong password; add the user to the DB with **ALL PRIVILEGES**.
2. Your `DATABASE_URL` will be: `mysql://USER:PASS@localhost:3306/DBNAME` (cPanel prefixes names, e.g. `cpaneluser_olljira`).

### b) Node.js app (the API)
1. cPanel → **Setup Node.js App** → **Create Application**:
   - Node.js version: **20 or newer**
   - Application mode: **Production**
   - Application root: `olljira-api` (this becomes `/home/USER/olljira-api/`)
   - Application URL: **`api.olljira.com`** (create the subdomain first if asked)
   - Application startup file: **`app.js`**
2. In the app's **Environment variables**, add:

```
NODE_ENV=production
APP_ID=olljira-web
APP_SECRET=<fresh random hex, 64 chars>
DATABASE_URL=mysql://USER:PASS@localhost:3306/DBNAME
ADMIN_EMAIL=admin@olljira.com
ADMIN_PASSWORD=<strong password>
CORS_ORIGIN=https://olljira.com,https://www.olljira.com
```

3. Don't start it yet — the code arrives via the first deploy (below). First boot creates all tables and seeds content automatically.

### c) Frontend site
1. Point `olljira.com`'s document root at `/public_html/` (default).
2. Enable **AutoSSL** for both `olljira.com` and `api.olljira.com` — required: session cookies are `Secure` off-localhost.

---

## 2. GitHub one-time setup

### Frontend repo (`birukjira/olljira-frontend`)
Settings → Secrets and variables → Actions:

**Secrets:** `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` (cPanel FTP credentials)
**Variables:**
| Name | Value |
|---|---|
| `VITE_API_URL` | `https://api.olljira.com` |
| `FTP_SERVER_DIR` | `/public_html/` |

Workflow: `.github/workflows/deploy.yml` — builds `dist/` (includes `.htaccess` SPA fallback) and uploads over FTPS on every push.

### Backend repo (`birukjira/olljira-backend`)
**Secrets:** same `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`
**Variables:**
| Name | Value |
|---|---|
| `APP_SERVER_DIR` | `/home/USER/olljira-api/` (the Node app root from step 1b) |

Workflow: `.github/workflows/deploy.yml` — builds the Passenger bundle (`dist/passenger.js`) and uploads `app.js` + `dist/` + `public/` + a fresh `tmp/restart.txt` (which makes Passenger restart the app automatically after each deploy).

---

## 3. Go live

1. Run the backend workflow first (Actions → "Deploy backend to cPanel" → Run workflow).
2. In cPanel → Setup Node.js App → **Start** the app.
3. Verify: `curl https://api.olljira.com/api/health` → `{"status":"ok","database":true}`.
4. Run the frontend workflow → open `https://olljira.com`.
5. Sign in at `https://olljira.com/login` with your `ADMIN_EMAIL`/`ADMIN_PASSWORD` → change content in `/admin`.
6. Refresh a deep route like `/projects` — must not 404.

### Troubleshooting
| Symptom | Fix |
|---|---|
| `database:false` in health | Wrong `DATABASE_URL` — cPanel prefixes DB/user names (`cpaneluser_...`) |
| 503 from Passenger | Check the app's error log in cPanel; usually a missing env var (`APP_SECRET`, `DATABASE_URL`) |
| Old code after deploy | Passenger didn't restart — confirm `tmp/restart.txt` exists in the app root and re-run the workflow |
| Login works locally but not live | SSL missing on either domain, or `CORS_ORIGIN` doesn't match the frontend origin exactly |

---

## Fallback: backend on Dokploy/homelab

<details>
<summary>Click to expand the homelab alternative (Pangolin tunnel + Dokploy)</summary>

Same pattern as `Homelab_Deployment_Handover.md`:

1. Dokploy → MariaDB service (`mariadb:11`), copy credentials from the Credentials tab.
2. Dokploy → Application from `birukjira/olljira-backend`, **Dockerfile build** (root `Dockerfile`, pnpm-based — npm is broken on that network path), publish port e.g. `3002 → 3000`.
3. Env vars as above, with `DATABASE_URL=mysql://USER:PASS@<mariadb-service-name>:3306/olljira`.
4. **Deploy** (not Rebuild). First boot auto-migrates and seeds.
5. Pangolin → resource `olljira-api`: `https://api.olljira.com` → `127.0.0.1:3002`, **auth gate OFF** (gate breaks CORS preflight).
6. Verify: `curl https://api.olljira.com/api/health`.

</details>

---

## Security checklist before launch

- [ ] Strong `ADMIN_PASSWORD` (never the local `admin12345`)
- [ ] Fresh `APP_SECRET` for production
- [ ] `CORS_ORIGIN` = exact frontend origin(s)
- [ ] SSL active on `olljira.com` and `api.olljira.com`
- [ ] FTP credentials only in GitHub secrets
