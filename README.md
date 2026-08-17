# 404connernotfound Portfolio

SvelteKit + Tailwind portfolio site with an admin UI, PostgreSQL-first storage, Redis-backed caching/rate limiting, and a Docker/Nginx deployment path for `portfolio.404connernotfound.dev`.

## Requirements
- Node `24.13.0` for local development (see `.nvmrc`)
- npm (engine strict is enabled via `.npmrc`)
- Docker Engine with the Compose plugin for the VPS deployment
- Nginx on the VPS host for the Cloudflare-facing reverse proxy

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and update values.
3. Optional local infrastructure (PostgreSQL + Redis with persistent volumes): `docker compose -f docker-compose.local.yml up -d`
4. Initialize the SQLite content database (recommended for production): `npm run db:seed`
5. Optional: backfill SQLite data into PostgreSQL: `npm run db:migrate:postgres`

## Environment Variables
- `DATABASE_URL`: PostgreSQL connection string used for full app storage (content/admin/telemetry)
- `HOST` / `PORT`: SvelteKit adapter-node bind host and port
- `ORIGIN`: Public origin, `https://portfolio.404connernotfound.dev` in production
- `PROTOCOL_HEADER` / `HOST_HEADER` / `PORT_HEADER`: Trusted reverse-proxy headers for SvelteKit URL generation
- `ADDRESS_HEADER`: Trusted header used by `event.getClientAddress()`; production Nginx sets `X-Real-IP`
- `PG_SSL`: Enable SSL for PostgreSQL (`true` / `false`)
- `PG_POOL_MAX`: Maximum PostgreSQL connection pool size
- `REDIS_URL`: Redis connection string for distributed rate limiting and caching
- `REDIS_PREFIX`: Redis key prefix (default `portfolio:`)
- `BODY_SIZE_LIMIT`: Node adapter max request body size (default `512K`, set `8M` for admin uploads)
- `DB_PATH`: SQLite file path for fallback/local data storage (relative to project root if not absolute)
- `DB_AUTO_SEED`: Auto-create/seed tables on startup (`true` in dev by default; set `false` in production)
- `ADMIN_SESSION_SECRET`: HMAC secret for admin sessions
- `ADMIN_SESSION_VERSION`: Bump to revoke existing admin sessions
- `ADMIN_EMAIL`: Admin login email
- `ADMIN_PASSWORD`: Admin login password
- `LEAD_WEBHOOK_URL`: Optional webhook endpoint for contact/collaborate/subscribe notifications
- `LEAD_WEBHOOK_TOKEN`: Optional bearer token sent to the lead webhook
- `LEAD_NOTIFY_TIMEOUT_MS`: Lead webhook timeout in milliseconds (default `2500`)

## Development
`npm run dev`

## Build & Run (Node Adapter)
1. `npm run build`
2. `npm run start`

You can also use `npm run preview` to test the production build locally.

## VPS Deployment
The production path is Docker Compose for the app/PostgreSQL/Redis, with host Nginx terminating TLS from Cloudflare and proxying to `127.0.0.1:3000`.

1. Copy and edit the production env file:
   ```bash
   cp deploy/portfolio.env.example deploy/portfolio.env
   openssl rand -hex 32
   ```
   Put the generated value in `ADMIN_SESSION_SECRET`, replace `POSTGRES_PASSWORD`, and make the password in `DATABASE_URL` match `POSTGRES_PASSWORD`.

2. Start the containers:
   ```bash
   ./up.sh
   ```
   This runs `docker compose --env-file deploy/portfolio.env up -d --build --wait`, including the one-shot `static-seed` and `migrate` services. It also checks `/healthz` and the bundled resume PDF after the stack is up.

3. In Cloudflare, create a proxied `A` or `AAAA` record for `portfolio.404connernotfound.dev` pointing to the VPS public IP. Set SSL/TLS mode to `Full (strict)`.

4. Create a Cloudflare Origin CA certificate for `portfolio.404connernotfound.dev`, then install it on the VPS:
   ```bash
   sudo ./scripts/install-cloudflare-origin-cert.sh /path/origin.pem /path/origin.key
   ```

