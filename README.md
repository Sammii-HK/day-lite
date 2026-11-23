# Day Lite

[Live site](https://day-lite.vercel.app)

Day Lite shows sunrise, sunset and the hours of daylight for any place and date.

Pick an example place, type coordinates or open the map and click a point. Choose a date, or stay on today. Times are shown in the place's own time zone, daylight saving included, and days when the clocks change, polar day and polar night are all handled.

## Built with

- React, TypeScript and Vite
- Astronomy Engine for sunrise and sunset
- tz-lookup and Day.js for time zones
- Mapbox GL for the optional map
- Lucide icons

## Running it

```sh
yarn install
yarn dev
```

The map needs a Mapbox public token in `VITE_MAPBOX_KEY`. Without one, everything else still works.

```sh
yarn test
yarn build
```
