# Crystals Chakra — stack upgrade handoff

Work in progress, 14 November 2026. This file will be updated with final verification and commit details.

## Repository and branch

- Original checkout: `C:/Users/sahib/crystals-chakra` (left untouched).
- Isolated working checkout: `C:/Users/sahib/Documents/Codex/2026-11-14/use-this-as-the-working-brief/work/crystals-chakra`.
- Remote: `https://github.com/Sahib-op/crystals-chakra.git`.
- Branch: `stack-upgrade` (Git cannot accept the requested space in “stack upgrade”).
- Base: `3d30757`, latest local/remote production-readiness branch.
- Existing commit identity: Sahib Singh, `sahib.devx@gmail.com`.

## Scope and progress

- Dependencies installed: React/React DOM 19.3.1, Vite 8.3.8, React plugin 6.3.0, Tailwind/Vite plugin 4.3.5, Motion 14.14.0; React types 19.3.0.
- Tailwind uses native Vite integration and retained explicit legacy theme config. Removed obsolete direct PostCSS/autoprefixer pipeline.
- External skills installed: `antfu/skills/skills/vite`, `motiondivision/ai-kit/plugins/motion/skills/motion`; existing React and UI guidelines also read.
- GitHub and Vercel plugin installation/connection suggested but NOT confirmed. Git CLI remains usable through existing credential manager; no credential contents accessed.
- Parallel implementation: text intro/cursor/3D/header/dividers; readings/booking/Info/full guide; loading/timeouts/mobile keyboard.
- Root integration: AppearanceProvider (3 palettes and Info/Collection order), stable flex page shell, dedicated guide route/prerender/sitemap, actual-order section tracking, React 19 inert boolean fix, bundled reading content before live updates.

## Remaining at this checkpoint

- Complete parallel file edits and integrate CSS load order.
- Run typecheck, contract check, Node tests, production build and bundle budget.
- Update and run desktop/mobile browser tests, including slow loads, theme persistence, intro scroll, no mobile cursor download, FAQ links and booking placement.
- Visually inspect desktop and mobile previews.
- Fix any failures, document measured versus inferred performance findings, commit/push requested branch, export final source and patch here.

## Constraints for the next agent

- Do not overwrite the original checkout or merge/deploy production. User requested a new branch for this work.
- Preserve existing real WhatsApp booking, Shopify commerce and Studio auth boundaries. No database schema changes are needed.
- Preserve business facts as currently configured; do not invent prices, fulfillment/refund guarantees, medical outcomes or testimonials.
- Working tree is shared with active subagents; inspect task status before editing their owned files.
- Use `motion/react`; do not re-add direct `framer-motion` dependency.
- User expects complete work and a copyable handoff if context runs short.

## Checkpoint update — committed and pushed

- `b22c552` is committed and pushed to `origin/stack-upgrade` (confirmed remote push).
- All parallel edits were captured; all three agents subsequently hit usage limits.
- Type checking passed after integration. Node tests passed with loopback permission (sandbox-only failures were EACCES network restrictions).
- Fixed generated-contract check to normalize Windows CRLF; contracts check passes.
- React 19 streaming/static prerenderers emitted Suspense repair scripts. Current fix uses synchronous `renderToString` with public route components passed explicitly through AppShell only in entry-server.jsx. Client routes remain lazy. Build now passes for /, /shop, /policies, /how-readings-work.
- CSS imports consolidated in main.jsx after legacy styles for reliable new-style precedence.
- Existing E2E expectations updated for clickable intro text and revised heading; new guide included.
- Browser download timed out. Installed Edge is being used with `PLAYWRIGHT_CHANNEL=msedge`; config supports this optional environment variable. Browser suite running at this checkpoint.
- Bundle budget remains failing: entry JS about 147.2 KiB gzip vs 140 KiB, CSS about 26.3 KiB vs 25 KiB. Do not silently raise budgets. Need reduce payload or explicitly document remaining regression.
- Need additional delayed-loading/theme/mobile-cursor tests and visual QA. No production deployment or merge done.

## Verification checkpoint

- `6b1f526` fixed the production prerender and was pushed. The following commit adds guide contrast fixes and upgrade regression tests.
- `npm test`: 62 passed. Type checking, generated-contract validation and production build passed.
- Existing Edge regression suite: 32 passed, then both guide contrast failures passed on targeted rerun. New upgrade suite: 7 passed and 1 desktop-only skip for a touch-only test. The new checks cover delayed API responses, appearance persistence, booking placement and no mobile desktop-cursor request.
- Run the test suite in this workspace with `$env:PLAYWRIGHT_CHANNEL = 'msedge'; npm run test:e2e -- --workers=2` after `npm run build`. The Playwright Chromium download timed out, but Edge is installed.
- The original intermittent production latency was not measured. Source proves a short route fallback caused the footer to jump, and delay injection verified the new layout. Shopify and the Studio configuration/auth chain can contribute to waits. Physical mobile keyboard and visual 3D review still need verification.
- Remaining work: bring the production bundle under the existing budget, visually review the redesign, and verify the physical keyboard behavior. Do not interpret the front-end changes as a production deployment.

## Production build and full browser run
- Entry JavaScript 132.6 KiB gzip against 140 KiB. Entry CSS 24.0 KiB gzip against 25 KiB. Budgets pass with their original limits. Three.js remains lazy.
- 41 browser tests passed and the touch-only test was skipped on desktop as intended. The run used the production build on installed Edge with desktop and mobile emulation.
- The latest keyboard adjustment also sizes and positions the reading dialog inside the visual viewport. A physical-device keyboard check remains open.
