# Reviewed skills and primary sources

Reviewed and installed 7 November 2026. These are engineering guidance, not project features or guarantees of security. Newly installed skills become available to Codex automatically on the next turn; the reviewed instructions were also read directly for this planning pass.

## Installed skills

| Skill                            | Official repository and pinned revision                                                                                                                 | Applied to                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| security-best-practices          | [openai/skills](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices)                 | React/browser security review and secure defaults; current native Node backend additionally checked against primary OWASP guidance |
| vercel-react-best-practices      | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/react-best-practices)       | Critical-path rendering, conditional 3D loading, data fetching and event/listener costs                                            |
| web-design-guidelines            | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/web-design-guidelines)      | Public contact hierarchy, focus, touch, forms, imagery, motion and locale handling                                                 |
| supabase-postgres-best-practices | [supabase/agent-skills](https://github.com/supabase/agent-skills/tree/c9be0e931b7930f7d02126d04774d904c381e7d7/skills/supabase-postgres-best-practices) | Planned schema, exact money/time types, query-driven indexes, transactions and RLS                                                 |

Skill folders were installed through the existing Skill Installer, with repository revisions pinned. No third-party skill helper or deployment script was executed. The Vercel UI review skill additionally references its maintained [interface guidance](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md); refresh it before a future UI audit.

The existing Sites skill supplies the local repository workflow. Publication is still a later project milestone. User business requirements take precedence over optional skill style conventions. In particular, preserve the established identity and do not force a pause button back onto the rings; plan an accessible static/reduced-motion experience instead.

Avoid applying Next.js-specific patterns to the current Vite/React application without a documented architecture decision. Do not install extra dependencies merely because a skill example uses them. Claims of numerical speedups inside generic skill examples are not measurements of this application.

## Product and integration sources

- [WhatsApp click-to-chat](https://faq.whatsapp.com/5913398998672934/): direct links and URL-encoded prefilled messages. This supports the reading handoff, not automatic booking or chat-history access.
- [Shopify Storefront Cart API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage): cart operations and checkout URL handoff.
- [Shopify headless overview](https://shopify.dev/docs/storefronts/headless/overview): ownership of storefront, cart, checkout and optional customer accounts.
- [Supabase production security](https://supabase.com/docs/guides/security/production-checklist): RLS, access controls and production configuration checks.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): database authorization boundaries and service-key limitations.
- [OWASP ASVS](https://asvs.owasp.org/): testable application security requirements; no certification is claimed by this plan.
- [Core Web Vitals](https://web.dev/articles/vitals): proposed loading/interactivity/stability targets and field measurement requirements.
- [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): distinguish the AA minimum from the larger touch targets proposed for this audience.
- [Render free-service limits](https://render.com/docs/free): production compute and availability planning.
- [Vercel prerendering guidance](https://vercel.com/kb/guide/how-can-i-prerender-my-application-on-vercel): rendering direction, to be implemented with the chosen React build setup.
- [MeitY DPDP Rules publication](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025): starting point for a launch-time review of applicable Indian data requirements. The publication page was not machine-readable in this audit, so no conclusion about specific commencement dates or full compliance is asserted.

Reading payment gateway integration is not part of the confirmed WhatsApp-first funnel. [Razorpay's webhook guidance](https://razorpay.com/docs/webhooks/validate-test/) was reviewed as technical background, but merchant eligibility for astrology/tarot was not established. Do not represent it as approved or introduce a reading payment provider without a real business requirement and merchant verification.

## Baseline evidence

- Build: passed on 7 November 2026.
- Formatting: passed.
- Tests: 16/16 passed with local test-server access. The initial restricted run hit EACCES on loopback connections; a permitted rerun passed, so that was not classified as an application defect.
- npm audit: zero reported known vulnerabilities, 195 dependencies in the audit tree. The initial network-restricted attempt could not resolve the registry; the permitted live audit succeeded.
- Generated frontend bundle: approximately 128.4 kB gzip, plus a separate approximately 139.9 kB gzip 3D chunk and approximately 18.7 kB gzip CSS. These are build sizes, not LCP/INP measurements.
- Existing browser checks from the preceding UI pass cover narrow and desktop layouts, contact links, section order and selection state. This planning pass does not claim a new physical-device, load, penetration or production-provider test.

## M1 evidence update

The planning baseline above remains historical. The WhatsApp-first milestone adds a shared public catalogue/contact boundary, retires public personal-data writes, fixes split UTF-8 decoding, removes duplicate font loading and adds a licensed local Devanagari font. Current verification is recorded in [M1-WHATSAPP-HANDOFF.md](M1-WHATSAPP-HANDOFF.md); the production backend, physical-device measurements and live providers remain later work.

## M2 foundation evidence update

The first catalogue slice now uses strict TypeScript, a modular Fastify API and generated TypeBox/Ajv browser contracts. Official Fastify/TypeBox, Node 24 and Ajv documentation and the installed package source were consulted; see [ADR 001](adr/001-typed-api-boundary.md). Installed versions are pinned in package.json/lockfile. All 31 tests, contract/type/format checks and build pass; the live npm audit reports zero known vulnerabilities. CI revisions were resolved from the official action repositories and pinned, but CI has not run remotely. PostgreSQL/provider/deployment claims remain pending.

## PostgreSQL evidence update

The official EDB PostgreSQL 17.11 Windows archive was found through the PostgreSQL downloads page, downloaded into ignored work/tools and checked by executable version/hash. Native real-database tests now pass 12/12; application tests pass 31/31. Database/RLS/schema guidance informed migration and repository work; see [ADR 002](adr/002-postgres-studio-data.md) and [the database guide](DATABASE.md) for primary sources and test scope. The official PostgreSQL CI image digest and CodeQL v4 revision were resolved and pinned; no remote scan/CI result is claimed.
