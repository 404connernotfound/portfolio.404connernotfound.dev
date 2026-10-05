# Security and data integrity operations

The root `portfolio.env` is an intentional non-production honeypot/decoy. Docker
Compose production deployment does not use it; production configuration lives in
`deploy/portfolio.env`. Automated cleanup agents must preserve it and must not
treat it as accidental credential leakage or adopt it as application configuration.

## Sessions

Admin cookies now require a matching active Redis record. Redis is required for
admin login, authentication and logout; an outage never restores stateless cookie
authentication. Existing stateless cookies require a new login. The 24-hour cookie
lifetime and HttpOnly, SameSite=Strict and production Secure flags remain in place.
Issuance allows a maximum 60-second future clock skew during verification.

`revokeAllAdminSessions()` in `src/lib/server/auth.ts` replaces the Redis session
generation, invalidating every previous session. Changing `ADMIN_SESSION_VERSION`
also invalidates earlier sessions when all application instances use the new value.
Current logout deletes the Redis session before deleting the cookie. Failed Redis
revocation is reported and retains the cookie so logout can be retried. Audit
storage failures are reported but cannot prevent logout from revoking the session.

## Persistence and migration

See [ordered migration strategy](../src/lib/server/migrations/README.md). A configured
PostgreSQL failure propagates rather than silently writing SQLite. SQLite remains
supported when PostgreSQL is not configured. Back up both stores before a production
transfer. `npm run db:migrate:postgres` preflights all supported fields and rejects
schema mismatches; it upserts source IDs into the explicitly configured target.
Use the target deliberately: this administrative command is not a test command.

Playground tables, types and persistence operations remain intentionally dormant.
Future schema changes must use a new immutable ordered PostgreSQL migration and
maintain the SQLite transfer specification and parity tests.

## Telemetry and uploads

Public ingestion accepts a small closed visitor-event schema. It never accepts
admin actor/source claims, arbitrary payloads, admin paths, query strings, or
unbounded text. Visitor IP addresses only key the short-lived rate limiter; they
are not persisted. Browser Do Not Track disables visitor recording. Administrative
mutations generate server audit records with a session hash and no credentials or
submitted content. Historical events are visitor/legacy, never trusted admin audit.

PDF uploads require extension, MIME, signature, end marker and an 8 MiB limit;
these checks do not constitute a complete PDF parser or malware scan. Raster image
uploads are decoded with pixel/byte limits and re-encoded as WebP with random server
filenames. SVG is rejected. Multipart MIME must match the decoded format; filenames
do not choose the format. Animated inputs currently use their first frame.

Use `npm start` or the supplied Docker/systemd/Procfile entry points. The small
`scripts/start-server.mjs` wrapper keeps the Node adapter lifecycle and applies
`nosniff` before its static-file handler, which runs before SvelteKit hooks. Nginx
static upload locations also set `nosniff` explicitly because their `add_header`
directives override server-level header inheritance. Resume files use
`application/pdf`.

## Proxy trust chain and live verification

Client → Cloudflare → host Nginx → overwritten `X-Real-IP` → adapter-node
`ADDRESS_HEADER=X-Real-IP` → SvelteKit `event.getClientAddress()`.

`scripts/refresh-cloudflare-real-ip.sh` fetches the official IPv4/IPv6 CIDRs and emits
`set_real_ip_from` entries. `real_ip_header CF-Connecting-IP` trusts that header only
from those peers; `real_ip_recursive on` remains unchanged. Nginx assigns both
`X-Real-IP` and `X-Forwarded-For` from its resolved `$remote_addr`, overwriting inbound
claims. `XFF_DEPTH` is unused with `X-Real-IP`; leave it empty. Do not switch to an
arbitrary client header, wildcard trusted CIDR or append untrusted XFF values.
Compose exposes the app only on loopback. Other deployments must restrict access
to the app socket to the trusted proxy before enabling `ADDRESS_HEADER`.

Repository tests verify these configuration invariants, not the live Cloudflare
account, firewall, rendered Nginx includes or real client address. On the host:

1. Inspect `sudo nginx -T`: confirm the generated include contains only current
   Cloudflare ranges, the expected real-IP settings and overwritten proxy headers.
   Run `sudo nginx -t` before reload. Confirm the app listener is loopback-only.
2. Request through Cloudflare from a known client, then repeat with forged
   `CF-Connecting-IP`, `X-Real-IP` and `X-Forwarded-For` headers. Correlate Nginx's
   resolved `$remote_addr` and the application rate-limit key for that client;
   neither may become the forged address. Use existing server-side logs/key
   inspection rather than introducing a public IP diagnostic endpoint.
3. Request the origin from a non-Cloudflare peer with those forged headers. If the
   firewall allows the request, Nginx must use the socket peer. Direct access to the
   Node app must be blocked externally. Verify trusted proxy settings on every
   ingress, including IPv6; local origin checks do not prove firewall restrictions.
4. Enable maintenance mode and request `/healthz` directly and through Nginx:
   expect the health JSON and its dependency status, without a redirect. Check
   `/uploads/resume/resume.pdf` through Node and Nginx for `application/pdf` and
   `X-Content-Type-Options: nosniff`.

No claim of production spoofing prevention is made until these live checks pass.

## Verification

`npm test` discovers every `tests/*.test.ts` file. The checkout did not contain the
attachment's mentioned math test file; `tests/math.test.ts` now covers mathematical
notation and escaping in the existing custom Markdown renderer without adding a
new math engine. Existing content/booking/review tests remain included.

CI provisions PostgreSQL and Redis and sets `TEST_DATABASE_URL` and
`TEST_REDIS_URL`. Integration tests use temporary schemas/files and unique Redis
namespaces. Missing integration connections fail CI; local tests explicitly report
integration skips. Run `npm run check`, `npm run lint`, `npm test`, and
`npm run build`, then validate `docker compose config` with an explicitly selected
deployment environment. Do not use production stores as test stores.

The dependency audit currently reports 30 advisories (24 high, 4 moderate, 2 low)
in the retained dependency tree. This remediation does not establish exploitability
or resolve those advisories; targeted dependency security updates require a separate
review. No existing dependency versions were deliberately upgraded in this pass.

Broad persistence refactoring, schema downs/ORM adoption, CSS/admin redesign,
dependency upgrades, Playground revival and Markdown replacement remain deferred.
