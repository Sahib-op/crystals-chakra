# M1: WhatsApp-first reading handoff

Implemented 7 November 2026. This is one completed milestone of the active [production plan](PRODUCT-PLAN.md), not a claim of production readiness.

## Business decision and delivered behaviour

The studio requested direct WhatsApp enquiries. Reading buttons now open an ordinary click-to-chat link; the customer chooses whether to send the prefilled message. There is no required website account, personal-data form, calendar selection or reading checkout.

- The opening prioritizes paid readings and retains a prominent free-reading action.
- Tarot is part of the shared catalogue with Amanpreet Kaur. Its price remains `null` until confirmed.
- Each reading links to the configured studio number, with its title and practitioner where available. The header and contact section stay synchronized with the selected reading/query parameter.
- The header offers Contact (WhatsApp) and Call. The contact hub includes the optional reading selector, both contact actions, a visible number and a clipboard/manual fallback.
- The original logo, wordmark, rings, section order, rail and royal palette remain. Hindi title artwork uses a local licensed Noto Serif Devanagari subset, without character splitting. The owner must review this copy before launch.
- No message, consultation or payment is represented as completed on link activation.

## Shared boundary and resilience

`shared/studio.js` contains public approved destinations. `shared/catalog.js` supplies both the API and the bundled first render. `shared/contact.js` permits only configured destination keys, validates international digits, bounds message text, removes control/bidirectional characters and URL-encodes text once. Arbitrary catalogue phone fields cannot replace the studio destination.

The contact flow remains available when the catalogue API is offline. The free date-only reading also works with the API stopped and keeps its existing result presentation. No birth date or customer details are appended to contact messages automatically.

`server/http.js` buffers bounded bytes before strict UTF-8 decoding, preserving Hindi characters split between chunks. JSON requests require the correct content type and object shape; malformed UTF-8/JSON and oversized bodies receive controlled client errors.

## Retiring the old public writes

`POST /api/bookings` and `POST /api/readings` now return HTTP 410 and safe contact links. They do not parse, reflect, persist or queue the submitted personal-data payload. Browser code no longer calls either endpoint. The current public server does not import or instantiate the old consultation store.

Existing data is preserved:

1. Leave any existing ignored `data/chakra.sqlite` file and private Supabase `bookings` table intact. Keep backups access-controlled; never add them to the repository.
2. The legacy `server/store.js` and table definition remain as migration references. Their survival test verifies a synthetic record survives close/reopen, without reading customer records.
3. The upcoming private operations milestone must map legacy IDs, timestamps and status into a versioned migration with row-count/reconciliation evidence. Do not silently discard rows or re-enable the public form.
4. Establish owner-only access, retention and deletion handling for retained records. Old records remain subject to that operational obligation even though new public collection has stopped.
5. After a verified migration and recovery drill, explicitly decide whether the legacy adapter can be removed. No archive deletion is authorized by this milestone.

## Verification

- 24 automated tests pass, covering contact targets, Hindi and special-character encoding, untrusted destinations, catalogue shape, retired routes, origin rejection, archive survival, commerce errors, invalid JSON/media types, byte limits and split UTF-8 characters, plus existing engine and 3D picking regressions.
- Production frontend build and repository formatting pass. The lazy 3D chunk still triggers Vite's size advisory; it remains a measured-performance milestone rather than being hidden by raising the limit.
- Browser checks at 320px and 375px show no horizontal overflow in the contact flow. Contact buttons remain at least 52px high. A narrow-screen wrap was found and corrected.
- Keyboard selection changes the contact reading and header message; Tab reaches the WhatsApp action with a visible focus outline. Copy-number success was observed.
- Legacy `/book?service=bhrigu` redirects to the contact anchor with Bhrigu selected. Tarot/astrology messages and all telephone destinations were inspected without opening calls or sending WhatsApp messages.
- With the owned local API stopped, the bundled paid catalogue/contact links remained present. The free tool produced Capricorn and life path 4 for the synthetic date 2000-01-01. The API was restarted afterward.
- The separate shop still renders its explicit three-item preview with enquiry links and no Buy now actions when Shopify is unset. No merchant account or checkout was used.

These are local browser viewport checks, not physical-phone, deployed-header, load, penetration or provider-sandbox verification. No deployment, GitHub push, real message or payment was performed.
