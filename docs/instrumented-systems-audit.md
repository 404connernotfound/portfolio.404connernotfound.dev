# Instrumented Systems redesign audit

## Application architecture

- SvelteKit 2 / Svelte 5 application rendered with the Node adapter.
- Tailwind 3 plus a shared `src/app.css` layer; no component framework.
- SQLite is the local/default store. PostgreSQL is supported through the data-store adapter, and Redis is an optional cache/rate-limit/session-decision layer.
- Public content is stored in `site_settings`, `stack_items`, `work_items`, `posts`, and `footer_links`.
- Shared public shell: root layout, `SiteNav`, and `SiteFooter`.
- Shared admin components: `AdminNav` and `AdminModal`.

## Route inventory

Public document routes:

- `/`, `/about`, `/work`, `/blog`, `/blog/[slug]`, `/resume`, `/contact`
- `/collaborate` and `/subscribe` (authenticated by the root hook)
- `/crisis-counter`
- `/privacy-policy`, `/cookie-policy`
- `/maintenance`, `/403`, `/404`, `/500`, and the root error boundary

Public/server resource routes:

- `/favicon.ico`, `/healthz`, `/rss.xml`, `/sitemap.xml`
- `/tracking/events` and `/tracking/pixel` (authenticated by the root hook)

Admin routes:

- `/admin` dashboard and logout
- `/admin/login`
- `/admin/site`, `/admin/about`, `/admin/contact`, `/admin/errors`
- `/admin/stack` (create, edit, reorder, delete)
- `/admin/work` (create, edit, upload/remove cover, delete)
- `/admin/blog` (create, edit, JSON/reference upload, publish/draft, delete)
- `/admin/footer` (copy and link CRUD)
- `/admin/resume` (PDF upload)
- `/admin/tracking` (read-only metrics/events)
- `/admin/crisis-counter` (create, edit, delete)

## Security and behavior boundaries

- `src/hooks.server.ts` protects all `/admin/**` routes except login, plus the collaboration, subscription, and tracking surfaces.
- Admin authentication uses a signed, one-day, HTTP-only, strict-same-site cookie. Production cookies are secure. Optional Redis entries cache only session validity decisions.
- Every admin mutation validates a rotating, HTTP-only, strict-same-site CSRF token.
- Login and public forms use the existing rate limiter.
- Contact/collaboration submissions write inbound-message records and call the existing notification integration.
- Resume metadata is read from the actual PDF; admin upload keeps the existing `static/uploads/resume/resume.pdf` integration.
- The redesign must not change these server handlers, contracts, or boundaries except to add validated project metadata fields to the existing work CRUD path.

## Content-model gap

`work_items` currently contains descriptions, highlights, role, tech, repository/media, featured state, and sort order. It has no lifecycle, owner/provenance, domain, version, subsystem, or execution-trace fields. The redesign will add nullable fields so the public UI can report metadata honestly and Trace Mode can render only when maintained content exists.

## Implementation boundary

1. Consolidate black/neutral/white/purple tokens and focus/reduced-motion behavior.
2. Add small, reusable topology, status, metadata, project-index, and trace primitives.
3. Simplify the shared shell and homepage around one claim plus direct project evidence.
4. Rebuild `/work` as an index and add `/work/[slug]` inspection pages without removing external repository links.
5. Restyle notes, article, about, resume, contact, and secondary public routes without changing form/document behavior.
6. Apply the same tokens to admin navigation, tables, forms, dialogs, and destructive controls without adding public-site animation.
7. Re-run type, lint, tests, build, route, keyboard, and reduced-motion checks.