5. Install and reload the Nginx config:
   ```bash
   sudo ./scripts/setup-cloudflare-nginx.sh
   ```
   The setup script installs Nginx on apt-based systems if needed, fetches Cloudflare IP ranges into `/etc/nginx/cloudflare-realip.conf`, renders `nginx/portfolio.conf.template`, enables the site, validates with `nginx -t`, reloads Nginx, and verifies the resume PDF directly against the local Nginx origin.

6. Verify locally and through Cloudflare:
   ```bash
   curl -fsS http://127.0.0.1:3000/healthz
   curl -fsSI http://127.0.0.1:3000/uploads/resume/resume.pdf
   curl -kfsSI --resolve portfolio.404connernotfound.dev:443:127.0.0.1 'https://portfolio.404connernotfound.dev/uploads/resume/resume.pdf?origin-check=1'
   curl -I https://portfolio.404connernotfound.dev/
   ```

   The origin check bypasses Cloudflare. If Cloudflare previously cached a `404` for the PDF, purge that URL from the Cloudflare cache or use a cache-busting query string while verifying the fix.

For a normal redeploy:
```bash
./redeploy.sh
```
`redeploy.sh` fetches `origin/<current-branch>`, fast-forwards the checkout only when GitHub has newer data, then runs `down.sh` followed by `up.sh`. It refuses to pull over local changes or a diverged branch.

To redeploy without checking GitHub:
```bash
SKIP_GITHUB_CHECK=1 ./redeploy.sh
```

To stop the stack:
```bash
./down.sh
```
Use `REMOVE_VOLUMES=1 ./down.sh` only when you intentionally want PostgreSQL, Redis, SQLite, upload, and work-asset volumes removed too.

Dry-run checks:
```bash
DRY_RUN=1 ./up.sh
DRY_RUN=1 ./down.sh
DRY_RUN=1 ./redeploy.sh
```

Useful maintenance commands:
```bash
docker compose --env-file deploy/portfolio.env ps
docker compose --env-file deploy/portfolio.env logs -f app
docker compose --env-file deploy/portfolio.env run --rm app npm run db:migrate:postgres
sudo RELOAD_NGINX=1 ./scripts/refresh-cloudflare-real-ip.sh
```

## Admin
- Login: `/admin/login`
- Credentials are read from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- CSRF protection and rate limiting are enabled for admin actions
- Resume management: `/admin/resume`

## Lead Capture
- `POST /contact` and `POST /collaborate` submissions are persisted in PostgreSQL when `DATABASE_URL` is configured (fallback: SQLite)
- `POST /subscribe` upserts subscribers in PostgreSQL when `DATABASE_URL` is configured (fallback: SQLite)
- Optional webhook notifications are sent when `LEAD_WEBHOOK_URL` is configured

## Tracking
- `/tracking/events` and `/tracking/pixel` persist tracking data in PostgreSQL when configured (fallback: SQLite)
- `/admin/tracking` reads counts/events from PostgreSQL when configured

## Caching & Rate Limiting
- Redis is used for distributed rate limiting when `REDIS_URL` is set (fallback: in-memory limiter)
- Redis is used to cache selected server responses (layout/home/about/work/blog/rss/sitemap) with short TTLs
- Admin session validation uses Redis-backed token decision caching to reduce repeated signature checks
- Tracking counts/event lists are cached in Redis and invalidated on new tracking events
- Content cache keys are invalidated on related admin writes (site settings, stack, work, posts, footer)

## Tooling
- `npm run check` — type and Svelte checks
- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:write`
- `npm run db:seed` — explicit schema/bootstrap step
- `npm run db:migrate:postgres` — backfill all SQLite tables into PostgreSQL with upserts

## Deployment Notes
- Docker Compose stack: `docker-compose.yml`
- Production env template: `deploy/portfolio.env.example`
- Start stack: `up.sh`
- Stop stack: `down.sh`
- GitHub-aware restart: `redeploy.sh`
- Rendered sample Nginx config: `nginx/portfolio.conf`
- Nginx template used by automation: `nginx/portfolio.conf.template`
- Procfile: `Procfile`
- legacy bare-node systemd unit: `deploy/portfolio.service`
- Generated artifacts (`build/`, `data/*.sqlite*`) are ignored by git; clean before deploys if needed.
