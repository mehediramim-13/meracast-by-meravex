# MeraCast

**Know before the clouds do.**

[**English**](README.md) · [বাংলা](README.bn.md)

MeraCast is a bilingual (English / বাংলা) weather studio by MeraVex. It combines live conditions, a 48-hour outlook, a 16-day forecast, air quality, astronomy, animated radar and a purpose-built Rain Planner in a quiet, cinematic interface.

Built with Next.js 14 App Router, strict TypeScript, Tailwind CSS, Framer Motion, Recharts, MapLibre GL, Zustand and TanStack Query. No API keys, accounts or trackers are required.

> **Live demo:** _https://meracast-by-meravex.vercel.app/_ Deployment steps are documented below.

## Screenshots

| Weather dashboard | Rain Planner |
| --- | --- |
| ![MeraCast weather dashboard](docs/screenshots/home-desktop.png) | ![MeraCast Rain Planner](docs/screenshots/rain-planner-desktop.png) |
| **Live radar** | **Quick location switch** |
| ![MeraCast live radar](docs/screenshots/radar-desktop.png) | ![MeraCast quick location switch](docs/screenshots/location-quick-switch.png) |

<p align="center">
  <img src="docs/screenshots/home-mobile.png" width="320" alt="MeraCast on a mobile screen" />
</p>

Screenshots are from the production build in this repository and use a sample set of saved locations.

---

## Features

### Forecast and live weather
- Current conditions with a custom animated weather icon and scene system.
- 48-hour hourly forecast, including a lazy-loaded temperature and rain chart.
- 16-day daily forecast with temperature range bars and expandable detail.
- Air quality (European AQI), pollutant breakdown and health guidance.
- Sunrise, sunset, golden hour, blue hour, daylight length, moon phase and illumination.
- "Then & now" comparison against historical weather for the same date.
- Location-aware weather scene: clear, rain, storm, snow, fog, wind and night variants.
- Derived lifestyle suggestions for clothing, exercise, photography, travel and more.
- MeraCast advisories for heavy rain, storms, dangerous heat, wind and low visibility.

### Search and places
- Debounced place search with autocomplete powered by Open-Meteo geocoding.
- Header quick switch for saved places: search, favorites, recents and a pinned home location in one accessible popover or mobile bottom sheet.
- Favorites and recent searches, persisted locally; favorites can be reordered by drag or with move controls while the home location stays first.
- Browser geolocation with graceful permission and timeout handling.
- Map-based location picker with reverse geocoding.
- Shareable URLs for any place; Dhaka is the default fallback.

### Rain Planner
- Pick a place, date, time and activity.
- Plain-language answer: **yes / likely / unlikely / no**, plus a go / caution / avoid recommendation.
- Activity-specific thresholds for cricket, picnics, weddings, commutes, travel, hiking, photography, outdoor shoots, fishing and kite flying.
- Three-hour dry-window discovery near the selected moment.
- Date-range analysis with wet-hour and dry-hour counts.
- Confidence score that decays with forecast distance, with explicit low-confidence warnings.
- Compare several candidate moments side by side.
- Downloadable share card and copyable planner link.

### Radar
- Live RainViewer radar frames with play/pause, a scrubber and a keyboard-friendly timeline.
- Dark and light OpenFreeMap vector basemaps with place labels above the radar overlay.
- Smooth frame-to-frame crossfades using dual MapLibre raster layers.
- Radar opacity control, temperature and wind overlays, and a tap-to-inspect weather grid.
- Fullscreen mode, legends, latest-frame metadata and radar signal details.
- Honest empty states when RainViewer does not provide nowcast or satellite frames.

### Personalisation
- English and Bengali interfaces, with optional Bengali numerals.
- Celsius / Fahrenheit, km/h / mph / m/s / kn, mm / in and hPa / inHg.
- 12-hour and 24-hour clocks.
- Light, dark and system themes with no flash on first paint.
- Reduced-motion and performance modes.
- Widget layout customisation with drag reordering, keyboard move controls and per-widget visibility.
- Browser notification rules for rain soon, severe advisories and a morning brief.
- Quiet hours, cooldowns and a test notification.
- Haptic feedback on supported devices.

