# Production launch plan — 12 November 2026

Product direction stays in [PRODUCT-PLAN.md](PRODUCT-PLAN.md). This document records a fresh audit of the current `main` (including the contributor shop rework in `6d3e262`), current primary-source research, the phased plan to production, and every decision that only the business owner or an external account can make.

Production means Vercel (frontend), Render (API) and Supabase (PostgreSQL, Auth). Local development stays local: the isolated PostgreSQL 17 cluster in ignored `work/`, preview commerce and the loopback-only studio fixture. Nothing in this repository deploys, buys a plan or connects a merchant account.

Protected by the owner and not changed by this plan: the logo artwork and its brand colouring, the side rail, and the header animation.

## 1. Audit — measured baseline

### What is already strong

- Typed Fastify API with schema validation, strict JSON/UTF-8 parsing, server-generated request IDs, redacted logs, bounded rate limiting and controlled errors (`server/app.ts`).
- PostgreSQL 17 schema with forced RLS, owner-only policies, revision and audit triggers, integer minor-unit money and a restricted NOINHERIT runtime role (`supabase/migrations/`). 19 real-database tests.
- Owner studio with Supabase JWT verification (issuer/audience/algorithm/claim checks), allowlist, MFA (AAL2) gating and draft → publish → history workflow.
- Shopify Storefront adapter with response size bounds, schema checks, checkout-host binding (SEC-05 resolved) and a multi-item cart (contributor change).
- **Remote CI now verified**: on `main`, the Verify workflow (contracts, types, format, 43 app tests, PostgreSQL service tests, build, audit) and CodeQL both pass. This closes backlog E06/E07.

### Findings

| ID      | Severity | Finding                                                                                                                                                                                                                                                 | Evidence                                       |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| PERF-03 | High     | Lighthouse mobile performance **49**: TBT 5.9 s, CLS 0.206, 13.4 s main-thread work, LCP 3.0 s.                                                                                                                                                         | Lighthouse 12, production build, local preview |
| PERF-04 | High     | The WebGL rings cause ~85% of blocking time and nearly all layout shift. With the scene blocked: blocking 2,372 → 302 ms, CLS 0.369 → 0.012 (4× CPU throttle). CSS animations account for little (2,372 → 1,965 ms).                                    | Controlled Playwright experiment               |
| PERF-05 | Medium   | Google Fonts stylesheet is render-blocking (~900 ms estimated) and sends every visitor's IP to a third party before consent/notice.                                                                                                                     | Lighthouse render-blocking audit, `index.html` |
| SEO-01  | Medium   | Still open: the body is an empty `#root`; no robots.txt (the SPA fallback answers `/robots.txt` with HTML — 47 Lighthouse errors), no sitemap, `og-image.png` referenced but missing.                                                                   | Lighthouse SEO 92, `index.html`, `public/`     |
| A11Y-01 | Serious  | WCAG 2.5.3 Label in Name: package buttons read “Ask on WhatsApp” but are named “Ask about Birhaat Kundli on WhatsApp”.                                                                                                                                  | axe-core 4, 3 nodes                            |
| A11Y-02 | Moderate | 58% of homepage text renders below 12 px on mobile (10–11 px labels and notes). The audience includes older customers.                                                                                                                                  | Lighthouse font-size audit                     |
| A11Y-03 | Minor    | Skip link sits outside any landmark.                                                                                                                                                                                                                    | axe `region`                                   |
| COPY-02 | Medium   | “The Science of Astrology” heading contradicts the section's own (correct) statement that astrology is not established science. Unused `src/pages/Services.jsx` still contains an unverified “certified Vedic” claim.                                   | Source review                                  |
| SEC-04  | Medium   | Still open: no CSP, HSTS, frame-ancestors or Permissions-Policy in `vercel.json`; assets not marked immutable.                                                                                                                                          | `vercel.json`                                  |
| PAY-01  | High     | Payments: browser return from checkout is the only signal; there is no verified Shopify webhook intake or order projection (backlog C04).                                                                                                               | `server/routes/commerce.ts`                    |
| LEGAL-1 | High     | No terms, shipping, returns/refund/cancellation or grievance-officer information, which Indian e-commerce rules expect sellers to display. Product pages lack Legal Metrology declarations (manufacturer/packer, country of origin, net quantity, MRP). | Site inventory; research §2                    |
| OPS-01  | Medium   | Still open: health is liveness only; no readiness check for the database.                                                                                                                                                                               | `server/routes/readings.ts`                    |
| DEP-01  | Medium   | `render.yaml` omits region, plan, Auth/Shopify variables and a migration step. Free Render instances sleep after 15 minutes.                                                                                                                            | `render.yaml`; research §2                     |
| CART-01 | Low      | The cart is in memory only; a reload empties it.                                                                                                                                                                                                        | `src/pages/Shop.jsx`                           |
| MAINT-2 | Low      | Unused modules: `Navbar.jsx`, `CursorGlow.jsx`, `ScrollToTop.jsx`, `Privacy.jsx`, `Services.jsx`.                                                                                                                                                       | Import graph                                   |
| CI-01   | Low      | No browser, accessibility or CSP checks in CI. Dependabot's grouped major upgrade (React 19, Vite 8, Tailwind 4) fails Verify and needs a deliberate migration.                                                                                         | Workflow runs; `Sahib-op/crystals-chakra#11`   |

