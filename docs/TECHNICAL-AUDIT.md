# Source-grounded technical and security audit

Reviewed 7 November 2026. Scope: the local React/Vite frontend, native Node HTTP API, persistence adapters, Shopify scaffold, tests and deployment configuration. This is a source/configuration review and local baseline verification; it is not a penetration test or a certification of an external deployment.

## Summary

The repository is a useful demo foundation. It is not yet the fully operated business described in [the production plan](PRODUCT-PLAN.md). The largest immediate mismatch is that astrology package buttons lead to a saved email-based request, while the owner has now explicitly chosen direct WhatsApp enquiries.

The build and formatting pass. All 16 tests pass when their temporary local HTTP servers are reachable. A permitted live npm audit reports zero known dependency vulnerabilities. Neither result proves the absence of application flaws or production misconfiguration.

No confirmed critical vulnerability was established in this review. The medium findings below are realistic production-hardening gaps and should not be misrepresented as demonstrated account takeover or customer-data exfiltration.

## Existing controls worth preserving

- `server/index.js:14`: explicit frontend-origin handling, with development localhost exceptions. Public endpoints remain public; CORS is not authentication.
- `server/index.js:71`: JSON content handling and bounded request size, plus service/name/email/consent validation further down the same handler.
- `server/store.js:21`: random UUID references; local prepared statements and server-only production database access.
- `server/store.js:10`: production refuses to run with no configured production persistence; database errors do not become successful booking responses.
- `supabase/schema.sql:9`: RLS enabled and browser-role grants revoked for the existing private booking table. Applied live configuration still needs verification.
- `server/commerce.js:98`: available variant validation before cart creation. Missing configuration produces a labelled preview rather than fabricated live stock.
- `src/cosmicEngine.js`: deterministic date validation and browser-side reading calculation. The frontend free-reading flow does not persist birth dates.
- Frontend scans did not find `dangerouslySetInnerHTML`, raw HTML insertion, eval-like execution, postMessage handlers, or browser token storage in the checked source paths.
- Existing tests cover validation, persistence failure/survival, Shopify adapter errors, master-number calculations and 3D picking/occlusion.

## Security findings

### SEC-01 — medium: production abuse controls are instance-local and proxy-sensitive

- **Location:** `server/index.js:12`, `server/index.js:63`.
- **Evidence:** requests are counted in an in-process Map, keyed by `req.socket.remoteAddress`; the rate-limit block follows the public GET handlers.
- **Impact:** replicas do not share limits. Behind a reverse proxy, legitimate customers may share one bucket; abusive traffic can also pressure unbounded upstream product reads. This is an availability/abuse concern, not evidence of an authorization bypass.
- **Fix:** configure exactly which proxy boundary is trusted, apply bounded route-specific protection, and use a production-appropriate shared/edge limiter where required. Do not blindly accept arbitrary forwarded IP headers.
- **Verification:** test shared-proxy traffic, disallowed forwarding headers, separate callers, replica behaviour and intentional bypasses for correctly authenticated provider webhooks.
- **Context:** current local/demo traffic has lower impact; actual production proxy behaviour was not inspected.

### SEC-02 — medium: consultation writes have no replay/deduplication contract

- **Location:** `server/index.js:132`, `server/store.js:21`.
- **Evidence:** every accepted request generates a fresh booking UUID and inserts a row, without a request identity or transactional deduplication key.
- **Impact:** retries/double submits can create duplicate consultation requests. Current code does not charge customers, so this is not a demonstrated duplicate-payment defect.
- **Fix:** because public reading enquiries are moving to WhatsApp, first remove the unnecessary web write from that journey. Any retained studio/checkout mutation needs a scoped idempotency contract and database uniqueness, not a browser-only disabled button.
- **Verification:** retry the same operation, race concurrent submissions, simulate lost responses and reject a reused operation key with a different payload.

### SEC-03 — medium: stored contact data lacks a documented retention/consent evidence path

- **Location:** `server/index.js:124`, `server/index.js:132`, `server/store.js:17`, `supabase/schema.sql:1`.
- **Evidence:** the input requires `consent === true`, but persisted fields are ID, name, email, service, status and creation time. There is no stored notice version/purpose record or implemented deletion/retention workflow.
- **Impact:** the studio cannot demonstrate or operate a complete contact-data lifecycle from this code alone. This is a privacy/operational gap; no conclusion about a particular statutory violation is made.
- **Fix:** minimize collection under the new WhatsApp flow. For records actually retained by the studio, define purpose, access, retention, consent/notice evidence where applicable, deletion and backup handling. Preserve existing records during migration.
- **Verification:** demonstrate access restrictions, a deletion request, scheduled retention handling and absence of personal details in logs and analytics.

### SEC-04 — medium, defence in depth: restrictive browser policy is not visible in tracked hosting configuration

