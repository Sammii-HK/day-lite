import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';
import { MapPin, Map as MapIcon } from 'lucide-react';
import type { Coordinates } from './lib/daylight';
import 'mapbox-gl/dist/mapbox-gl.css';
interface Props { location: Coordinates; onSelect: (location: Coordinates) => void; token?: string }
export default function MapPanel({location,onSelect,token}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const selected = useRef(location);
  selected.current = location;
  const select = useRef(onSelect);
  select.current = onSelect;
  const [enabled,setEnabled] = useState(false);
  const [status,setStatus] = useState<'idle'|'loading'|'ready'|'error'>('idle');
  useEffect(() => {
    if (!enabled || !token || !host.current) return;
    let disposed = false;
    setStatus('loading');
    import('mapbox-gl').then(({default:mapbox}) => {
      if (disposed || !host.current) return;
      mapbox.accessToken = token;
      const instance = new mapbox.Map({ container:host.current, style:'mapbox://styles/mapbox/dark-v11', center:[selected.current.longitude,selected.current.latitude], zoom:2, projection:{name:'mercator'} });
      map.current = instance;
      marker.current = new mapbox.Marker({color:'#f3be79'}).setLngLat([selected.current.longitude,selected.current.latitude]).addTo(instance);
      instance.on('load',()=>{if(!disposed)setStatus('ready');});
      instance.on('error',()=>{if(!disposed){setStatus('error');setEnabled(false);}});
      instance.on('click',event=>select.current({ latitude:event.lngLat.lat, longitude:((event.lngLat.lng+180)%360+360)%360-180 }));
    }).catch(()=>{if(!disposed){setStatus('error');setEnabled(false);}});
    return () => { disposed=true; marker.current?.remove(); marker.current=null; map.current?.remove(); map.current=null; };
  },[enabled,token]);
  useEffect(()=>{ marker.current?.setLngLat([location.longitude,location.latitude]); },[location]);
  return <section className="map-panel" aria-labelledby="map-heading">
    <div className="panel-heading"><h2 id="map-heading"><MapIcon size={17} aria-hidden="true" />A place in the world</h2><span>Optional map</span></div>
    <div ref={host} className={`map-surface ${enabled?'is-active':''}`} aria-label="Interactive map. Click a point to select coordinates." />
    {!enabled && <div className="map-offline"><MapPin size={30} aria-hidden="true" /><p role="status">{status==='error'?'The map could not load. Your daylight calculations still work.':token?'Explore by map, or keep using the coordinate controls.':'The map is unavailable right now. Choose coordinates below.'}</p><p className="coordinates">{Math.abs(location.latitude).toFixed(4)}° {location.latitude<0?'S':'N'} / {Math.abs(location.longitude).toFixed(4)}° {location.longitude<0?'W':'E'}</p>{token&&<button onClick={()=>setEnabled(true)}>Load interactive map</button>}<small>{token?'The map is provided by Mapbox.':'Sun times are worked out in your browser.'}</small></div>}
    {enabled&&<p role="status" className="map-note">{status==='loading'?'Loading map...':'Click the map to select a point. Coordinate controls also work with a keyboard.'}<button className="text-button" onClick={()=>{setEnabled(false);setStatus('idle');}}>Close map</button></p>}
  </section>;
}
