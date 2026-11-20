# Day Lite

A browser daylight explorer built with React, TypeScript, Vite, Astronomy Engine and coordinate-based civil time zones. This local candidate extends the original one-day sketch; it has not been released.

Choose latitude, longitude and a local date. The solar calculation runs on the device, with sea-level/standard-refraction rise and set estimates. It integrates daylight within the selected civil day, including daylight-saving changes, repeated midnight and polar day/night. Missing events stay missing rather than becoming the current time. These are model estimates, not weather/terrain observations.

The local clock refreshes independently of map movement. Coordinate controls and public example places work with a keyboard and without a map or geolocation permission. An optional Mapbox map is loaded only by an explicit action when configured; clicking selects coordinates. Its loading/error path preserves the calculator and cleans up map resources. No custom terminator, weather service or live location tracking is implemented.

## Checks

```sh
yarn install --ignore-scripts --frozen-lockfile
yarn lint
yarn test
yarn build
```

Normal lint and build include the canonical Lucide source gate; normal test includes all 11 shared icon regressions and the actual solar/UI tests. Typed degree notation, chart intervals and numeric data remain domain content. UI icons use Lucide.

For the labelled offline local review, build with an explicitly empty map token and run the static-only server:

```sh
VITE_MAPBOX_KEY= yarn build
node scripts/review.mjs
```

It serves compiled assets on 127.0.0.1:4838 with `connect-src 'none'`, no APIs and no runtime/private data. Map contracts are tested with injected mocks. No configured Mapbox, real geolocation, map permission, provider or external data transmission is claimed by this review.

The original screenshots in `public/` remain historical assets. Current evidence and limitations are in `docs/quality/product-review-20261120.md`.
