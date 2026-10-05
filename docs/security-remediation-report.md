# Remediation verification report

## Security fixes

- SEC-001: Random signed session IDs require authoritative Redis records. Logout
  revokes the record before clearing the cookie; copied cookies cannot replay.
  Current/global revocation and configured session-version invalidation are supported.
- SEC-002: Verification enforces the preserved 24-hour lifetime and maximum
  60-second future skew, plus matching server-side timestamps/version/generation.
- SEC-003/SEC-004: The supplied brief lists these report identifiers without
  defining their findings. The upload defects were remediated: PDF extension,
  MIME, exact signature/end marker and size; raster decode/re-encode, pixel/byte
  limits, random output filenames, SVG rejection, safe deletion paths and nosniff.
  No unsupported finding-to-ID assignment is assumed.
- SEC-005 preparation: Proxy configuration invariants and live verification steps
  are documented. IP forwarding behavior remains unchanged; production Cloudflare
  and firewall verification is still required.
- Route policy uses the matched route, covering encoded URLs and SvelteKit data
  requests. Maintenance does not redirect health checks. Admin mutations retain
  authentication and CSRF checks.
- Visitor ingestion is bounded, rate limited and unprivileged. Server operations
  generate admin audit events, including publication, moderation, appointments,
  settings and uploads. Legacy events are never elevated to authoritative audit.
- Adversarial review found encoded-path authentication bypasses, telemetry failure
  preventing logout, and high-bit PDF signature masking. Each was reproduced,
  corrected and covered by a regression. Failed Redis logout retains a retryable
  cookie; audit failure cannot prevent revocation. Image replacement retains the
  old asset until the content update and its audit succeed.

## Migration fixes

The transfer now includes work `lifecycle`, `owner`, `domain`, `version`,
`subsystems`, and `trace`, plus the previously missing `crisis_items` table.
All 16 supported tables, including dormant Playground, are checked for complete
column coverage. Missing/unknown source tables or fields fail rather than losing data.

Ten nullable ordering/flag differences were found: stack sort, work featured/sort,
post draft/featured, asset public, testimonial approved, crisis sort, footer
external/sort. `003_sqlite_nullability` preserves existing NULL values and defaults;
domain types and affected display/moderation consumers reflect those values.

The ordered framework contains `001_baseline`, `002_tracking_actors`, and
`003_sqlite_nullability`. The baseline applies compatible historical additions and
backfills to existing tables before recording success. An advisory transaction lock,
ordered applied-prefix check and SQL checksums enforce deterministic immutable
history. Failure rolls back schema/history and stops initialization. Configured
PostgreSQL errors no longer silently write SQLite.

## Tests and executed gates

| New suite | Proven invariant |
| --- | --- |
| `session.test.ts` | Active, tampered, unknown, revoked, expired, future/skew, version/global revocation and authority failures |
| `session-redis.test.ts` | Actual Redis state/TTL, cookie flags, logout replay, independent sessions, global/version revocation, CSRF, login, Redis ACL outages/retry and audit-failure logout |
| `database-migration.test.ts` | Temporary SQLite to real PostgreSQL: all rows/fields/nullability, 0/NULL/1 flags, timestamps, references/metadata, reviews, appointments, Playground references, legacy telemetry, sequences, existing-data preservation, immutable history, concurrency, idempotency and rollback |
| `database-failure.test.ts` | Configured PostgreSQL startup/read/write/telemetry failures propagate; no SQLite fallback file opens |
| `route-security.test.ts` | Health during maintenance/storage failure, explicit route classes, encoded/data routes, malformed paths, authentication failure and status policy |
| `telemetry.test.ts` | Closed visitor schema, privileged injection rejection, origin/content/stream-size/rate limits, DNT and privacy |
| `admin-audit.test.ts` | Actual administrative actions and public ingestion use correct trust markers; auth/CSRF/mutation failures suppress success audit; publication transitions, upload validation and old-image preservation |
| `client-telemetry.test.ts` | Actual client dispatch, categorical form outcomes, query stripping, encoded admin exclusions, DNT and SSR behavior |
| `uploads.test.ts` | Extension/MIME/content/size failures, high-bit PDF forgery, corrupt images/HTML/SVG, all supported raster formats, misleading filenames and path boundaries |
| `math.test.ts` | Mathematical text/code and HTML escaping in the retained custom Markdown renderer |
| `proxy-policy.test.ts` | Overwritten forwarding headers, Cloudflare CIDR sources, loopback binding and explicit static-upload nosniff |
| `production-smoke.integration.ts` | Actual built HTTP app: login/flags/CSRF/logout replay, encoded/data access, public/admin persistence, maintenance health, PDF headers and incompatible-history startup failure |

