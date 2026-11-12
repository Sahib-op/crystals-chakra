# Rebuild plan and audit — 3 November 2026

Historical implementation notes follow. The current production direction is in [PRODUCT-PLAN.md](PRODUCT-PLAN.md), updated 7 November: reading enquiries go directly to WhatsApp, crystals are secondary ecommerce, and the next build slice replaces the public request-form barrier. Use that plan and [IMPLEMENTATION-BACKLOG.md](IMPLEMENTATION-BACKLOG.md) when earlier notes conflict.

## Agreed scope

Bookings are the main product. Customer accounts and commerce come later. This is both a portfolio project and a potential family-business site. Deployment is deferred; do not publish this overhaul yet. Existing service prices and public contact details are retained until the owner confirms changes. The cream/sage redesign was rejected. Preserve the original Crystals Chakra logo, titles, dark cosmic palette, zodiac artwork, routes, and section order. Refine within that existing identity. The rejected draft is saved under ignored work/.

## Audit findings and changes

- The original site had no backend or durable booking flow. Added a validated catalogue/reading/booking API and persistence boundary: SQLite locally, Supabase PostgreSQL in production.
- Old customer counts, testimonials, practitioner credentials and scientific-prediction language were not verified. These original sections are preserved while the visual structure is restored, per the latest request. Their claims still need owner verification before publication; do not silently change the business identity or replace section titles.
- The previous waiting-list behaviour never reached the business. Collection enquiries now explicitly use WhatsApp. No automatic notifications are claimed.
- Full legacy animation/background components and unused packages added maintenance burden. The first draft replaced these, but that design direction was rejected. Original visual components and their required packages are restored; further optimisation must preserve the established appearance.
- The original date engine permitted impossible calendar dates. Requests now validate actual dates, the allowed year range, and future dates before calculation.
- The new booking endpoint restricts service IDs, lengths, JSON body size and origins, asks for consent, rate-limits requests, and returns no contact details. Database errors do not produce false success.
- Supabase table access is denied to browser roles. The service-role key is server-only. Production fails closed if Supabase configuration is missing.
- Added meaningful API integration tests and a CI workflow. Build and API tests have passed locally. Browser QA remains outstanding because the in-app browser repeatedly rejected the session before exposing the page.

## Current architecture

- `src/components`: original Navbar, SideNav, BrandLogo, CosmicBackground, ZodiacWheel, ServiceCard, ReadingOverlay and supporting components.
- `src/pages`: original Home, Services, ScienceOfAstrology, Shop and NotFound pages, plus the new Booking and Privacy pages styled in the existing palette.
- `src/lib`: API client and external links.
- `server/catalog.js`: authoritative service definitions.
- `server/validation.js`: birth-date validation.
- `server/index.js`: public HTTP endpoints, limits, origin rules, error handling.
- `server/store.js`: persistence adapter.
- `supabase/schema.sql`: table, constraints, and RLS.
- `tests`: integration tests. `.github/workflows/verify.yml`: format, test, build.

## Next milestones

1. Preserve the original visual direction; validate desktop, 375px and 320px layouts, keyboard paths, form errors, booking references, and menu behaviour in a working browser.
2. Add idempotency and spam protection before live traffic; agree how the studio will monitor enquiries, contact customers, and remove old records. The current Supabase dashboard is the operational inbox, not an in-app admin tool.
3. Add an authenticated studio dashboard with role-based access only if needed for daily operation. Use Supabase Auth and server verification; never hand-roll passwords.
4. Add owner-approved email notifications with delivery/retry handling, followed by customer accounts if there is a genuine customer workflow.
5. Add catalogue/inventory and payments only after products, pricing, refunds and fulfilment are confirmed.
6. Deployment later: provision database, verify RLS, configure Render/Vercel origins and secrets, test writes and failure handling, then publish. Existing files are preparation, not proof of deployment.

## Limits and open decisions

No auth, payments, email delivery, realtime features, admin dashboard or production deployment is claimed. Devynchi is a technology reference, not a checklist: this project currently reuses the React/Vite direction and database/API concepts, but uses native Node HTTP and Supabase REST rather than Express/Prisma/Socket.IO. Add those tools only when the agreed product actually benefits from them.

The in-memory rate limiter is per instance and groups proxy traffic by socket address; it needs an edge-aware strategy before scaling. The booking API currently has no idempotency key, so users can submit repeat requests. SQLite uses Node's experimental built-in API and is only the development adapter. Production database access and RLS have not yet been tested against a real Supabase project. The catalogue is server-side configuration, not editable in a dashboard.

## Latest correction

The original frontend is restored from the existing repository version, with backend work retained. Booking is available at /book through the navbar and secondary service-card links. The original homepage snapshot continues calculating locally; the backend reading endpoint is separately available and tested. No new editorial art or cream/sage styling is used in the active app. Original business copy and testimonials require an owner review; this correction does not assert those claims are verified.

