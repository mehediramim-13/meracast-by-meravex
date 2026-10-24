# MeraCast polish — progress

Last updated: 2026-10-23

## Verification snapshot

- `npm run typecheck`: passing.
- `npm test`: 45 passed, 2 search-dialog tests failing because the geolocation hook mock did not return `reset`; fixed after this snapshot (re-run pending).
- `npm run lint`: pending.
- `npm run build` / production + installed-PWA QA: pending.

## Lettered checklist

| Item | Status | Notes |
| --- | --- | --- |
| A. Previous work + final verification | PARTIAL | 47 tests exist (42 before this pass + 5 geolocation). Typecheck passes. Production build, lint and real-browser/PWA QA still pending. |
| B. Typography/design tone | DONE | Self-hosted Plus Jakarta Sans, Inter, Hind Siliguri and Noto Sans Bengali are wired; serif display removed in the earlier pass. Needs final visual check only. |
| C. Existing footer credits | DONE | Single footer has “Developed by Ramim” and “Powered by MeraVex” links, stagger fade/slide, English names in Bangla mode, safe-area padding above bottom nav. Needs final visual check. |
| D. Search focus/debounce regression | PARTIAL | Input focus and full-query typing were already fixed; pending re-run after adding geolocation session reset. Regression test exists. |
| E. Shared gauge | DONE | `components/ui/ring-gauge.tsx` is shared by confidence and AQI. 128px AQI / 124px confidence, 6.5% stroke, 12–16px inset, 22% value, 11% label, long AQI short label + wrapping. Tests: confidence gauge; AQI values not covered by automated tests yet. |
| F. Minute nowcast | DONE (logic) / PARTIAL (visual) | HTML axis aligned to real 15-minute ticks, edge/middle alignment, responsive 5/3 labels, combined Now/120 row, 96px wet chart, 64px dry strip, shared StatBox metrics. Needs 360px/Bangla visual QA. |
| G. Favorites hearts | PARTIAL | Shared `FavoriteButton` used in search results, Recent, Favorites, hero, header and planner. Store now uses shared `samePlace`, returns add/remove/limit statuses, supports undo. Global toast mounted. Needs tests and real-browser QA. |
| H. Playbook cards | DONE (code) / PARTIAL (visual) | All 12 indices use one `PlaybookCard`, 2/3-column grid, More divider/collapse, 40ms stagger, hover lift; `xl:auto-rows-fr` removed so the card fits content. Needs 360px/Bangla visual QA. |
| I. Shared card system + overflow | PARTIAL | Shared `Card` alias, `StatBox`, GlassCard padding normalized to 16/20/24. Remaining outliers: settings custom section, hero metric tile, planner compare/result, sun/astronomy tiles, hourly segmented control, daily fixed tracks, astronomy Bangla labels. |
| J. Geolocation + PWA updates | PARTIAL | `lib/geolocation.ts` now has typed errors, exact low-accuracy options and 5 tests. Hook has permission check, timeout/unavailable distinction, abort/reset, console.error, reverse-geocode “Your location” fallback and device timezone. Search uses fixed-height button, spinner, inline error, last-city fallback and stale-request guard. Service worker caches and write failures updated; registration/update banner still needs the rewrite. Production + installed-window QA pending. |

## Decisions recorded

- AQI long category uses the shorter in-ring label `Sensitive`; the full category remains beside the ring.
- Dry nowcast is a 64px baseline strip with a short localized “Dry” message; wet chart is 96px plus a 16px axis.
- Favorites use one store tolerance (`samePlace`, 0.02°) and one visible `FavoriteButton` with toast/undo.
- Installed-PWA fallback uses the last used city (allowed alternative to an IP lookup), labeled explicitly.
- Dashboard equal-row stretching was removed rather than forcing every widget to fill a fixed row.

## Remaining work order

1. Re-run search-dialog tests after the mock fix.
2. Rewrite `ServiceWorkerRegister` update detection/reload guard; finish SW cache hardening QA.
3. Card-system overflow pass (hourly segmented control, daily tracks, astronomy tiles, settings time inputs, hero/planner stat tiles).
4. Add coverage for AQI gauge labels/values and favorite store semantics if practical.
5. Lint, build, production server, normal + installed PWA at 360/768/1280, EN/BN.
6. Update this file after each item.