### PWA, sharing and accessibility
- Installable PWA with manifest shortcuts, maskable icons and an inline offline fallback.
- Build-stamped service worker: network-only navigation, validated static-asset caching, cache cleanup on activation and an explicit update prompt.
- No HTML document is cached by the service worker, so a deployment cannot revive an old shell that points at deleted CSS or JavaScript.
- Offline banner and locally cached weather data; failed navigations get a self-contained offline page that references no app assets.
- Share cards rendered to PNG in the browser.
- Optional browser notifications scheduled only while a tab is open.
- Skip link, semantic landmarks, visible focus rings, focus trapping in dialogs, keyboard shortcuts (`/` for the location switcher, `Ctrl/Cmd+K` for the command palette, `Esc` to close) and reduced-motion support.
- SEO metadata, Open Graph/Twitter cards, JSON-LD, `robots.txt` and a dynamic sitemap.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 14.2 (App Router, React Server Components) |
| Language | TypeScript 5.7, `strict`, `noUncheckedIndexedAccess` |
| Styling | Tailwind CSS 3.4, CSS custom properties |
| Fonts | Self-hosted @fontsource WOFF2 via `next/font/local` |
| Motion | Framer Motion 11, CSS transitions |
| Charts | Recharts 2 |
| Maps | MapLibre GL 4, OpenFreeMap, RainViewer |
| State | Zustand 5 with persisted settings/locations |
| Data fetching | TanStack Query 5 + localStorage persistence |
| Validation | Zod |
| Dates/astronomy | Native `Intl`, `suncalc` |
| Share images | `html-to-image` |
| Tests | Vitest + Testing Library + jsdom |

---

## Getting started

### Requirements
- Node.js 20 or newer (developed on Node 26)
- npm 10 or newer

### Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The app works without any environment variables. Copy `.env.example` to `.env.local` only if you want to override defaults:

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | No | Public origin used for metadata, the sitemap and share links. Use no trailing slash. |
| `MERACAST_DEBUG` | No | Set to `1` for verbose provider logs in development. |

### Production build

```bash
npm run build
npm start
```

The service worker and install prompt are intentionally active only in production builds. Test PWA behaviour with `npm run build && npm start` on `localhost` or HTTPS.

### PWA and offline notes

- `npm run build` runs `npm run build:sw` first. The generated worker is stamped with a build version that is also written to `public/version.json`.
- Navigations are always fetched from the network. HTML documents are never stored in the service worker cache. If a navigation fails, the worker returns a small, self-contained offline page with inline styles.
- Hashed Next.js assets, fonts, icons and the manifest are cached cache-first after a successful response with the expected MIME type. Old MeraCast caches are deleted when a new worker activates.
- API responses are not cached by the service worker. TanStack Query keeps a separate, bounded local cache for offline weather reads.
- A new build is picked up while the app is open. The interface shows an update prompt; activating it swaps the worker, clears old caches and reloads once.
- In development the registration component unregisters any existing worker and clears MeraCast caches, so a production worker cannot mask local changes.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build. |
| `npm start` | Serve the production build. |
| `npm run lint` | Run ESLint (`next/core-web-vitals`). |
| `npm run typecheck` | Run `tsc --noEmit` in strict mode. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run format` | Format with Prettier, including Tailwind class sorting. |
| `npm run format:check` | Verify formatting without writing. |
| `npm run fonts` | Copy the self-hosted WOFF2 subsets from `@fontsource` into `app/fonts` (also runs before `dev` and `build`). |
| `npm run build:sw` | Generate `public/sw.js` and `public/version.json` for the current build (also runs before `build`). |
| `npm run icons` | Regenerate app icons and the Open Graph image with Sharp. |

---

## Project structure

```text
app/
  api/                 Cached route handlers (weather, air, geocode, radar, history, grid, reverse)
  city/[slug]/         Shareable city forecast page
  radar/               Radar experience
  rain-planner/        Rain Planner experience
  settings/            Preferences, notifications, install and privacy
  offline/             Offline experience route (the service worker also has an inline fallback)
  fonts/               Generated WOFF2 subsets copied from @fontsource
  layout.tsx           Fonts, metadata, providers and app chrome
  globals.css          Design tokens, base styles and motion utilities
