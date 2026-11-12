# M2 foundation progress

Implemented locally 7 November 2026. M2 is not complete: the PostgreSQL path, migrations, database-role tests and code-scanning integration remain open.

## Delivered slice

- `server/app.ts`, `server/config.ts`, `server/start.ts` and `server/routes/` replace the native routing scaffold with a modular Fastify boundary, exact configuration checks, controlled errors and bounded lifecycle handling.
- `shared/contracts.ts` defines the first strict reading contract. `shared/catalog.ts`, the reading route and `src/lib/catalogue.ts` use its inferred types. The rest of the UI and Shopify adapter remain JavaScript.
- `shared/generated/reading-catalogue.js` is generated ahead of time from that contract. The browser does not import the schema builder/compiler. Regeneration drift is checked explicitly.
- `GET /api/openapi.json` exposes generated public API documentation. Checkout fields reject coercion and extra properties; unknown public routes return controlled 404 responses.
- Errors carry a server-generated UUID and stable code. Request logging excludes raw URLs, query strings, customer bodies, headers and provider exception messages. Untrusted incoming request IDs and forwarded addresses are ignored.
- The local product/checkout limiter has bounded entries. Production edge/shared enforcement remains pending; replicas do not share counters.
- The existing stream/UTF-8 tests, retired public data routes, direct contact flow and archived synthetic-record survival check remain intact.
- CI now has read-only repository permissions, pinned official action revisions, disabled checkout credential persistence, lockfile installs and contract/type/format/test/build/audit checks. Dependabot configuration covers npm and GitHub Actions. These workflows have not been pushed or run remotely.

## Evidence

31 tests pass, including seven new checks for environment validation, schema boundaries/Unicode, OpenAPI/request identity, extra-field/coercion rejection, early retirement of personal-data endpoints, synthetic secret exclusion from logs and spoof-resistant local limiting. Actual HTTP tests remain in the suite alongside Fastify injection. A limiter response defect found by the new tests was fixed before sign-off.

Contract regeneration check, strict type checking, repository formatting and production frontend build pass. A live npm audit reports zero known vulnerabilities in the installed dependency tree. Build output is approximately 132.01 KB gzip for the app, 139.87 KB for the separate 3D chunk and 19.29 KB CSS. These are bundle sizes, not Core Web Vitals. The existing Vite 3D-size advisory remains visible.

The migrated live local process responds to health/services requests and emits request IDs; the frontend remains available on port 5175. Browser smoke checks confirmed the reading catalogue, selected tarot message and mobile contact layout after migration. No real message, order, private customer record, provider account or external deployment was used.

See [ADR 001](adr/001-typed-api-boundary.md) for the framework decision, official documentation and remaining boundaries. Next is E04–E06: PostgreSQL development parity, versioned schema and real role/transaction tests while preserving existing archives.

## PostgreSQL implementation update — 7 November 2026

The earlier progress entry is historical. E04–E05 now add native PostgreSQL 17.11, versioned/checksummed migrations, private studio/public catalogue schemas, explicit grants/RLS, integer minor-unit amounts, transactional audit triggers and a restricted pooled API connection. Both SQLite and private PostgreSQL legacy imports are preview-first, deduplicated and source-preserving. No real archive was imported.

12 database tests pass alongside 31 application tests (43 total). A real local API request through Vite returned four database-backed readings, with one active restricted PostgreSQL runtime connection. Browser outage verification at 320px retained contact and package content, replaced unavailable live prices with “Ask for price”, and recovered the database-backed prices after the API restarted. The 375px recovered view has no horizontal overflow.

CI has a digest-pinned PostgreSQL service and pinned CodeQL workflow. Their remote execution is still pending. The plain local Auth bootstrap is only a database interface fixture; managed Auth/JWT/invitation/MFA service verification is M3. See [database guide](DATABASE.md) and [ADR 002](adr/002-postgres-studio-data.md). Production remains distinct from local development.
