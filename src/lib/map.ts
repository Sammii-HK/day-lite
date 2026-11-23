import type { Coordinates } from './daylight';

export type Scheme = 'light' | 'dark';

export const MAP_STYLES: Record<Scheme, string> = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

export const styleForScheme = (scheme: Scheme) => MAP_STYLES[scheme];

// The atmosphere around the globe uses the page colours, so the globe sits on the page rather than in a box.
export function fogForScheme(scheme: Scheme) {
  return scheme === 'dark'
    ? { color: 'rgb(21, 32, 41)', 'high-color': 'rgb(36, 61, 80)', 'horizon-blend': 0.04, 'space-color': 'rgb(15, 23, 29)', 'star-intensity': 0.2 }
    : { color: 'rgb(255, 253, 248)', 'high-color': 'rgb(196, 214, 224)', 'horizon-blend': 0.05, 'space-color': 'rgb(244, 241, 235)', 'star-intensity': 0 };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 1e4) / 1e4 || 0;

export const wrapLongitude = (longitude: number) => ((longitude + 180) % 360 + 360) % 360 - 180;

/** Map coordinates to the app's range, rounded to four places (about 11 metres). */
export function toCoordinates({ lat, lng }: { lat: number; lng: number }): Coordinates {
  return { latitude: round(clamp(lat, -90, 90)), longitude: round(wrapLongitude(lng)) };
}

export const sameCoordinates = (a: Coordinates | null, b: Coordinates) =>
  Boolean(a && a.latitude === b.latitude && a.longitude === b.longitude);

/** A zoom at which the whole globe fills most of the free space. */
export function fitGlobeZoom(width: number, height: number) {
  const diameter = Math.max(1, Math.min(width, height)) * 0.8;
  return clamp(Math.log2((diameter * Math.PI) / 512), 0.3, 2.6);
}

/** Calls back at most once per animation frame, with the latest value. */
export function frameThrottle<T>(
  callback: (value: T) => void,
  schedule: (run: () => void) => number = run => window.requestAnimationFrame(run),
  cancelFrame: (frame: number) => void = frame => window.cancelAnimationFrame(frame),
) {
  let frame: number | null = null;
  let latest: T;
  return {
    push(value: T) {
      latest = value;
      if (frame === null) frame = schedule(() => { frame = null; callback(latest); });
    },
    cancel() {
      if (frame !== null) cancelFrame(frame);
      frame = null;
    },
  };
}
