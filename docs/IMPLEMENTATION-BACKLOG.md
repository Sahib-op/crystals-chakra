# Implementation backlog

Updated 7 November 2026. Product authority: [PRODUCT-PLAN.md](PRODUCT-PLAN.md).

## Status

- [x] M0: inspect the current frontend, HTTP API, persistence, Shopify scaffold, tests and deployment files.
- [x] M0: confirm WhatsApp-first readings and English with styled Hindi titles.
- [x] M0: verify the baseline build, formatting, 16 tests and dependency audit.
- [x] M0: review and install pinned official engineering skills.
- [x] M0: write the plan, source-grounded audit and ordered implementation backlog.

## M1: align the website with the actual business

- [x] R01: centralize reading/contact destinations and message construction; permit only configured international telephone numbers and bounded text. Encode messages once. Test special characters, Hindi and absent package data.
- [x] R02: make every paid-reading action open WhatsApp directly. Replace the public email-first booking form with a contact hub and telephone/copy-number fallback. Preserve useful legacy anchors.
- [x] R03: update copy, FAQs and privacy disclosures to describe conversation handoff accurately. Do not claim a saved enquiry, sent message, confirmed slot or payment on a click. Retire unused public consultation/DOB endpoints only after defining the migration and retention path; preserve existing stored records.
- [x] R04: make tarot a first-class catalogue entry with its practitioner and enquiry-only price until confirmed; keep current astrology packages without inventing new offers.
- [x] R05: restore paid-reading priority in the opening while keeping the free engine conspicuous. Keep the logo, compact header, rail and existing royal palette.
- [x] R06: add owner-reviewable Hindi title fields and a Devanagari-safe typographic treatment; keep English actions readable and no per-character Hindi animation.
- [x] R07: browser-check all contact routes, keyboard/touch use, narrow screens and external handoff targets without sending real messages.

Done: a visitor can identify a reading and reach the correct studio conversation without submitting a form or authenticating. Contact remains usable when the catalogue API or 3D scene fails.

## M2: establish maintainable backend boundaries

- [x] E01: record the framework/rendering decisions and migrate one feature slice at a time to strict TypeScript.
- [x] E02: establish shared runtime schemas, documented API contracts and predictable error codes. Keep private/internal errors out of responses.
- [x] E03: introduce the modular Fastify boundary, validated environment settings, request IDs, redacted logs and graceful shutdown.
- [x] E04: introduce local PostgreSQL/Supabase development parity and migrations. Preserve any existing consultation records; do not silently discard the SQLite database.
- [x] E05: add public catalogue and private operations schemas, foreign keys, status constraints, exact money types and query-driven indexes.
- [x] E06: migrations, validation, repository transactions and RLS/grants run against native PostgreSQL locally and in the pinned CI service; remote Verify runs pass on `main` (checked 12 November 2026).
- [x] E07: minimum CI permissions, pinned actions, reproducible installs, contract/type/test/build checks, npm audit and CodeQL pass remotely. Branch protection remains a repository-owner setting.

Done: one catalogue feature has end-to-end typed contracts and a tested production-like data path. Tests do not validate only a fake SQLite substitute for PostgreSQL behaviour.

## M3: make the backend useful to the studio

- [ ] A01: use managed invited authentication and MFA; enforce owner authorization server-side and in database/storage policy boundaries.
- [ ] A02: implement package and practitioner drafts, preview, publishing and change history.
- [ ] A03: implement promotions with explicit validity dates, real prices and safe structured content.
- [ ] A04: implement manually created consultation records from actual WhatsApp/phone conversations, minimal customer data and separate consultation/payment state.
- [ ] A05: implement search, filtering and pagination in the private dashboard; prevent customer detail exposure in public caches or logs.
- [ ] A06: implement retention/deletion workflows and recorded consent/purpose where the site/studio stores information.
- [ ] A07: test public, signed-in outsider, staff if introduced, and approved owner access. UUID knowledge must not authorize record access.

Done: the owner can run a real daily workflow; public visitors cannot list customer records or publish content.

## M4: finish the secondary shop

