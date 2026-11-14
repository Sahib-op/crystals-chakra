# Crystals Chakra stack upgrade handoff

Updated 14 November 2026. Work is on `stack-upgrade` in the Sahib-op repository. Git branch names cannot contain spaces.

- Remote: https://github.com/Sahib-op/crystals-chakra
- Base: `3d30757` (production-readiness branch).
- Working checkout: `C:/Users/sahib/Documents/Codex/2026-11-14/use-this-as-the-working-brief/work/crystals-chakra`.
- Original checkout: `C:/Users/sahib/crystals-chakra`.
- Checkpoints: `b22c552` redesign, `6b1f526` prerendering fix, `7155871` loading regression tests, `146aec6` bundle and keyboard changes. See branch HEAD for the final visual adjustments and viewport test.
- The branch is for review. No production deployment or merge was performed.

## Implementation map

- **Stack.** React 19.3.1, Vite 8.3.8, Tailwind 4.3.5 and Motion 14.14.0. Tailwind uses the Vite plugin and scans application source. The legacy theme tokens are explicitly loaded. Public routes are prerendered with synchronous React components in `src/entry-server.jsx`. Browser route chunks are still lazy.
- **Appearance.** The footer's “Explore the look” controls Royal Blue, Saffron & Plum, and Forest & Ivory. It can swap Info and Collection, and saves both choices in the current browser. Booking remains beneath the reading cards.
- **Opening and navigation.** `index.html` and `public/intro.js` own the text-first gateway. Click, scroll and touch use the same transition. `CelestialRings.jsx` and `celestial/createScene.js` own the tarot-only 3D object and card selection. The explanation links to About Astrology. Touch devices have card buttons and an optional 3D mode. The cursor module only loads on eligible desktops. The header keeps its typography during the morph and has no progress bar. Section boundaries use animated diyas.
- **Readings.** `Home.jsx` uses a responsive package grid and an always-visible booking panel under it. Existing WhatsApp and telephone links handle enquiries. The Hindi line is set separately in Devanagari, and the portrait enters slowly once per page visit. The repository's existing portrait placeholder is retained.
- **Info.** The home section includes card meanings, a glossary and a short FAQ. `/how-readings-work` has the booking process, preparation, and the full FAQ. Legacy links for readings, booking and About Astrology still resolve.
- **Loading.** The confirmed layout bug was the short fallback leaving insufficient space for the route while its code or data arrived. `PageLoading.jsx`, Shop and Studio now reserve space and put loading copy near the relevant content. Delayed API tests reproduce the wait locally. The live latency was not measured. Shopify requests and the Studio config/session flow are potential contributors.
- **Touch forms.** `KeyboardViewport.jsx` uses `visualViewport` to keep an active field in view and size the reading dialog to the visible area. The viewport simulation verifies focus and access to the submit action. Pinch zoom keeps browser control.

## Verification

- Production build and prerender, type checking, generated contract check, and 62 Node tests passed.
- Edge desktop and mobile emulation cover the opening, reading/booking, responsive accessibility, CSP, persisted appearance, delayed Shop/Studio responses, no mobile cursor download and keyboard-sized dialog. Desktop skips touch-only checks.
- Entry JS is 132.6 KiB gzip against 140 KiB. Entry CSS is 24.1 KiB gzip against 25 KiB. Three.js stays out of the initial bundle.
- Visually reviewed desktop WebGL and mobile fallback, Tarot typography and dividers. Confirmed card selection and the About Astrology link. A physical phone is still needed to check actual system keyboard behavior. Production network timings were outside the local replay.

To resume, check out `stack-upgrade`, run `npm ci`, then `npm run build`, `npm run check:budget`, and `npm test`. For this Windows machine, set `$env:PLAYWRIGHT_CHANNEL = 'msedge'` before `npm run test:e2e -- --workers=2`. Playwright's bundled Chromium download timed out and installed Edge worked.

## Skills and plugins

Installed and used the [Vite skill](https://github.com/antfu/skills/tree/main/skills/vite) and [official Motion skill](https://github.com/motiondivision/ai-kit/tree/main/plugins/motion/skills/motion) from GitHub. Also used the available Sites, React and web interface guidance. The app surfaced GitHub and Vercel as useful plugins, but installation or account connection was not confirmed. The branch push used the existing Git configuration.
