# Contributing to MeraCast

Thanks for taking the time to improve MeraCast. This project is maintained by
MeraVex. It is a proprietary project, not an open-source repository, so please
open an issue or contact the maintainer before starting a large change.

## Before you start

- Search existing issues and pull requests first.
- For a bug, include the browser, viewport, language, reproduction steps and
  whether the app was installed or running in a normal browser tab.
- For a feature, explain the user problem and the smallest useful solution.
- Do not include secrets, API keys, personal location data or analytics in an
  issue, screenshot or pull request.

## Local setup

Requirements:

- Node.js 20 or newer
- npm 10 or newer

```bash
npm install
npm run dev
```

The app runs without environment variables. Copy `.env.example` to
`.env.local` only when you need a custom site URL or verbose provider logs.
Production and PWA testing require a production build:

```bash
npm run build
npm start
```

## Code standards

- Keep TypeScript strict. Do not weaken `strict` or
  `noUncheckedIndexedAccess` to make a change compile.
- Reuse the existing stores, hooks, service layer and UI components before
  adding another abstraction.
- Keep the design language consistent: the sea-glass accent, restrained
  surfaces, existing radii, and the established type scale.
- Prefer transform/opacity animations. Respect `prefers-reduced-motion` and
  the in-app reduced-motion setting.
- Keep English and Bengali copy in sync in `i18n/en.ts` and `i18n/bn.ts`.
- Never introduce a client-side API key, a tracking script or a third-party
  font loaded from a CDN.
- Keep server route handlers validated and cached consistently with the
  existing Open-Meteo adapter.
- Do not cache HTML in the service worker. Navigation must remain network-only
  with the inline offline fallback.
- Do not cache API responses in the service worker; TanStack Query owns the
  app's persisted offline data.

Run the formatter before submitting:

```bash
npm run format
```

## Testing

All changes should pass:

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
```

Add or update tests when you change store behaviour, query state, formatting,
planner logic, accessibility or focus handling. The existing suite uses
Vitest, Testing Library and jsdom. Tests must not depend on the network.

For UI changes, also check the relevant production build in a real browser at:

- 1440px desktop
- 768px tablet
- 360px mobile
- English and Bengali
- light and dark themes
- reduced motion enabled

For PWA or service-worker changes, test at minimum:

1. A normal production reload with an existing worker.
2. Install or update a waiting worker and confirm the update prompt.
3. A failed navigation with the network offline; the inline offline page must
   appear and must not request stale CSS or JavaScript.
4. That development mode unregisters the worker and clears MeraCast caches.

## Documentation and screenshots

- Update `README.md` and `README.bn.md` together when user-facing behaviour
  changes.
- Replace the live-demo placeholder only with a verified deployed URL.
- Screenshots must come from a real production build. Put them in
  `docs/screenshots/` and keep sample favorites clearly non-personal.
- Attributions for Open-Meteo, RainViewer, OpenFreeMap, Nominatim and
  OpenStreetMap must remain in the README and in the app where required.

## Pull requests

A focused pull request is easier to review than a large mixed change. Include:

- the problem and the chosen fix;
- screenshots for visible UI changes;
- the commands you ran and their results;
- any known limitation or follow-up;
- a note if the change affects the service worker, offline data or the
  persisted-location schema.

By submitting a contribution, you confirm that you have the right to submit
the work and agree that it may be used in MeraCast under the project's existing
terms. Do not submit third-party code or assets unless their license is
compatible and the attribution is included.

## Security and privacy

MeraCast stores preferences and saved places locally in the browser. Keep it
that way unless a change has been explicitly discussed. Report a security or
privacy concern privately to the maintainer rather than opening a public issue
with sensitive details.
