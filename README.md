# Day Lite

[Live site](https://day-lite.vercel.app)

Day Lite shows sunrise, sunset and the hours of daylight for any place and date.

Move over the globe and the sunrise, sunset and daylight follow the pointer; click or tap to pin a place. You can also pick an example place or type coordinates. Choose a date, or stay on today. Times are shown in the place's own time zone, daylight saving included, and days when the clocks change, polar day and polar night are all handled.

## Built with

- React, TypeScript and Vite
- Astronomy Engine for sunrise and sunset
- tz-lookup and Day.js for time zones
- Mapbox GL for the globe
- Lucide icons

## Running it

```sh
yarn install
yarn dev
```

The globe needs a Mapbox public token in `VITE_MAPBOX_KEY`. Without one, everything else still works.

```sh
yarn test
yarn build
```