- [ ] C01: paginate real Shopify products, expose variants and validate provider responses and external destinations.
- [ ] C02: implement cart creation, multiple items, quantity update, removal and expiry recovery using provider cart identities safely.
- [ ] C03: implement hosted checkout with authoritative prices, stock, shipping and payment methods configured in the merchant account.
- [x] C04: verified Shopify webhook intake (raw-body HMAC, shop check), delivery-ID deduplication, out-of-order-safe PII-free order projection under a dedicated least-privilege role. Periodic reconciliation against the Admin API remains for when a store exists.
- [ ] C05: display approved fulfilment/return information and useful payment/cancellation outcomes; never infer paid status from a URL.
- [ ] C06: test out-of-stock variants, altered prices/quantities, stale carts, upstream errors, duplicate/out-of-order events, completed and cancelled sandbox purchases.

Done: a sandbox order can move from multi-item cart through provider checkout to verified owner-visible state, with recoverable failure paths. Live activation requires real merchant setup.

## M5–M6: reliability, advertising and release

- [x] P01: `/`, `/shop` and `/policies` are prerendered with page metadata and contact links; Open Graph image, sitemap and robots.txt added.
- [x] P02: self-hosted fonts, WebGL only on capable desktops after load, animated still fallback, reserved layout. Mobile lab performance 49 → 92–94. Physical-device measurement remains.
- [ ] P03: consolidate design tokens and scoped components while preserving appearance; remove unused legacy routes/components after coverage confirms they are unused.
- [ ] P04: implement bounded public caching, invalidation and graceful degradation. Private responses remain uncacheable.
- [ ] P05: add only justified durable jobs, retry/backoff, dead-letter inspection and reconciliation to real integrations.
- [ ] P06: record contact-click intent separately from confirmed consultations. Apply minimal campaign attribution without chat text, birth dates or personal details.
- [ ] P07: add request/worker error monitoring, integration health checks and actionable operator alerts with redaction.
- [ ] P08: verify input limits, timeouts, trusted-proxy controls, security headers, auth, CSRF and upload validation on staging.
- [ ] P09: verify accessibility, zoom, reduced motion, mobile/touch alternatives and a representative physical Android device.
- [ ] P10: run restore and rollback drills; document actual recovery results and operational ownership.
- [ ] P11: configure real provider accounts, domain, approved policies and live stock, then verify production responses and shop payments before advertising purchases.

Done: launch claims are supported by staging and production evidence, not by mocks or a successful local build alone.

## M7: portfolio proof

- [ ] G01: add an architecture diagram, ERD, API reference, ADRs and a concise feature-to-code map.
- [ ] G02: add a demo setup with explicit fixtures and no real customer records or secrets.
- [ ] G03: publish measured before/after performance and meaningful failure/security test evidence.
- [ ] G04: explain the WhatsApp business decision, provider ownership boundaries, idempotency, authorization and data minimization in an interview-ready case study.

## 12 November 2026 update

See [LAUNCH-PLAN.md](LAUNCH-PLAN.md) for the fresh audit, research, results and the decision register, and [DEPLOYMENT.md](DEPLOYMENT.md) for the production runbook. Also delivered: welcome screen, booking steps, policy pages driven by confirmed business facts with a `launch:check` gate, persistent cart, `/api/ready`, hardened `vercel.json`/`render.yaml`, browser tests and a bundle budget in CI.

## Continuing work

M1 R01–R07 is implemented and locally verified; see [the milestone evidence and archive migration notes](M1-WHATSAPP-HANDOFF.md). Hindi titles, exact delivery details and prices still need owner review before launch. E01–E03 and the CI/dependency portion of E07 now establish the first strict catalogue slice, generated contracts, modular Fastify boundary and pinned checks; see [ADR 001](adr/001-typed-api-boundary.md). E04–E05 now add versioned PostgreSQL schemas, a restricted runtime repository and deliberate archive imports; 12 native PostgreSQL tests pass alongside 31 application tests. Local preview uses the development database. E06–E07 remote CI/CodeQL verification remains pending. See [database setup/evidence](DATABASE.md) and [ADR 002](adr/002-postgres-studio-data.md). Next: M3 managed identity, MFA-gated owner API and studio workflows. Do not start by replacing the visual identity or building an on-site reading payment funnel. External messaging is not part of development verification; inspect the generated targets without sending messages to the studio.
