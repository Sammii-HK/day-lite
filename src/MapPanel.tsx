import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';
import { Earth } from 'lucide-react';
import type { Coordinates } from './lib/daylight';
import { fitGlobeZoom, fogForScheme, frameThrottle, sameCoordinates, styleForScheme, toCoordinates, type Scheme } from './lib/map';
import { DARK_SCHEME, FINE_POINTER, REDUCED_MOTION, matches, useMediaQuery } from './lib/media';

interface Props {
  location: Coordinates;
  onSelect: (location: Coordinates) => void;
  onHover?: (location: Coordinates | null) => void;
  token?: string;
}
type Status = 'loading' | 'ready' | 'error';

// One full turn every four minutes, until someone touches the globe.
const SPIN_DEGREES = 6;
const SPIN_MS = 4000;

const cssPixels = (element: HTMLElement, name: string) => parseFloat(getComputedStyle(element).getPropertyValue(name)) || 0;
const paddingFor = (element: HTMLElement) => ({ top: cssPixels(element, '--map-pad-top'), right: cssPixels(element, '--map-pad-right'), bottom: 0, left: 0 });

export default function MapPanel({ location, onSelect, onHover, token }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const picked = useRef<Coordinates | null>(null);
  const appliedStyle = useRef('');
  const stopSpin = useRef(() => {});
  const latest = useRef({ location, onSelect, onHover });
  latest.current = { location, onSelect, onHover };
  const scheme: Scheme = useMediaQuery(DARK_SCHEME) ? 'dark' : 'light';
  const schemeRef = useRef(scheme);
  schemeRef.current = scheme;
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!token || !host.current) return;
    let disposed = false;
    let loaded = false;
    let spinning = false;
    const hover = frameThrottle<Coordinates>(value => latest.current.onHover?.(value));
    const teardown = () => {
      hover.cancel();
      marker.current?.remove();
      marker.current = null;
      map.current?.remove();
      map.current = null;
    };
    const fail = () => {
      if (disposed) return;
      setStatus('error');
      teardown();
    };
    setStatus('loading');
    // Start fetching the map straight away, but in its own chunk so the page paints first.
    Promise.all([import('mapbox-gl'), import('mapbox-gl/dist/mapbox-gl.css')]).then(([{ default: mapbox }]) => {
      const container = host.current;
      if (disposed || !container) return;
      mapbox.accessToken = token;
      const fine = matches(FINE_POINTER);
      const padding = paddingFor(container);
      const { width, height } = container.getBoundingClientRect();
      const start = latest.current.location;
      appliedStyle.current = styleForScheme(schemeRef.current);
      const instance = new mapbox.Map({
        container,
        style: appliedStyle.current,
        projection: 'globe',
        center: [start.longitude, start.latitude],
        zoom: fitGlobeZoom(width - padding.left - padding.right, height - padding.top - padding.bottom),
        // The page scrolls on past the globe, so the wheel and one-finger drags scroll; buttons, keys and pinches zoom.
        scrollZoom: false,
        cooperativeGestures: !fine,
      });
      map.current = instance;
      instance.setPadding(padding);
      instance.addControl(new mapbox.NavigationControl({ showCompass: false }), 'bottom-right');
      instance.getCanvas().setAttribute('aria-label', 'Globe. Drag or use the arrow keys to turn it, and click to choose a place.');
      const pin = document.createElement('div');
      pin.className = 'map-pin';
      marker.current = new mapbox.Marker({ element: pin }).setLngLat([start.longitude, start.latitude]).addTo(instance);

      const spin = () => {
        if (!spinning || disposed) return;
        const center = instance.getCenter();
        instance.easeTo({ center: [center.lng - SPIN_DEGREES, center.lat], duration: SPIN_MS, easing: t => t });
      };
      stopSpin.current = () => {
        if (!spinning) return;
        spinning = false;
        instance.stop();
      };
      instance.on('moveend', spin);
      for (const name of ['mousedown', 'touchstart', 'wheel', 'dragstart'] as const) instance.on(name, () => stopSpin.current());

      // Changing colour scheme replaces the style, so reapply what lives on it. The pin is a DOM marker and stays put.
      instance.on('style.load', () => instance.setFog(fogForScheme(schemeRef.current)));
      instance.on('load', () => {
        if (disposed) return;
        loaded = true;
        setStatus('ready');
        spinning = !matches(REDUCED_MOTION);
        spin();
      });
      // Before the first render, any error (a bad token, no WebGL) means no map. After it, the worst is a missing tile.
      instance.on('error', () => { if (!loaded) fail(); });
      instance.on('resize', () => instance.setPadding(paddingFor(container)));

      instance.on('mousemove', event => {
        if (!matches(FINE_POINTER)) return;
        stopSpin.current();
        hover.push(toCoordinates(event.lngLat));
      });
      instance.on('mouseout', () => {
        hover.cancel();
        latest.current.onHover?.(null);
      });
      instance.on('click', event => {
        const point = toCoordinates(event.lngLat);
        stopSpin.current();
        hover.cancel();
        picked.current = point;
        latest.current.onSelect(point);
      });
    }).catch(fail);
    return () => {
      disposed = true;
      stopSpin.current = () => {};
      teardown();
    };
  }, [token]);

  useEffect(() => {
    marker.current?.setLngLat([location.longitude, location.latitude]);
    const instance = map.current;
    // A place clicked on the globe is already in view; one chosen elsewhere is turned to face us.
    if (!instance || sameCoordinates(picked.current, location)) return;
    picked.current = null;
    stopSpin.current();
    const center: [number, number] = [location.longitude, location.latitude];
    if (matches(REDUCED_MOTION)) instance.jumpTo({ center });
    else instance.flyTo({ center, duration: 1800 });
  }, [location]);

  useEffect(() => {
    const instance = map.current;
    const style = styleForScheme(scheme);
    if (!instance || appliedStyle.current === style) return;
    appliedStyle.current = style;
    instance.setStyle(style);
  }, [scheme]);

  useEffect(() => { if (reducedMotion) stopSpin.current(); }, [reducedMotion]);

  const unavailable = !token || status === 'error';
  return <div className="globe-map">
    <div ref={host} className="map-surface" hidden={unavailable} />
    {!unavailable && status === 'loading' && <p className="map-loading" role="status">Loading the globe</p>}
    {unavailable && <div className="map-offline">
      <Earth size={34} strokeWidth={1.4} aria-hidden="true" />
      <p role="status">{status === 'error' ? 'The globe could not load. Your daylight calculations still work.' : 'The globe is unavailable right now. Your daylight calculations still work.'}</p>
      <p className="coordinates">{Math.abs(location.latitude).toFixed(4)}° {location.latitude < 0 ? 'S' : 'N'} / {Math.abs(location.longitude).toFixed(4)}° {location.longitude < 0 ? 'W' : 'E'}</p>
      <a href="#places">Choose a place below</a>
    </div>}
  </div>;
}
