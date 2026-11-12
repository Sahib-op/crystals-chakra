# Crystals Chakra

A readings-first website for a family-run Indian tarot and astrology studio, with a secondary crystal shop. The public journey opens a WhatsApp conversation or phone call; the owner confirms the reading, timing and payment directly. The free zodiac/numerology tool calculates locally in the browser.

## Current build and production goal

The royal cream, navy, burgundy and gold identity, original logo, compact masthead and expandable side rail are retained. First-time homepage visitors see an interactive welcome screen: a star field that follows the pointer and a tarot card that opens the site. The 3D rings load automatically only on capable desktops; phones get a lightweight animated illustration with an “Explore in 3D” option. English leads the interface; Hindi reading titles use a licensed local Devanagari font. Tarot with Amanpreet Kaur is a first-class reading alongside the three existing astrology packages.

The WhatsApp-first customer flow and a private reading editor are implemented. The studio editor supports drafts, preview, publishing, archiving and change history. Practitioner and consultation management, hosted authentication and multi-item commerce remain in the build plan.

- [**Production launch plan**: audit, research, results and owner decisions](docs/LAUNCH-PLAN.md)
- [**Production deployment runbook** (Vercel, Render, Supabase, Shopify)](docs/DEPLOYMENT.md)
- [Product and architecture plan](docs/PRODUCT-PLAN.md)
- [Ordered implementation backlog](docs/IMPLEMENTATION-BACKLOG.md)
- [Technical and security audit with resolution notes](docs/TECHNICAL-AUDIT.md)
- [Engineering sources and reviewed skills](docs/SKILLS-SOURCES.md)
- [WhatsApp-first milestone evidence](docs/M1-WHATSAPP-HANDOFF.md)
- [Typed backend foundation progress](docs/M2-FOUNDATION.md)
- [Database setup, access rules and migration evidence](docs/DATABASE.md)

No booking, message delivery or payment is inferred from clicking a link. Existing astrology prices and inclusions still require owner confirmation before launch; tarot has no invented price. The portrait is explicitly a placeholder. Business facts for the policy pages live in `shared/business.js`; anything unconfirmed is shown as pending, and `npm run launch:check` lists what the studio still needs to supply.

## Run locally

Requires Node 24.12 or later in the Node 24 line.

On Windows with PowerShell 7.4+ and the [portable PostgreSQL setup](docs/DATABASE.md), run `npm ci` and then `npm run dev:local`. The launcher starts the isolated PostgreSQL database, local Studio sign-in fixture, API and frontend. It prints the preview URLs after verifying the site and API.

