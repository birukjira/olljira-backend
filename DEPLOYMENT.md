# OllJira Website — Deployment Guide

> How the OllJira site goes live: static frontend on cPanel (auto-deployed by GitHub Actions), backend + MariaDB on the homelab via Dokploy, exposed through the Pangolin tunnel.
> Follows the same pattern as `Homelab_Deployment_Handover.md` (birukjira.site). Read that first for the tunnel/Dokploy/npm-bug background.

## Architecture

```
Visitor
  ├─► olljira.com            → cPanel shared hosting, static Vite/React dist
  │        │ cross-origin (CORS, credentials)
  │        ▼
  └─► api.olljira.com        → Linode VPS 172.104.247.216 (Pangolin)
                                     │ WireGuard tunnel (Newt on homelab)
                                     ▼
                               homelab laptop
                                 ├── Dokploy → olljira-api (Hono+tRPC, :3000→published port)
                                 └── Dokploy → olljira-mariadb (mariadb:11)
```

---

## 1. Frontend → cPanel (GitHub Actions)

Workflow: `.github/workflows/deploy.yml` in **olljira-frontend**. Every push to `main` builds `dist/` and uploads it over FTPS. `.htaccess` (SPA fallback) ships inside `dist/` automatically from `public/.htaccess`.

### One-time GitHub setup (repo: `birukjira/olljira-frontend`)

Settings → Secrets and variables → Actions:

**Secrets:**
| Name | Value |
|---|---|
| `FTP_SERVER` | cPanel FTP host (e.g. `ftp.olljira.com` or the server IP) |
| `FTP_USERNAME` | cPanel FTP user |
| `FTP_PASSWORD` | cPanel FTP password |

**Variables:**
| Name | Value |
|---|---|
| `VITE_API_URL` | `https://api.olljira.com` (no trailing slash) |
| `FTP_SERVER_DIR` | cPanel web root path, e.g. `/public_html/` |

### cPanel side

1. Point the domain's document root at the directory above.
2. Enable SSL (AutoSSL / Let's Encrypt) — required: session cookies are `Secure` off-localhost.
3. Nothing else to install; the site is fully static.

---

## 2. Backend → Dokploy on homelab

### MariaDB service

1. Dokploy → project `olljira` → **Add Database → MariaDB** (image `mariadb:11`).
2. Copy the credentials from the **Credentials** tab — never type from memory.
3. Internal hostname = the swarm service name (e.g. `olljira-mariadb-xxxx`) on `dokploy-network`.

### API application

1. Dokploy → **Add Application**, repo `birukjira/olljira-backend` via the GitHub App integration.
2. **Build type: Dockerfile** — the root `Dockerfile` is the pnpm-based one (npm is broken on this network path; see handover §7). Dockerfile builds always use the **repo root** as context.
3. **Advanced → Ports:** publish e.g. `3002 → 3000` (3001 is taken by the portfolio API).
4. **Environment:**

```
NODE_ENV=production
PORT=3000
APP_ID=olljira-web
APP_SECRET=<fresh random hex — do NOT reuse the local one>
DATABASE_URL=mysql://<USER>:<PASS>@<mariadb-service-name>:3306/olljira
ADMIN_EMAIL=admin@olljira.com
ADMIN_PASSWORD=<strong password>
CORS_ORIGIN=https://olljira.com,https://www.olljira.com
```

5. Click **Deploy** (not Rebuild — rebuild uses the stale on-disk clone).
6. First boot runs `ensureSchemaAndSeed()` automatically: creates tables and seeds content + the admin user.

### Verify

```bash
docker ps --filter "name=olljira" --format "{{.Names}}"
curl -s http://127.0.0.1:3002/api/health    # expect {"status":"ok","database":true}
```

If `database:false`, check the logs for MySQL auth errors — the MariaDB user/password must come from the Credentials tab.

---

## 3. Public exposure → Pangolin

1. DNS (Namecheap): `A api.olljira.com → 172.104.247.216`.
2. Pangolin → site `homelab-v2` → new resource `olljira-api`:
   - `https://api.olljira.com` → target `127.0.0.1:3002`
   - **Auth gate OFF** — the gate breaks CORS preflight (302 on OPTIONS kills every browser API call).
3. Verify: `curl -s https://api.olljira.com/api/health` → `{"status":"ok","database":true}`.

---

## 4. First end-to-end test

1. Push anything to `olljira-frontend` main (or run the workflow manually) → dist lands on cPanel.
2. Open `https://olljira.com` — homepage loads, Work Samples/Blogs come from the API.
3. Open `https://olljira.com/login`, sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` → admin dashboard works.
4. Refresh on a deep route (e.g. `/projects`) — must not 404 (the `.htaccess` fallback).

---

## 5. Security checklist before launch

- [ ] Strong `ADMIN_PASSWORD` in Dokploy env (local default `admin12345` must not go live)
- [ ] Fresh `APP_SECRET` (the one in the local `.env` is committed to this machine only — still rotate for production)
- [ ] `CORS_ORIGIN` set to the exact frontend origin(s)
- [ ] SSL active on both `olljira.com` (cPanel AutoSSL) and `api.olljira.com` (Pangolin)
- [ ] FTP credentials stored only in GitHub secrets
- [ ] Pangolin auth gate OFF on the API resource, ON on dokploy dashboard (unchanged)