- **Location:** `vercel.json:6`, `index.html:3`.
- **Evidence:** tracked headers include nosniff and a referrer policy; no CSP or framing restriction was found in these files.
- **Impact:** fewer browser-enforced protections would be present if the deployment serves exactly these headers. This does not establish an existing XSS injection path.
- **Fix:** inspect the actual deployed response, then design and test a content security/framing policy appropriate for the fonts, motion styles, API and checkout integration. Begin with report-only where useful. Avoid weakening script policy just to accommodate inline style attributes used by animations.
- **Verification:** inspect hosted headers, exercise all legitimate resources and validate that disallowed scripts/framing are blocked without breaking the customer flow.
- **Uncertainty:** additional CDN/hosting policies may exist outside this repository; those were not audited.

### SEC-05 — low, conditional hardening: checkout destinations are scheme-checked only

- **Location:** `server/commerce.js:111`, `src/pages/Shop.jsx:75`.
- **Evidence:** the server rejects a non-HTTPS provider checkout URL; the frontend navigates to the returned URL.
- **Impact:** a valid-looking unexpected HTTPS destination could be followed if the provider response or integration configuration were compromised. Normal visitors are not shown to control that URL, so this is not classified as a proven high-severity open redirect.
- **Fix:** bind expected checkout origins to the configured store/approved domain and validate the provider response schema. Keep legitimate Shopify custom-domain checkout support explicit.
- **Verification:** accept known store checkout destinations, reject active schemes and unexpected origins, and avoid logging cart secrets or full private checkout URLs.

## Product, correctness and performance findings

| ID       | Priority                | Evidence                                                                             | Required change                                                                                                                                                                                                                               |
| -------- | ----------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PROD-01  | High                    | `src/pages/Home.jsx:163`, `src/pages/Booking.jsx:25`                                 | Package buttons currently open an email-based request form. Replace the main paid-reading path with direct WhatsApp and an ordinary telephone fallback.                                                                                       |
| PROD-02  | High                    | `server/catalog.js:1`; tarot is separately authored in Home                          | Add a first-class tarot entry/practitioner and approved catalogue fields. Do not invent its price, session duration or deliverables.                                                                                                          |
| PROD-03  | High for full ecommerce | `server/commerce.js:73`, `server/commerce.js:106`                                    | Current shop fetches only the first 24 products/first variant and creates a one-item cart. Add variant selection, pagination, multi-item cart operations and verified order handling.                                                         |
| PROD-04  | High for operations     | `server/index.js` public route set; no private studio feature exists                 | Build invited owner administration and its authorization tests. Absence of an admin feature is not itself an auth vulnerability.                                                                                                              |
| DATA-01  | Medium                  | `server/index.js:77` uses `raw += chunk`                                             | Decoding each Buffer separately can corrupt Hindi characters split across UTF-8 chunk boundaries. Collect bounded bytes and decode once, or use a correct streaming decoder/framework parser. Add a split-character test.                     |
| PERF-01  | Medium                  | Build: approximately 128.4 kB gzip app JS + separate 139.9 kB gzip 3D JS             | Separate loading is present, but the 3D feature is requested when the opening mounts. Prioritize useful HTML/contact content, then load decoration conditionally and provide a still fallback. Measure rather than assume mobile performance. |
| PERF-02  | Medium                  | `server/index.js:23`, `server/index.js:42`                                           | All responses are no-store; each configured product request can query Shopify again. Add bounded public catalogue caching and invalidation without caching private data.                                                                      |
| SEO-01   | Medium                  | `index.html:46` root-only body, `src/components/PageMeta.jsx`; public file inventory | Public content and route metadata depend on client rendering. Supply prerendered content, genuine social preview media, sitemap and robots configuration. `/og-image.png` is configured but absent from public files.                         |
| COPY-01  | Medium                  | `src/constants.js:12`, index.html metadata                                           | Default descriptions make stronger prediction/confidentiality claims than the current careful information copy. Align advertising metadata with verified business claims.                                                                     |
| DATA-02  | Medium                  | `server/store.js:17` versus `supabase/schema.sql:1`                                  | Local SQLite tests do not prove production PostgreSQL constraints, migrations or RLS behaviour. Introduce production-like database integration tests and preserve existing data.                                                              |
| OPS-01   | Medium                  | `server/index.js:40`                                                                 | Health currently proves only that the handler responds. Define liveness/readiness/provider status separately and avoid using health success as proof that writes or fulfilment work.                                                          |
| MAINT-01 | Medium                  | index.css, journey.css, opening.css, refinements.css and unused legacy UI modules    | Consolidate tokens and component ownership incrementally after route/visual coverage; avoid another appearance-changing rewrite.                                                                                                              |

DATA-01 was reproduced with synthetic Devanagari text split within a UTF-8 character: concatenating the independently decoded chunks did not preserve the original name. No customer data or production database was used for that check.

## UI review focus