On Linux or macOS, `scripts/start-local-postgres.sh` creates and starts the same isolated database (see [database setup](docs/DATABASE.md#linux-and-macos)).

For manual startup:

```sh
npm ci
npm run dev:api
# In a second terminal:
npm run dev -- --host localhost --port 5175 --strictPort
```

Open http://localhost:5175/. Vite proxies `/api` to port 3001. Copy `.env.example` to `.env` only when custom configuration is needed. The public API can use the restricted PostgreSQL catalogue connection. Without database configuration it uses the bundled catalogue; it does not collect public consultation records. This workspace has an isolated local database ready; see [database setup](docs/DATABASE.md) for starting it or reproducing the tests.

```sh
npm run contracts:check
npm run typecheck
npm test
npm run test:db
npm run format:check
npm run build          # Vite build + prerendered /, /shop, /policies
npm run check:budget   # bundle budget for the public entry
npm run test:e2e       # browser checks against the production build (Playwright)
npm run launch:check   # business facts still awaiting the studio
npm run preview:prod   # serve dist/ locally with vercel.json rewrites and headers
```

### Preview the owner studio

After starting and provisioning the isolated PostgreSQL database, run `npm run dev:studio-auth` in a separate terminal. Start or restart `npm run dev:api` after the fixture reports ready. Open [the local studio](http://localhost:5175/studio), choose **Use the local preview account**, sign in, then enter the fixture code `123456`. The fixture only works with the loopback development database and is rejected in production.

## Customer flows

- One scrolling studio page: opening → tarot → astrology packages → booking → understanding astrology → collection invitation → questions. `/shop` and `/policies` are separate. Legacy `/services`, `/science`, `/book` and `/privacy` links redirect and preserve useful reading selection.
- The booking section explains the four steps (choose, message, studio confirms date/time/price/payment, reading) and states that nothing is booked until the studio confirms.
- `/policies` covers business details, privacy, reading terms, shipping, returns, product claims and the grievance officer, rendered from confirmed facts only.
- Paid-reading actions open the configured studio WhatsApp number with a short package-specific message. The visitor sends it in WhatsApp. The persistent header offers Contact and Call; the contact section also exposes the number and a copy control.
- The free tool needs only a date of birth. Calendar validation, conventional tropical zodiac ranges and digit-sum numerology run in the browser. It is not a Vedic chart or scientifically established prediction. Closing the tool clears the date.
- The website loads the published reading catalogue and uses the bundled catalogue if the first request fails. General studio contact stays available while the catalogue loads.
- Unconfigured commerce displays clearly labelled illustrative items and disables checkout. The cart keeps only variant IDs and quantities in the browser for up to seven days and clears once Shopify checkout opens.

## Structure and boundaries

```text
shared/                 Public studio settings, reading catalogue and contact helpers
src/components/         Navigation, contact state, accessible reading dialog and 3D scene
src/pages/              Scrolling studio sections and separate shop
server/app.ts           Typed Fastify boundary and protected request handling
server/routes/          Catalogue and commerce route modules
server/database/        Restricted pool, catalogue repository, migration/import tools
supabase/migrations/    Versioned PostgreSQL tables, policies, indexes and audit triggers
shared/contracts.ts     Runtime schemas and inferred API types
shared/generated/       Ahead-of-time browser validator
server/http.ts          Bounded JSON/UTF-8 request parsing
server/commerce.js      Server-side Shopify Storefront adapter
server/store.js         Retained legacy consultation adapter; not mounted publicly
supabase/schema.sql     Retained private legacy table definition
public/fonts/           Licensed local Devanagari subset and provenance
public/intro.js         Welcome screen behaviour (runs before React; CSP-safe)
shared/business.js      Business facts for policies; null means pending
server/commerce/        Shopify webhook signature, money and order projection
scripts/prerender.js    Build-time HTML for public routes
scripts/serve-dist.js   Production-like local server using vercel.json
tests/                  Unit/API, real-PostgreSQL (tests/database) and browser (tests/e2e) tests
docs/                   Product decisions, audit, roadmap and evidence
```

The API and first frontend render share the public reading catalogue. The strict TypeScript catalogue slice uses one TypeBox schema and an ahead-of-time browser validator; `contracts:check` detects stale generated code. See [ADR 001](docs/adr/001-typed-api-boundary.md) for the incremental migration and limitations. Contact helpers allow only configured destinations, bound message lengths, strip control characters and encode messages once. No customer or birth details are added to contact URLs automatically.

## Current API

| Route                        | Behaviour                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /api/health`            | Process liveness only; does not certify provider or database readiness                               |
| `GET /api/ready`             | Readiness: a round trip to the database through the restricted runtime role                          |
| `POST /api/webhooks/shopify` | Verified Shopify order notifications: raw-body HMAC, shop check, deduplication, PII-free order state |
| `GET /api/services`          | Published reading packages from the active catalogue                                                 |
| `GET /api/products`          | Paginated Shopify products and variants, or an illustrated preview                                   |
| `POST /api/checkout`         | Validates basket lines and creates a Shopify-hosted checkout when configured                         |
| `POST /api/bookings`         | Retired: HTTP 410 with studio contact links; no payload collection or write                          |
| `POST /api/readings`         | Retired: HTTP 410; the public free calculation stays browser-local                                   |

The Fastify boundary includes exact-origin handling, strict JSON/UTF-8 byte limits, schema validation, server-generated request IDs, controlled errors and logs that exclude customer data. `GET /api/openapi.json` documents registered public routes. Product and checkout rate limiting is bounded but instance-local and groups by the socket address. Hosted owner sign-in, production proxy limits, caching and observability still need deployment verification. CORS is not authentication.

## Existing records and privacy

The old public form is removed. Its stored records are not deleted: any existing ignored `data/chakra.sqlite` file or private Supabase `bookings` table remains in place. `server/store.js` and its survival test are retained for a deliberate migration. The active public server does not instantiate that adapter. Do not expose or copy archived customer records into fixtures, public responses, logs or GitHub.

The studio must review retained records, establish access and retention/deletion practices, and migrate them through an authorized private workflow before new operations are enabled. See [the migration notes](docs/M1-WHATSAPP-HANDOFF.md). WhatsApp and telephone handoffs use external services; the date-only free tool neither sends nor saves the entered date.

## Optional Shopify connection

`server/commerce.js` uses Shopify Storefront API version 2026-10. Configure `SHOPIFY_STORE_DOMAIN` as the exact `name.myshopify.com` host and `SHOPIFY_STOREFRONT_TOKEN` as a Storefront access token stored server-side. Do not substitute an Admin token. No account is linked automatically.

The catalogue loads products a page at a time. Customers can choose variants and change quantities in the basket before continuing to Shopify. The API sends variant IDs and quantities, checks whether Shopify accepted the requested basket, and returns a hosted checkout URL from the configured store host. Set `SHOPIFY_CHECKOUT_HOST` to the exact hostname if the merchant uses a separate checkout domain. Shopify determines the final total, shipping, payment options and stock availability.

A Shopify merchant sandbox is required to verify payment, shipping, order confirmation and cancellation. Order and payment state reaches the studio only through verified webhooks (`SHOPIFY_WEBHOOK_SECRET`), never from a browser returning from checkout; the projection stores no customer names, emails, phones or addresses. An owner order view is still to come. See [Shopify’s cart documentation](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).

Checkout destinations fail closed when no merchant host is configured. Provider responses must be JSON and stay within a 2 MiB decoded-byte limit, including chunked responses and misleading Content-Length headers. The reader cancels oversized streams before parsing, while the existing six-second fetch timeout bounds network waits. Transport and parsing failures return recoverable, uncacheable errors without provider details. `tests/commerce.test.js` covers these boundaries alongside pagination, stock changes, variant selection and cart quantities. These local tests do not establish that a real merchant checkout works.

## Deployment status

Production hosting is a release milestone, separate from the local database and credentials. `vercel.json` (rewrites, CSP, HSTS, framing and caching headers) and `render.yaml` (Singapore, always-on plan, pre-deploy migrations) are ready to apply; follow [the deployment runbook](docs/DEPLOYMENT.md). They are not evidence of a live production setup. For the API, set the exact `FRONTEND_URL` origin and restricted `DATABASE_URL` on Render and the public `VITE_API_URL` on Vercel; never put service credentials in `VITE_` variables. Apply the versioned migrations through the separate migration connection; the legacy schema file is an archive reference. Never point production at the local `work` database.

Before launch, complete the production milestones, approve business copy/prices/policies and the actual domain, configure providers, verify hosted headers and authorization, test the merchant sandbox and rehearse recovery. A successful local build does not prove any of those external controls.