The mentioned pre-existing `math.test.ts` was absent from this checkout; the new
suite tests the existing renderer's text/code contract without adding a math engine.
Existing content and booking/review suites also run under the wildcard test command.

Executed successfully using repository-pinned Node 24.13.0:

- `npm ci`
- `npm run check`: zero errors/warnings
- `npm run lint`: zero warnings
- `npm test`: 19 reported tests passed, zero failures/skips; real PostgreSQL 16
  and Redis 7 integration enabled
- `npm run build`
- `npm run test:production`: one production integration passed
- `docker compose --env-file deploy/portfolio.env.example config --quiet`
- Final Docker image build and isolated app/PostgreSQL/Redis health verification:
  health 200, public maintenance redirect 307
- Rendered Nginx 1.28 configuration check and HTTPS PDF response:
  `application/pdf`, `X-Content-Type-Options: nosniff`; maintenance health JSON

CI provisions PostgreSQL/Redis, requires integration connections, and runs the
production HTTP verification after building. Test stores use temporary namespaces,
schemas and files. Tests assert mocked transport identity and absence of accidental
fallback database creation. The root honeypot and existing static assets are unchanged.

## Files changed

- Sessions: `auth.ts`, new `authSessions.ts`, admin login/logout actions.
- Persistence: `db.ts`, `dataStore.ts`, `postgres.ts`, `telemetryStore.ts`, SQLite
  transfer CLI; new `server/migrations/` baseline, actor/nullability migrations,
  runner, transfer specifications and strategy documentation.
- Routes/telemetry: hooks, new route policy/security modules, new `lib/telemetry/`
  and `server/telemetry/`; tracking endpoints; root layout, public form dispatch,
  administrative action audit calls and tracking dashboard trust labels.
- Uploads: new `server/uploads.ts`, admin work/resume actions, Nginx headers,
  new `scripts/start-server.mjs` and Docker/systemd/Procfile/package start commands.
- Nullable consumers: `SiteFooter.svelte`, review moderation conversion, admin
  review filters and dashboard pending count.
- Verification: the twelve suites above, telemetry transport fixture, portable
  temporary paths in existing tests, package/lock files, CI services/gates and
  `.run` exclusions. Sharp is the new direct dependency; npm also refreshed the
  existing transitive semver package during installation.
- Documentation: README, operational security notes and this report. Root
  `portfolio.env`, Playground support, renderer implementation and public branding
  remain intact.

## Remaining risks

- Confirmed unresolved inventory: npm audit reports 30 dependency advisories
  (24 high, 4 moderate, 2 low) in the retained dependency tree. Exploitability in
  this deployment was not established; this pass did not run a dependency upgrade.
- Live hypothesis requiring verification: deployed Cloudflare CIDRs, Nginx
  includes, IPv6/firewall ingress and actual forwarded client identity. Local
  Nginx/header tests do not prove the production trust chain.
- Known bounds: PDF checks are not a complete structural parser/malware scan;
  uploaded animated images use the first frame. Redis availability is necessary
  for admin authentication. Administrative mutations and audit persistence are
  separate writes; audit errors propagate and may follow a committed mutation.

## Deferred cleanup

Broad persistence/ORM refactoring, down migrations, atomic business/audit storage
transactions, full PDF parsing/scanning, framework/dependency upgrades, CSS/admin
redesign, new portfolio features and Playground revival remain outside this pass.
The custom Markdown renderer and SQLite support are retained.