Baseline scores (mobile, Lighthouse 12, local production preview): Performance 49, Accessibility 100, Best Practices 96, SEO 92. Lab results in a GPU-less container exaggerate WebGL cost; they are development evidence, not field Core Web Vitals.

## 2. Research — current sources

Fetched or searched on 12 November 2026. Law-firm summaries are secondary sources; the owner should confirm obligations with an adviser. This is not legal advice or a compliance certification.

- **DPDP Rules, 2025** were notified in November 2025 with staged commencement: most notice, security, breach, retention and rights obligations apply 18 months after publication (around May 2027); Consent Manager registration applies after one year. Design for them now: itemised notice, purpose limitation, deletion, breach readiness. [SCC Online](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/), [Mondaq](https://www.mondaq.com/india/data-protection/1708164/digital-personal-data-protection-rules-2025-notified).
- **Consumer Protection (E-Commerce) Rules, 2020**: sellers must give their legal name, address and contact, a grievance officer (complaints acknowledged within 48 hours, resolved within one month), price and breakup, country of origin, and return, refund, exchange, warranty, delivery and payment information; no refusal of refunds for defective/late goods. A 2026 amendment is reported; check the current text. [Trilegal analysis](https://trilegal.com/wp-content/uploads/2021/11/Consumer-Protection-E-Commerce-Rules-2020.pdf), [Khaitan & Co](https://www.khaitanco.com/thought-leaderships/Stricter-Regulations-on-E-Commerce-The-Consumer-Protection-E-Commerce-Rules-2020), [Ministry page](https://consumeraffairs.nic.in/theconsumerprotection/consumer-protection-e-commerce-rules-2020).
- **Legal Metrology (Packaged Commodities) Rules, rule 6(10)**: e-commerce entities must display the package declarations online (except manufacture date); a 2026 sub-rule 6(10A) adds duties for imported goods. [Lakshmikumaran & Sridharan](https://lakshmisri.com/insights/articles/aiming-greater-transparency-on-sale-of-packaged-commodity-online), [Mondaq 2026 update](https://www.mondaq.com/india/commoditiesderivativesstock-exchanges/1749842/regulatory-update-%7c-legal-metrology-packaged-commodities-amendment-rules-2026).
- **Drugs and Magic Remedies (Objectionable Advertisements) Act, 1954**: “magic remedy” includes talismans and charms claimed to heal or influence bodily functions; ASCI regularly upholds complaints under it. Crystal and remedy copy must make no health, cure or guaranteed-outcome claims. [India Code](https://www.indiacode.nic.in/handle/123456789/1412), [ASCI report](https://www.ascionline.in/wp-content/uploads/2022/09/asci_feb-2019_ccc_recom.pdf).
- **Payments**: Shopify Payments is not offered to India-based merchants; Indian stores connect Razorpay, PayU, Cashfree, CCAvenue or Paytm inside Shopify checkout, so card/UPI data never touches this site. Shopify adds its own fee for third-party gateways. [Shopify India](https://www.shopify.in/blog/different-payment-methods-on-shopify-and-how-to-set-them-up), [Shopify community](https://community.shopify.com/t/regional-support-payments-india/23357/67). Razorpay's acceptance of astrology consultations could not be confirmed from its public documents; ask in writing before relying on it for readings.
- **Shopify webhooks**: verify `X-Shopify-Hmac-Sha256` (base64 HMAC-SHA256 of the raw body with the app secret) in constant time; deduplicate deliveries on `X-Shopify-Webhook-Id` and use `X-Shopify-Event-Id` for correlation; failed deliveries retry up to 8 times over 4 hours; handlers must be idempotent. [Verify deliveries](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries), [Ignore duplicates](https://shopify.dev/docs/apps/build/webhooks/ignore-duplicates), [Order webhooks](https://shopify.dev/docs/agents/orders/order-webhooks).
- **Shopify API versions**: quarterly releases, each supported at least 12 months; 2026-10 (used here) is the latest stable release, accessible until October 2027. [Versioning](https://shopify.dev/docs/api/usage/versioning).
- **Supabase**: enforce MFA with a restrictive RLS policy on `auth.jwt()->>'aal' = 'aal2'`; never authorise from `user_metadata`. Daily backups on Pro (7-day retention), PITR as a paid add-on; the session pooler on port 5432 suits migrations; port 6543 is transaction mode only. [MFA](https://supabase.com/docs/guides/auth/auth-mfa), [Backups](https://supabase.com/features/database-backups), [Connecting](https://supabase.com/docs/guides/database/connecting-to-postgres).
- **Render**: free web services spin down after 15 idle minutes and take about a minute to wake; paid instances stay on. Singapore is the nearest region to India and a service's region cannot be changed later. [FAQ](https://render.com/docs/faq), [Regions](https://render.com/docs/regions).
- **Vercel**: SPA catch-all rewrite for Vite; security headers in `vercel.json`; start a CSP in report-only where unsure and avoid `unsafe-inline` scripts; `.vercel.app` already has HSTS. [Security headers](https://vercel.com/docs/cdn-security/security-headers), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).
- Already recorded and still current: WhatsApp click-to-chat, WCAG 2.2, Core Web Vitals and OWASP ASVS sources in [SKILLS-SOURCES.md](SKILLS-SOURCES.md).

## 3. Skills used

No additional organisation skills were available. The pinned guidance in [SKILLS-SOURCES.md](SKILLS-SOURCES.md) (security best practices, React performance, web interface guidelines, Supabase/Postgres) still applies. This pass also uses the built-in security-review and code-review passes, Lighthouse 12 and axe-core 4 for measurement. The measurement tools run from a scratch folder and are not project dependencies.

## 4. Phased plan

Each phase ends with tests and recorded evidence. ✅ = implemented in this pass, 🔒 = blocked on a decision in §6.

### Phase 1 — Fast, readable, accessible public site

- ✅ Reserve the rings' space and load WebGL only on capable devices after the page settles; everyone else gets the still illustration with an “Explore in 3D” control (PERF-03/04).
- ✅ Self-host OFL-licensed Inter and Playfair Display; drop Google Fonts (PERF-05).
- ✅ Prerender `/` and `/shop` HTML at build time so contact links, packages and metadata exist before JavaScript (SEO-01).
- ✅ Fix Label in Name, the skip-link landmark and sub-12 px text; raise body and label sizes (A11Y-01..03).
- ✅ robots.txt, sitemap.xml, a generated Open Graph image using the unchanged logo.

- ✅ Interactive welcome screen (owner request): a star field that follows the pointer or touch, “Unlock Your Destiny”, and a tarot card that flips to reveal the site. It is static HTML plus a 3 KB script that runs before React, so the title paints immediately and the card works before the app loads. Shown once per session on the homepage only; deep links, Escape and “Skip intro” bypass it; reduced motion gets a still sky; without JavaScript the site is shown directly.

### Phase 2 — Clear booking path, honest content, trust

- ✅ “How a reading works” steps: choose → message on WhatsApp → studio confirms time, price and payment → reading. No false confirmation.
- ✅ Rename the information section (“Understanding Astrology”) and remove unused legacy modules with unverified claims (COPY-02, MAINT-2).
- ✅ Policy pages (privacy, terms, shipping, returns and cancellations, grievance contact) rendered from one business-facts file. Unconfirmed facts show as “to be confirmed by the studio” instead of being invented; a launch check fails while they are missing.
- 🔒 Real portrait, confirmed prices/inclusions, business hours, legal entity, grievance officer.

### Phase 3 — Secure payments and shop operations

- ✅ Verified Shopify webhook intake: raw-body HMAC in constant time, size limits, delivery-ID deduplication in PostgreSQL, idempotent minimal order projection, no customer PII stored (PAY-01).
- ✅ Persist the cart in the browser (variant IDs and quantities only), revalidated by Shopify at checkout (CART-01).
- ✅ Show shipping/returns links beside checkout.
- 🔒 Shopify store, Storefront token, payment gateway (Razorpay/PayU/Cashfree) inside Shopify, webhook secret, product data with Legal Metrology declarations.
- 🔒 Reading payments stay arranged by the studio in conversation unless the owner chooses a provider and the provider confirms eligibility in writing.

### Phase 4 — Production hosting, security headers, operations

- ✅ `vercel.json`: CSP, HSTS, frame-ancestors, Permissions-Policy, COOP, immutable asset caching; tested against the built site.
- ✅ `render.yaml`: Singapore region, always-on paid plan, every required variable, migrations before deploy, readiness health check.
- ✅ `/api/ready` checks the database separately from liveness (OPS-01).
- ✅ Production runbook: environment variables per service, first deploy order, migration, secrets, rollback, backup and restore drill.
- 🔒 Accounts, domain, DNS, paid tiers, secrets entered in each provider's dashboard.

### Phase 5 — Engineering evidence

- ✅ Browser end-to-end tests in CI: contact links, keyboard path, 320 px overflow, axe scan, CSP violations, prerendered HTML.
- ✅ Bundle-size budget check in CI.
- Next: Consultation records for the owner (backlog A04–A07), contact-intent analytics without PII (P06), error monitoring (P07), React 19/Vite 8/Tailwind 4 migration as its own reviewed change.

## 5. Results of this pass

Same Lighthouse 12 mobile profile and compressed local production build as the baseline (lab data, not field Core Web Vitals):

| Metric                               | Baseline      | After (first visit, welcome screen) | After (site directly) |
| ------------------------------------ | ------------- | ----------------------------------- | --------------------- |
| Performance                          | 49            | 94                                  | 92                    |
| Largest Contentful Paint             | 3.0 s         | 2.5 s                               | 2.7 s                 |
| Total Blocking Time                  | 5,900 ms      | 40 ms                               | 110 ms                |
| Cumulative Layout Shift              | 0.206         | 0.019                               | 0.015                 |
| Accessibility / Best Practices / SEO | 100 / 96 / 92 | 100 / 100 / 100                     | 100 / 100 / 100       |
| Transferred                          | 473 KiB       | 351 KiB                             | 351 KiB               |

Automated evidence: 56 application tests, 23 real-PostgreSQL tests (including concurrent webhook redelivery and role isolation), 30 browser tests across desktop and mobile (prerendered HTML, security headers, CSP violations, welcome screen, booking path, axe at 320 px), a bundle budget and a launch-readiness report in CI. The CSP and headers were exercised against a local server applying `vercel.json`; the hosted response still needs checking after deployment.

## 6. Decision register — needed before launch

| #   | Decision                                                                                                  | Owner input needed                            | Blocks                             |
| --- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------- |
| D1  | Legal entity name, registered address, GSTIN (if registered)                                              | Business documents                            | Policy pages, invoices, Shopify    |
| D2  | Grievance officer name, designation, email, phone                                                         | Named person                                  | E-commerce rules display           |
| D3  | Reading prices, inclusions, durations, delivery format; tarot price                                       | Confirm or replace current provisional prices | Publishing packages                |
| D4  | Cancellation, rescheduling and refund terms for readings                                                  | Studio policy                                 | Terms page                         |
| D5  | Shop shipping regions, delivery times, charges; return/exchange window; who pays return shipping          | Studio policy                                 | Shipping/returns pages, checkout   |
| D6  | Product data: photos, variants, stock, MRP, manufacturer/packer/importer, country of origin, net quantity | Supplier details                              | Live shop                          |
| D7  | Shopify plan and payment gateway (Razorpay, PayU, Cashfree…), plus KYC                                    | Merchant accounts                             | Checkout, webhooks                 |
| D8  | Whether readings take online payment, and with which provider (written eligibility for astrology/tarot)   | Business choice + provider confirmation       | Any reading payment flow           |
| D9  | Domain (crystalschakra.com?) and DNS; API subdomain (e.g. api.crystalschakra.com)                         | Registrar access                              | CSP tightening, CORS, cookies, SEO |
| D10 | Vercel, Render and Supabase accounts and paid tiers (Render Starter or higher; Supabase Pro for backups)  | Accounts and budget                           | Production deployment              |
| D11 | Supabase region (Mumbai recommended for latency and data locality)                                        | Account choice                                | Database                           |
| D12 | Studio owner email(s) for invitation, and MFA enrolment                                                   | Owner identity                                | Studio access                      |
| D13 | Amanpreet Kaur's approved portrait and bio; any other practitioners                                       | Photos and consent                            | Tarot section                      |
| D14 | Business hours and response expectations                                                                  | Studio routine                                | Contact copy                       |
| D15 | Retention period and deletion process for the archived legacy enquiries                                   | Studio decision (+ adviser)                   | Archive migration                  |
| D16 | Analytics: none, or a privacy-preserving provider                                                         | Business choice                               | P06, privacy notice                |
| D17 | Approved Hindi titles and spelling                                                                        | Owner review                                  | Reading cards                      |

Until these are supplied, the site keeps working in preview mode: readings open WhatsApp, the shop shows labelled illustrative items with checkout disabled, and policy pages state which facts are pending.