The following are follow-up checks, not claims that the recently reviewed UI is broken:

- `src/components/SideNav.jsx`: preserve keyboard/touch alternatives, and ensure new primary contact routes never depend on discovering a hover-only rail.
- `src/components/ScrollHeader.jsx`: keep always-visible, ordinary-language contact actions through navigation and narrow breakpoints.
- `src/components/ReadingOverlay.jsx`: retain the date-only privacy explanation; review mobile autofocus and keyboard behaviour when that component is touched.
- `src/components/celestial/createScene.js`: preserve real surface picking and cleanup; add progressive/low-cost rendering choices without reversing the user's no-pause-button preference.
- `src/components/AnimatedTitle.jsx`: do not reuse English per-character animation for Devanagari conjuncts.
- `src/components/RoyalMotion.jsx`: preserve native pointer behaviour, reduced motion, hidden-tab cleanup and bounded scroll/pointer work.
- `index.html` and `src/index.css`: deduplicate font declarations and verify licensed local font subsets when adding Hindi typography.

## Required release evidence

1. Contract/schema tests for invalid types, Unicode, limits and unknown fields.
2. Real PostgreSQL migration, transaction, RLS and role tests.
3. Invited owner and outsider authorization tests, including direct API requests.
4. Cart/stock/price integrity and verified webhook replay/concurrency/recovery tests.
5. Header, keyboard, mobile, zoom and reduced-motion browser journeys.
6. Representative-device performance and measured bundle budgets.
7. Provider sandbox flow and actual staged integration evidence, followed by controlled live verification.
8. Backup restore, incident ownership, retention/deletion and rollback runbooks.

No live provider, deployed header, physical-phone, load or penetration test is asserted by this report. The owner has already authorized normal implementation and security fixes; the backlog is the execution order, not a fresh permission gate.

## M1 resolution update — 7 November 2026

The findings above record the audited baseline; their original line references are historical. After implementing the WhatsApp-first journey:

- **PROD-01 / PROD-02:** implemented. Package actions are direct studio WhatsApp links with a phone fallback; tarot is in the shared catalogue with an unconfirmed price. The public form is removed.
- **SEC-02:** the affected public consultation write is retired (410), so repeat clicks do not create duplicate site records. This does not resolve idempotency requirements for future private operations, carts or webhook processing.
- **DATA-01:** fixed. The active checkout parser limits bytes and strictly decodes complete UTF-8 input; tests exercise every split position in a Hindi/emoji JSON payload and reject invalid encoding/oversized input.
- **COPY-01:** stronger default metadata claims were removed and FAQ/privacy copy now accurately describes the external contact handoff and local free engine.
- **SEC-03:** collection is minimized, but retention/deletion obligations for existing records remain open. The archive and private table were preserved; the active public server no longer instantiates the adapter.
- **PERF-01:** duplicate Google Fonts loading was removed; the separate WebGL bundle and physical-device measurement work remain open. A licensed local Devanagari subset was added.

Current local verification: 24 passing tests, build and formatting, 320px/375px contact layouts, keyboard selection/focus, copy-number feedback, legacy redirects, preview shop and API-outage resilience. No physical-device or live-provider evidence is asserted. See [the milestone evidence](M1-WHATSAPP-HANDOFF.md) for scope and archive migration notes. Remaining audit findings stay open.

## M2 boundary update — 7 November 2026

E01–E03 now supply a strict catalogue slice and modular Fastify boundary. Seven new tests bring the suite to 31 passing checks. Generated public contracts, validated settings, server-generated request IDs, redacted/bounded logging and explicit request limits are present. See [M2 evidence](M2-FOUNDATION.md) and [ADR 001](adr/001-typed-api-boundary.md).

SEC-01 remains open for deployment/proxy/distributed enforcement: the local limiter is now bounded and tested against spoofed forwarding headers, but replicas still do not share limits and proxy trust is intentionally disabled. DATA-02 and the private operations findings remain open; no PostgreSQL migration or live-role test is claimed. SEC-05 remains open until the commerce destination policy/provider contracts are completed. Runtime/source review and zero known npm advisories do not establish production security.

## PostgreSQL evidence update — 7 November 2026

DATA-02 now has production-like local evidence: 12 tests run against native PostgreSQL 17.11, exercising actual constraints, roles/RLS, migration history/rollback, transactions, audit records, pool-context reset and concurrent source-preserving imports. The API rejects privileged runtime credentials and reads published content through a restricted role. Real archived data was not inspected/imported. Remote CI and hosted Supabase configuration remain unverified; this is not proof of the managed Auth service or deployment.

No private consultation route has been exposed. The local Auth functions are an explicit test/development fixture, not JWT verification. AAL2/allowlist database policies must be paired with verified server identity in M3. Existing retention/deletion, proxy/distributed limiter, browser policy, commerce and operational findings remain open.