components/
  brand/               MeraCast mark and wordmark
  charts/              Lazy-loaded Recharts chart
  command/             Command palette
  dashboard/           Forecast, air, sun, history, astronomy and lifestyle cards
  effects/             Animated weather scenes
  layout/              Sidebar, header, quick location switch, footer, bottom nav and offline banner
  maps/                MapLibre location picker
  planner/             Rain Planner UI, comparison and share card
  providers/           Query, i18n, theme and store hydration providers
  pwa/                 Install prompt, service-worker registration, offline UI
  radar/               Radar map and timeline UI
  search/              Place search dialog
  settings/            Settings and widget customiser
  share/               Weather share modal
  ui/                  Buttons, cards, modal, controls, tooltips and states
  weather/             Weather detail panel and animated icons
docs/screenshots/      Production screenshots used by the READMEs
hooks/                 Query, formatting, theme, haptics, geolocation, notifications
i18n/                  Typed English and Bengali dictionaries
lib/
  api/                 Provider contract, Open-Meteo adapter, Zod schemas, server fetch
  alerts.ts            Threshold-derived advisories
  format.ts            Locale, numeral, date and unit formatting
  rain-planner.ts      Planner scoring, windows, confidence and URL state
  nowcast.ts           Minute-level nowcast state machine
  indices.ts           Lifestyle indices
  summary.ts           Human-readable forecast summaries
  sun.ts               Astronomy and moon phase
