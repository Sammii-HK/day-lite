import { describe, expect, it, vi } from 'vitest';
import { fitGlobeZoom, fogForScheme, frameThrottle, MAP_STYLES, sameCoordinates, styleForScheme, toCoordinates, wrapLongitude } from '../lib/map';

describe('map helpers', () => {
  it('maps the colour scheme to a Mapbox style', () => {
    expect(styleForScheme('light')).toBe('mapbox://styles/mapbox/light-v11');
    expect(styleForScheme('dark')).toBe('mapbox://styles/mapbox/dark-v11');
    expect(new Set(Object.values(MAP_STYLES)).size).toBe(2);
  });
  it('gives each scheme an atmosphere in the page colours, with stars only at night', () => {
    expect(fogForScheme('light')['space-color']).toBe('rgb(244, 241, 235)');
    expect(fogForScheme('dark')['space-color']).toBe('rgb(15, 23, 29)');
    expect(fogForScheme('light')['star-intensity']).toBe(0);
    expect(fogForScheme('dark')['star-intensity']).toBeGreaterThan(0);
  });
  it('normalises globe positions to valid, rounded coordinates', () => {
    expect(wrapLongitude(190)).toBe(-170);
    expect(wrapLongitude(-540)).toBe(-180);
    expect(toCoordinates({ lat: 51.476912345, lng: 360.0005 })).toEqual({ latitude: 51.4769, longitude: 0.0005 });
    expect(toCoordinates({ lat: 95, lng: -0.00001 })).toEqual({ latitude: 90, longitude: 0 });
    expect(Object.is(toCoordinates({ lat: -0.00001, lng: 0 }).latitude, -0)).toBe(false);
    expect(sameCoordinates(null, { latitude: 1, longitude: 2 })).toBe(false);
    expect(sameCoordinates({ latitude: 1, longitude: 2 }, { latitude: 1, longitude: 2 })).toBe(true);
  });
  it('sizes the globe to the free space, within sensible zoom limits', () => {
    expect(fitGlobeZoom(948, 846)).toBeGreaterThan(fitGlobeZoom(390, 280));
    expect(fitGlobeZoom(948, 846)).toBeCloseTo(Math.log2((846 * 0.8 * Math.PI) / 512));
    expect(fitGlobeZoom(0, 0)).toBe(0.3);
    expect(fitGlobeZoom(10000, 10000)).toBe(2.6);
  });
  it('throttles to one call per frame with the latest value, and can cancel', () => {
    const frames: Array<() => void> = [];
    const cancel = vi.fn();
    const callback = vi.fn();
    const throttle = frameThrottle<number>(callback, run => frames.push(run), cancel);
    throttle.push(1); throttle.push(2); throttle.push(3);
    expect(frames).toHaveLength(1);
    frames.shift()!();
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(3);
    throttle.push(4);
    throttle.cancel();
    expect(cancel).toHaveBeenCalledWith(1);
    throttle.push(5);
    expect(frames).toHaveLength(2);
  });
});
