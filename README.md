# OllJira Website — Backend (API + CMS)

Hono + tRPC 11 + Drizzle ORM on a MySQL-compatible database
(TiDB Cloud in production, MariaDB/MySQL locally).

Serves `/api/trpc` for the companion frontend (**olljira-frontend**):
public content endpoints, contact-form intake with email notification,
admin CMS endpoints (posts, projects, hero slides, jobs, testimonials,
messages, media, settings), and self-owned email+password auth
(bcrypt hashes, HS256 JWT in the `olljira_sid` httpOnly cookie).

## Setup

```bash
npm install
cp .env.example .env
```

```dotenv
DATABASE_URL=mysql://user:password@host:3306/olljira
APP_SECRET=<long-random-string>
ADMIN_EMAIL=admin@olljira.com
ADMIN_PASSWORD=<strong-password>
PORT=3000
```

On boot the server applies migrations from `db/migrations/`, creates/refreshes
the admin account, and seeds CMS content when tables are empty (and only
missing slugs afterwards).

```bash
npm run dev      # tsx watch
npm run build    # esbuild bundle -> dist/boot.js
npm start        # NODE_ENV=production node dist/boot.js
```

## CORS / frontend origin

The API sets session cookies with `credentials: "include"` from the browser.
Deploy so the frontend origin is allowed (same-origin reverse proxy is the
simplest: route `/api/*` to this service and leave `VITE_API_URL` empty in
the frontend).

## Notes

- `api/boot.ts` also contains a static-file handler (`dist/public`) used by
  the all-in-one monorepo deployment. In a split deploy there is no
  `dist/public`, so only `/api/*` routes respond — that's expected.
- Seed HTML bodies live in `public/content/seed/` in the monorepo; the
  bootstrap loader reads them from the working directory — when deploying
  this repo standalone, copy that folder here (it ships in the repo root
  as `public/content/seed/`).