scripts/               Font sync, service-worker generation, icons and font-manifest repair
store/                 Zustand stores for settings, locations, UI and scene
tests/                 Unit tests and weather fixtures
types/                 Shared domain types
public/                Manifest, generated worker, version marker, icons and OG image
```

---

## Data sources

MeraCast uses only keyless, open services:

- **Open-Meteo** — forecast, hourly/daily data, 15-minute precipitation, air quality, geocoding and historical archive.
- **RainViewer** — radar frames and tile imagery. RainViewer radar tiles are requested up to zoom 7; MapLibre overzooms beyond that to avoid unsupported source tiles. Satellite and nowcast frames are shown only when the API actually returns them.
- **OpenFreeMap** — vector basemaps (`dark` and `positron` styles). No tile key required.
- **Nominatim** — reverse geocoding for map-picked coordinates, with a descriptive user agent.

Weather, air quality, geocoding, history, radar-index and grid requests pass through cached Next.js route handlers. Responses are validated with Zod and normalised before reaching the UI. On the client, TanStack Query caches successful responses for eight minutes and persists a bounded cache for offline reads. The radar map loads RainViewer tile images and OpenFreeMap basemap styles directly in the browser.

### Data correctness notes

- Rain probability is probabilistic, not a guarantee. The planner's confidence score explicitly decreases with forecast horizon.
- MeraCast advisories are **derived from forecast thresholds** and are not official CAP warnings or government alerts. They are labelled as MeraCast advisories in the UI.
- The planner uses the 16-day hourly horizon returned by Open-Meteo. Dates outside that horizon are rejected rather than extrapolated.
- RainViewer nowcast/satellite arrays can be empty depending on region and time; the UI disables those controls instead of inventing data.
- Historical comparisons use the Open-Meteo archive for the same calendar date across the previous five years, showing last year's reading alongside the five-year normal.

---

## Design and performance

- Calm, minimal visual system: one muted sea-glass accent, neutral surfaces, soft borders, consistent radii and restrained shadows.
- Plus Jakarta Sans (500–800) for headings, navigation, buttons and labels; Inter (400–600) for body and UI text. Numeric values use Inter with tabular figures.
- Bengali body text uses Hind Siliguri with Noto Sans Bengali as fallback and a 1.7 line-height.
- All four families are self-hosted through `@fontsource` and `next/font/local`. Latin families are preloaded, Bengali subsets load on demand, every face uses `font-display: swap`, and generated fallback metrics prevent layout shift.
- `npm run fonts` copies the required WOFF2 subsets into `app/fonts`; `predev` and `prebuild` run it automatically.
- On Windows, `postbuild` repairs Next's empty local-font manifest so the two Latin preload headers are emitted, and adds the same preload tags to pre-rendered pages; Linux and macOS builds populate the manifest during the build.
- Transform/opacity-only motion, soft presses and 200–400 ms eased transitions.
- Viewport reveal animations use Framer Motion while respecting `prefers-reduced-motion` and the in-app reduced-motion setting.
- Performance mode disables canvas-heavy effects, radar autoplay and other expensive motion.
- Maps and charts are dynamically imported so they never block first paint.
- The weather scene is lazy-loaded and paused when reduced motion is requested.
- PWA caching is restricted to validated hashed assets, fonts, icons and the manifest. HTML navigations are network-only with a self-contained inline offline page; API payloads stay under TanStack Query's bounded persisted cache.
- All interactive controls are keyboard reachable, with visible focus rings and focus trapping in modal dialogs.
- Bottom navigation includes safe-area padding so the footer and actions are never obscured on mobile.
- Footer credit links fade and slide in once when scrolled into view, staggering “Developed by Ramim” and “Powered by MeraVex” by 150 ms. The animation is disabled under reduced motion.

---

## Tests

```bash
npm test
npm run typecheck
npm run lint
```

The Vitest suite covers:

- locale formatting, Bengali numerals, unit conversions and date helpers
- weather-code and response schema validation
- nowcast transitions and summary states
- threshold-derived advisories
- Rain Planner verdicts, activity thresholds, windows, confidence decay and URL parsing
- saved-location persistence, v1-to-v2 migration, home pinning and reorder rules
- quick-switch focus management, search, favorites, home selection and keyboard reorder

Tests use deterministic UTC fixtures that mirror the 16-day Open-Meteo horizon. No network access is required.

---

## Deployment

The app deploys cleanly to Vercel, Netlify or any Node.js host that supports Next.js 14.

1. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin (for example `https://meracast.example.com`).
2. Run `npm run build`.
3. Serve with `npm start` or the platform's Next.js adapter.
4. Serve over HTTPS so geolocation, notifications, installation and the service worker work in all browsers.
5. Add the live URL to the placeholder at the top of this README.

No secret keys or database are required. All user preferences stay in `localStorage`.

---

## Privacy

MeraCast has no accounts, analytics, cookies or advertising trackers. Favorites, recent searches, units, theme, widget layout and notification preferences are stored locally in the browser. Weather, air quality, geocoding, history, radar-index and grid requests go to the app's own API routes; those routes call the open data providers listed above. The radar map also loads RainViewer tiles and OpenFreeMap basemaps directly from the browser. Clearing the weather cache in Settings removes persisted forecasts and search history from the device.

---

## Limitations

- Notifications are scheduled by an open tab. There is no background push server, so closing the tab stops reminders.
- PWA installation behaviour depends on browser support; iOS requires Safari's Share → Add to Home Screen flow.
- Reverse geocoding depends on Nominatim availability and rate limits.
- Radar imagery is limited by RainViewer's public tile zoom and frame availability.
- Forecast accuracy and advisory thresholds are inherently uncertain; always follow official local meteorological guidance for dangerous weather.

---

## Credits

Designed and built by MeraVex. Developed by [Ramim](https://mehedi-hasan-ramim.vercel.app/).

Weather data by [Open-Meteo](https://open-meteo.com). Radar by [RainViewer](https://www.rainviewer.com). Basemaps by [OpenFreeMap](https://openfreemap.org). Reverse geocoding by [Nominatim](https://nominatim.org). Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).

Contributions are covered in [CONTRIBUTING.md](CONTRIBUTING.md). Licensing terms are in [LICENSE](LICENSE).

© 2026 MeraVex. All rights reserved.