## Current implementation — continuous royal studio

This section supersedes the earlier visual-direction notes. At the owner's request, home, services, information, tarot, booking, FAQs and the collection invitation are now one scrolling page. Only the shop is separate. Existing standalone URLs redirect to section anchors. The header menu is removed; a narrow progress rail expands to section navigation through hover, tap or keyboard activation.

The logo and title remain, while the ad's cream, royal blue, burgundy and gold form the new palette. `src/journey.css` owns this design layer. `ScrollSection` pauses decorative background motion outside the viewport; reduced-motion preferences disable that motion and smooth scrolling.

Verification: production build, formatting and seven automated tests pass. Browser checks verified desktop layout, mobile layout at 375px and 320px, reading selection into the inline form, a local sample submission returning a saved UUID, Science content controls, and shop search. The tests for Shopify use a mock transport; live Shopify credentials and checkout remain unverified. A first mobile pass caught and corrected intrinsic-width overflow in the zodiac diagram and an invisible hover zone around the navigation panel.

## Opening-section review — November 2026

The opening is being reviewed one section at a time with the owner. Keep the original logo, Playfair headings and Inter body text, cream/navy/gold palette, and prominent free reading. Do not start a new visual identity or redesign the results again. Ask for feedback on the opening before moving to the Kundli services.

- The masthead and pill are the same header. Current sizes and behaviour are described in the next review update; the original larger-logo design was superseded.
- CelestialRings lazy-loads a Three.js scene with three concentric torus meshes, orbiting textured cards, pointer raycasting, desktop rotation and horizontal touch dragging. Hover and explanations do not pause the animation. The scene caps pixel density/frame rate and stops animating offscreen, in hidden tabs and for reduced motion. The select control offers keyboard access and a fallback when WebGL is unavailable. No Blender asset is required.
- The free reading requires only a birth date. Explain why it is needed and that it is calculated in the browser without sending or saving it. Closing clears the date. Preserve the original stacked, dark results, with real calendar validation, conventional tropical sign ranges, and digit-sum numerology that preserves 11, 22 and 33. The method disclosure shows the input-derived arithmetic. This is not a Vedic chart or a planetary-position calculation.
- Regression tests cover every day in a leap year, master-number reductions, isolated result data, and 3D hit detection after rotation/translation and occlusion. Build output includes a separate, lazy-loaded WebGL chunk; assess its cost on real lower-end phones before production.

## Navigation and content refinement — November 6, 2026

The owner expanded this pass to the section order and repeated content. The main page now runs: opening → tarot → Kundli services → shop invitation → science → booking → questions. Keep the shop as a separate page, directly available from the sidebar.

- Header: 38px mark on desktop and 30px on mobile, with a serif wordmark matching the titles. Contact (with the WhatsApp symbol) and Book are visible from the top on both pages. There is no current-section text in the middle. Shared service selection still updates the Contact message; active-section tracking remains for the sidebar.
- Tarot and services share one continuous royal background. Tarot text sits left of an animated, right-aligned portrait slot. The local SVG is deliberately a placeholder, not Amanpreet's photograph. Replace public/images/amanpreet-placeholder.svg with an approved portrait when supplied.
- Remove decorative eyebrows, chapter/service numbering, duplicate category labels and filler captions. Preserve service features, prices, form consent, privacy and the truthful shop preview notice.
- RoyalMotion provides small pointer/scroll offsets for the cream backgrounds and a gold cursor halo on fine pointers. It keeps the native cursor, hides the halo on fields and touch devices, stops work when the tab is hidden, and honours reduced motion. Decorative drift is limited to visible sections.
- src/refinements.css owns this refinement. The previous header rules were removed from journey.css and opening.css, rather than layering conflicting header implementations.

## WhatsApp-first public journey — November 7, 2026

This update supersedes earlier statements about the public form, API birth-date calculation and mandatory public-server database configuration. Paid readings now open WhatsApp directly. The retained `#booking` section is a contact hub with a reading selector, WhatsApp, telephone and copy-number fallback. The compact header has Contact and Call, not duplicate WhatsApp actions.

A shared public catalogue now includes tarot alongside astrology, and its bundled first render survives an API outage. Hindi title artwork uses a licensed, self-hosted Devanagari subset. `POST /api/bookings` and `POST /api/readings` return 410; the active server does not collect their payloads or initialize the legacy store. Existing records and migration references are preserved. The free engine remains browser-local with its previous results design.

See [M1 evidence and migration notes](M1-WHATSAPP-HANDOFF.md) for the 24-test, browser, outage and build checks. The broader backend/admin/commerce goal remains active in [the ordered backlog](IMPLEMENTATION-BACKLOG.md).
