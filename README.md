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
- `PLAYGROUND_ENABLED`: Enable/disable the playground runtime
- `PLAYGROUND_REQUIRE_ADMIN`: Require admin auth for playground session APIs (recommended `true`)
- `PLAYGROUND_ENFORCE_SAME_ORIGIN`: Reject cross-origin playground API requests
- `PLAYGROUND_RUNTIME_MODE`: `docker` (default) or `mock`
- `PLAYGROUND_DOCKER_BINARY`: Docker CLI binary path (default `docker`)
- `PLAYGROUND_WS_HOST`: Bind host for playground websocket server
- `PLAYGROUND_WS_PORT`: Bind port for playground websocket server
- `PLAYGROUND_WS_PATH`: Websocket path (default `/playground/ws`)
- `PLAYGROUND_WS_PUBLIC_URL`: Optional externally reachable ws/wss endpoint override
- `PLAYGROUND_CREATE_RATE_LIMIT_PER_MINUTE`: Max session create calls per IP each minute
- `PLAYGROUND_COMMAND_TIMEOUT_MS`: Timeout for docker runtime commands
- `PLAYGROUND_MAX_OUTPUT_BYTES`: Cap command output bytes stored/sent per execution
- `PLAYGROUND_MAX_COMMANDS_PER_SESSION`: Hard cap on commands executed in one session
- `PLAYGROUND_COMMAND_RATE_WINDOW_MS`: Command burst-control window duration
- `PLAYGROUND_MAX_COMMANDS_PER_WINDOW`: Command burst-control max inside each window

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
   ./scripts/deploy-vps.sh
   ```
   This runs `docker compose --env-file deploy/portfolio.env up -d --build --wait`, including a one-shot `migrate` service that seeds PostgreSQL before the app starts.
   It also runs a one-shot `static-seed` service that copies bundled static uploads, including `static/uploads/resume/resume.pdf`, into the Docker volumes Nginx serves from. Existing uploaded files are not overwritten.

3. In Cloudflare, create a proxied `A` or `AAAA` record for `portfolio.404connernotfound.dev` pointing to the VPS public IP. Set SSL/TLS mode to `Full (strict)`.

4. Create a Cloudflare Origin CA certificate for `portfolio.404connernotfound.dev`, then install it on the VPS:
   ```bash
   sudo ./scripts/install-cloudflare-origin-cert.sh /path/origin.pem /path/origin.key
   ```

5. Install and reload the Nginx config:
   ```bash
   sudo ./scripts/setup-cloudflare-nginx.sh
   ```
   The setup script installs Nginx on apt-based systems if needed, fetches Cloudflare IP ranges into `/etc/nginx/cloudflare-realip.conf`, renders `nginx/portfolio.conf.template`, enables the site, validates with `nginx -t`, and reloads Nginx.

6. Verify locally and through Cloudflare:
   ```bash
   curl -fsS http://127.0.0.1:3000/healthz
   curl -fsSI http://127.0.0.1:3000/uploads/resume/resume.pdf
   curl -I https://portfolio.404connernotfound.dev/
   ```

7. Optional: install the GitHub auto-updater on the VPS:
   ```bash
   sudo SERVICE_USER=portfolio SERVICE_GROUP=portfolio ./scripts/install-auto-update.sh
   ```
   The installer writes a systemd service and timer. Every 30 minutes it fetches `origin/main`, fast-forwards only when the checkout is clean, runs `docker compose down --remove-orphans`, and starts the rebuilt stack with `scripts/deploy-vps.sh`.

Before DNS is live, you can still test the stack on the VPS:
```bash
DRY_RUN=1 ./scripts/deploy-vps.sh
DRY_RUN=1 ./scripts/setup-cloudflare-nginx.sh > /tmp/portfolio.nginx.conf
./scripts/deploy-vps.sh
curl -fsS http://127.0.0.1:3000/healthz
curl -H 'Host: portfolio.404connernotfound.dev' -I http://127.0.0.1/
```

For a disposable no-DNS smoke test that cleans up the Docker stack when it exits:
```bash
./scripts/smoke-vps-no-dns.sh
```
Use `CLEANUP_ON_EXIT=0 ./scripts/smoke-vps-no-dns.sh` when you want to leave the stack running after the smoke test.

Useful maintenance commands:
```bash
docker compose --env-file deploy/portfolio.env ps
docker compose --env-file deploy/portfolio.env logs -f app
docker compose --env-file deploy/portfolio.env run --rm app npm run db:migrate:postgres
DRY_RUN=1 ./scripts/auto-update-vps.sh
sudo systemctl start portfolio-auto-update.service
sudo systemctl status portfolio-auto-update.timer
sudo journalctl -u portfolio-auto-update.service -n 100 --no-pager
./scripts/cleanup-vps.sh
REMOVE_VOLUMES=1 ./scripts/cleanup-vps.sh
DRY_RUN=1 ./scripts/clean-slate-vps.sh
sudo ./scripts/clean-slate-vps.sh
sudo RELOAD_NGINX=1 ./scripts/refresh-cloudflare-real-ip.sh
```

Use `scripts/clean-slate-vps.sh` when the VPS should look like the portfolio service was never started. It does not require `deploy/portfolio.env`; if the env file is missing, it uses the example env or a temporary cleanup env. By default it removes the Docker Compose project containers, networks, volumes, local app image, generated `deploy/portfolio.env`, the auto-update systemd units, the legacy `portfolio.service`, and the Nginx site config. TLS cert removal is opt-in with `REMOVE_TLS=1`.

## Admin
- Login: `/admin/login`
- Credentials are read from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- CSRF protection and rate limiting are enabled for admin actions
- Resume management: `/admin/resume`
- Playground operations: `/admin/playground`

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
- Playground status snapshots (counts/sessions/logs/playsets) are cached in Redis and invalidated on lifecycle changes
- Tracking counts/event lists are cached in Redis and invalidated on new tracking events
- Content cache keys are invalidated on related admin writes (site settings, stack, work, posts, footer, playsets)

## Playground
- User page: `/playground`
- Session API: `POST /api/playground/session`, `DELETE /api/playground/session`
- Websocket runtime events: configurable endpoint (defaults to `ws://<host>:24680/playground/ws`)

## Tooling
- `npm run check` — type and Svelte checks
- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:write`
- `npm run db:seed` — explicit schema/bootstrap step
- `npm run db:migrate:postgres` — backfill all SQLite tables into PostgreSQL with upserts

## Deployment Notes
- Docker Compose stack: `docker-compose.yml`
- Production env template: `deploy/portfolio.env.example`
- Clean-slate VPS cleanup: `scripts/clean-slate-vps.sh`
- Auto-update timer installer: `scripts/install-auto-update.sh`
- Auto-update worker: `scripts/auto-update-vps.sh`
- Rendered sample Nginx config: `nginx/portfolio.conf`
- Nginx template used by automation: `nginx/portfolio.conf.template`
- Procfile: `Procfile`
- legacy bare-node systemd unit: `deploy/portfolio.service`
- Generated artifacts (`build/`, `data/*.sqlite*`) are ignored by git; clean before deploys if needed.
