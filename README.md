# Crystals Chakra

A readings-first website for a family-run Indian tarot and astrology studio, with a secondary crystal shop. The public journey opens a WhatsApp conversation or phone call; the owner confirms the reading, timing and payment directly. The free zodiac/numerology tool calculates locally in the browser.

## Current build and production goal

The royal cream, navy, burgundy and gold identity, original logo, compact masthead, expandable side rail and interactive 3D rings are retained. English leads the interface; Hindi reading titles use a licensed local Devanagari font. Tarot with Amanpreet Kaur is a first-class reading alongside the three existing astrology packages.

The WhatsApp-first customer flow and a private reading editor are implemented. The studio editor supports drafts, preview, publishing, archiving and change history. Practitioner and consultation management, hosted authentication and multi-item commerce remain in the build plan.

- [Product and architecture plan](docs/PRODUCT-PLAN.md)
- [Ordered implementation backlog](docs/IMPLEMENTATION-BACKLOG.md)
- [Technical and security audit with resolution notes](docs/TECHNICAL-AUDIT.md)
- [Engineering sources and reviewed skills](docs/SKILLS-SOURCES.md)
- [WhatsApp-first milestone evidence](docs/M1-WHATSAPP-HANDOFF.md)
- [Typed backend foundation progress](docs/M2-FOUNDATION.md)
- [Database setup, access rules and migration evidence](docs/DATABASE.md)

No booking, message delivery or payment is inferred from clicking a link. Existing astrology prices and inclusions still require owner confirmation before launch; tarot has no invented price. The portrait is explicitly a placeholder.

## Run locally

Requires Node 24.12 or later in the Node 24 line.

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
npm run build
```

### Preview the owner studio

After starting and provisioning the isolated PostgreSQL database, run `npm run dev:studio-auth` in a separate terminal. Start or restart `npm run dev:api` after the fixture reports ready. Open [the local studio](http://localhost:5175/studio), choose **Use the local preview account**, sign in, then enter the fixture code `123456`. The fixture only works with the loopback development database and is rejected in production.

## Customer flows

- One scrolling studio page: opening → tarot → astrology packages → collection invitation → information → contact → questions. `/shop` is separate. Legacy `/services`, `/science` and `/book` links redirect to their sections and preserve useful reading selection.
- Paid-reading actions open the configured studio WhatsApp number with a short package-specific message. The visitor sends it in WhatsApp. The persistent header offers Contact and Call; the contact section also exposes the number and a copy control.
- The free tool needs only a date of birth. Calendar validation, conventional tropical zodiac ranges and digit-sum numerology run in the browser. It is not a Vedic chart or scientifically established prediction. Closing the tool clears the date.
- The website loads the published reading catalogue and uses the bundled catalogue if the first request fails. General studio contact stays available while the catalogue loads.
- Unconfigured commerce displays clearly labelled illustrative items and disables checkout.

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
tests/                  Contact, HTTP, archive, commerce, reading and 3D regression tests
docs/                   Product decisions, audit, roadmap and evidence
```

The API and first frontend render share the public reading catalogue. The strict TypeScript catalogue slice uses one TypeBox schema and an ahead-of-time browser validator; `contracts:check` detects stale generated code. See [ADR 001](docs/adr/001-typed-api-boundary.md) for the incremental migration and limitations. Contact helpers allow only configured destinations, bound message lengths, strip control characters and encode messages once. No customer or birth details are added to contact URLs automatically.

## Current API

| Route                | Behaviour                                                                     |
| -------------------- | ----------------------------------------------------------------------------- |
| `GET /api/health`    | Process liveness only; does not certify provider or database readiness        |
| `GET /api/services`  | Published reading packages from the active catalogue                          |
| `GET /api/products`  | Shopify products when configured; explicit preview otherwise                  |
| `POST /api/checkout` | Validates a variant and creates one hosted-checkout cart; disabled in preview |
| `POST /api/bookings` | Retired: HTTP 410 with studio contact links; no payload collection or write   |
| `POST /api/readings` | Retired: HTTP 410; the public free calculation stays browser-local            |

The Fastify boundary includes exact-origin handling, strict JSON/UTF-8 byte limits, schema validation, server-generated request IDs, controlled errors and logs that exclude customer data. `GET /api/openapi.json` documents registered public routes. Product and checkout rate limiting is bounded but instance-local and groups by the socket address. Hosted owner sign-in, production proxy limits, caching and observability still need deployment verification. CORS is not authentication.

## Existing records and privacy

The old public form is removed. Its stored records are not deleted: any existing ignored `data/chakra.sqlite` file or private Supabase `bookings` table remains in place. `server/store.js` and its survival test are retained for a deliberate migration. The active public server does not instantiate that adapter. Do not expose or copy archived customer records into fixtures, public responses, logs or GitHub.

The studio must review retained records, establish access and retention/deletion practices, and migrate them through an authorized private workflow before new operations are enabled. See [the migration notes](docs/M1-WHATSAPP-HANDOFF.md). WhatsApp and telephone handoffs use external services; the date-only free tool neither sends nor saves the entered date.

## Optional Shopify connection

`server/commerce.js` uses Shopify Storefront API version 2026-10. Configure `SHOPIFY_STORE_DOMAIN` as the exact `name.myshopify.com` host and `SHOPIFY_STOREFRONT_TOKEN` as a Storefront access token stored server-side. Do not substitute an Admin token. No account is linked automatically.

The current adapter fetches up to 24 products and their first variant. Buy now creates a one-item cart and redirects to hosted checkout. Multi-item carts, variant selection, webhook verification and owner-visible order state are subsequent milestones. Shopify owns stock, checkout totals and payment collection. Provider failures do not become fabricated live inventory. Adapter tests use a fake upstream transport; a real merchant sandbox is still required.

## Deployment status

Production hosting is a release milestone, separate from the local database and credentials. `render.yaml` and `vercel.json` are scaffolding, not evidence of a live production setup. For the API, set the exact `FRONTEND_URL` origin and restricted `DATABASE_URL` on Render and the public `VITE_API_URL` on Vercel; never put service credentials in `VITE_` variables. Apply the versioned migrations through the separate migration connection; the legacy schema file is an archive reference. Never point production at the local `work` database.

Before launch, complete the production milestones, approve business copy/prices/policies and the actual domain, configure providers, verify hosted headers and authorization, test the merchant sandbox and rehearse recovery. A successful local build does not prove any of those external controls.
