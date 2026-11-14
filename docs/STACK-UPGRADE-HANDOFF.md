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
- **Production design.** User requested removal of the experimental appearance controls. Royal blue is the fixed palette, and About Astrology precedes Collection. The palette/order provider, persistence and alternate palette CSS have been removed. Prior saved preferences are ignored. Future design changes come from the user directly.
- **Opening and navigation.** `index.html` and `public/intro.js` own the text-first gateway. Click, scroll and touch use the same transition. `CelestialRings.jsx` and `celestial/createScene.js` own the tarot-only 3D object and card selection. The explanation links to About Astrology. Touch devices have card buttons and an optional 3D mode. The cursor module only loads on eligible desktops. The header keeps its typography during the morph and has no progress bar. Section boundaries use animated diyas.
- **Readings.** `Home.jsx` uses a responsive package grid and an always-visible booking panel under it. Existing WhatsApp and telephone links handle enquiries. The Hindi line is set separately in Devanagari, and the portrait enters slowly once per page visit. The repository's existing portrait placeholder is retained.
- **Info.** The home section includes card meanings, a glossary and a short FAQ. `/how-readings-work` has the booking process, preparation, and the full FAQ. Legacy links for readings, booking and About Astrology still resolve.
- **Loading.** The confirmed layout bug was the short fallback leaving insufficient space for the route while its code or data arrived. `PageLoading.jsx`, Shop and Studio now reserve space and put loading copy near the relevant content. Delayed API tests reproduce the wait locally. The live latency was not measured. Shopify requests and the Studio config/session flow are potential contributors.
- **Touch forms.** `KeyboardViewport.jsx` uses `visualViewport` to keep an active field in view and size the reading dialog to the visible area. The viewport simulation verifies focus and access to the submit action. Pinch zoom keeps browser control.

## Verification

- Production build and prerender, type checking, generated contract check, and 62 Node tests passed.
- Edge desktop and mobile emulation cover the opening, reading/booking, responsive accessibility, CSP, fixed layout despite previously saved appearance preferences, delayed Shop/Studio responses, no mobile cursor download and keyboard-sized dialog. Desktop skips touch-only checks.
- Entry JS is 131.9 KiB gzip against 140 KiB. Entry CSS is 23.7 KiB gzip against 25 KiB. Three.js stays out of the initial bundle.
- Visually reviewed desktop WebGL and mobile fallback, Tarot typography and dividers. Confirmed card selection and the About Astrology link. A physical phone is still needed to check actual system keyboard behavior. Production network timings were outside the local replay.

To resume, check out `stack-upgrade`, run `npm ci`, then `npm run build`, `npm run check:budget`, and `npm test`. For this Windows machine, set `$env:PLAYWRIGHT_CHANNEL = 'msedge'` before `npm run test:e2e -- --workers=2`. Playwright's bundled Chromium download timed out and installed Edge worked.

## Skills and plugins

Installed and used the [Vite skill](https://github.com/antfu/skills/tree/main/skills/vite) and [official Motion skill](https://github.com/motiondivision/ai-kit/tree/main/plugins/motion/skills/motion) from GitHub. Also used the available Sites, React and web interface guidance. The app surfaced GitHub and Vercel as useful plugins, but installation or account connection was not confirmed. The branch push used the existing Git configuration.

## Latest correction

Removed the visitor-facing “Explore the look” feature at the user's request. Updated the existing browser test to verify the fixed design when old experimental preferences are present. Production build and bundle budgets passed. The targeted desktop/mobile suite passed 8 checks and skipped 2 touch-only checks on desktop. Verified that old saved preferences have no effect.

## Review pass on `claude/affectionate-rubin-u9vqux` — 14 November 2026

`stack-upgrade` was deleted from GitHub after its last push; its commits were restored by SHA and fast-forwarded onto this branch, so all of the work above is kept. The working brief was then checked item by item against the result.

- **CI:** the only failure was Prettier formatting in `StudioPage.tsx`; fixed.
- **Section breakers (brief: redesign and surprise):** replaced the faint diya row with a toran of light (`RoyalOrnament.jsx`, `experience-motion.css`). Marigold garland swags, brass diyas and marigold tassels; flames flicker with a halo, pendants sway and a glint travels the garland while the section is on screen; static under reduced motion. Section content gained 28 px (desktop) / 30 px (mobile) top clearance, measured to clear the lowest lamp from 320 px to desktop.
- **Reading tabs (brief: more tabs must not throw off positioning):** the three-column grid left a fourth card alone on a second row. Columns now follow the number of readings (up to four on wide screens, three, two, one), incomplete rows are centred, and prices and buttons align at the card bottom. The booking panel still spans the grid.
- **Switchable themes (brief: keep switchable for now):** restored as a hidden design lab. `?lab=1` turns it on in that browser until “Close the lab” (or `?lab=0`); it is also on in local development. Four palettes (royal, saffron & plum, forest & ivory, temple red & gold) and three section orders. Visitors always get the default; saved choices are ignored unless the lab is on; the panel and palette CSS are a separate 2 KB chunk. The header now follows the palette variable (same colour by default).
- **Welcome screen:** restored the pointer-following parallax, gold glow and constellation lines from the earlier version inside the new text-first gateway. Exit now finishes on `animationend` with a timer fallback, and the 3D scene waits for the intro to close (`crystals:intro-closed`) so its long setup task never competes with the exit.
- **Removed feature restored:** the studio email address (formerly in the Questions section) is back in the booking panel.
- **Touch:** the header brand and booking phone link were the only targets under 40 px on a Pixel 7; both are 44 px now (audit: 0 targets under 40 px).
- **Budget:** `check:budget` measured the entry file only. After the upgrade the bundler moved ~38 KB between the entry and a modulepreloaded shared chunk, so the old figure (131.9 KB) understated first-load JS. It now counts entry + preloaded chunks: 149.0 KB gzip (owner's build: 148.0 KB) against a 155 KB budget.
- **Tests:** a design-lab browser test; Playwright limited to two workers because desktop pages render WebGL in software and parallel browsers starved each other's timers (the intro exit test failed only under load).

### Measured

62 Node tests, 23 PostgreSQL tests, 44 browser tests (2 touch-only skips on desktop), contracts, types, formatting, build, budget and audit pass. Lighthouse mobile, local compressed build: welcome screen 84, site 79–84, shop 86, reading guide 91; Accessibility, Best Practices and SEO 100 everywhere. An A/B against the owner's `a15a2da` build under identical conditions gave 83–86 for both, so the drop from the earlier 92–94 came with the upgrade and redesign (first paint 2.6 s → 3.1 s from larger render-blocking CSS and JS), not this pass. Next performance step: critical-CSS inlining or splitting the homepage hydration.

### Plugins

Skill and plugin searches found no organisation skills. From the Anthropic plugin directory, frontend-design, Vercel, Supabase, Design (accessibility review) and Playwright were offered for installation; they need the owner's approval in the app and were not used in this pass.
