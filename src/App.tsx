import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, MapPin, Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import MapPanel from './MapPanel';
import { clockTime, Coordinates, duration, GREENWICH, localDate, parseCoordinates, solarDay, timeZoneAt } from './lib/daylight';
import './App.css';
const places = [
  { name:'Greenwich', ...GREENWICH },
  { name:'Tromsø', latitude:69.6492, longitude:18.9553 },
  { name:'Tokyo', latitude:35.6762, longitude:139.6503 },
  { name:'Sydney', latitude:-33.8688, longitude:151.2093 },
];
const degrees = (value:number, positive:string, negative:string) => `${Math.abs(value).toFixed(2)}° ${value<0?negative:positive}`;
export default function App({mapToken=import.meta.env.VITE_MAPBOX_KEY}:{mapToken?:string}) {
  const [location,setLocation] = useState<Coordinates>(GREENWICH);
  const [preview,setPreview] = useState<Coordinates|null>(null);
  const [latitude,setLatitude] = useState(String(GREENWICH.latitude));
  const [longitude,setLongitude] = useState(String(GREENWICH.longitude));
  const [error,setError] = useState('');
  const [dateOverride,setDateOverride] = useState('');
  const [now,setNow] = useState(()=>new Date());
  useEffect(()=>{ const timer=window.setInterval(()=>setNow(new Date()),30000);return()=>window.clearInterval(timer); },[]);
  const select = useCallback((value:Coordinates)=>{setLocation(value);setPreview(null);setLatitude(String(value.latitude));setLongitude(String(value.longitude));setError('');},[]);
  // Hovering the globe previews a place; leaving the globe returns to the pinned one.
  const shown = preview ?? location;
  const zone = useMemo(()=>timeZoneAt(shown),[shown]);
  const date = dateOverride || localDate(now,zone);
  const result = useMemo(()=>{try{return {day:solarDay(shown,date),error:''};}catch{return {day:null,error:'This date could not be calculated in the selected time zone. Choose another date.'};}},[shown,date]);
  const day = result.day;
  const dayLength = day ? (day.end.getTime()-day.start.getTime())/60000 : 1440;
  const isSelectedToday = date===localDate(now,zone);
  const above = day?.intervals.some(i=>now>=i.start&&now<i.end);
  const events = (values:Date[])=>values.length?values.map(value=>clockTime(value,zone)).join(', '):'No event this date';
  const StatusIcon = day?.condition==='continuous-daylight' ? Sun : day?.condition==='continuous-night' ? Moon : !day || day.condition==='unavailable' || !isSelectedToday ? CalendarDays : above ? Sun : Moon;
  const condition = day?.condition==='continuous-daylight'?'Continuous daylight':day?.condition==='continuous-night'?'No sunrise this date':day?.condition==='unavailable'?'Solar events unavailable':isSelectedToday?(above?'Daylight now':'Between sunset and sunrise'):'Selected date';
  return <main id="main">
    <section className="stage" aria-labelledby="title">
      <div className="globe">
        <MapPanel location={location} onSelect={select} onHover={setPreview} token={mapToken} />
        <header className="masthead">
          <p className="wordmark"><Sun size={19} aria-hidden="true" />Day Lite</p>
          <h1 id="title">Follow the daylight.</h1>
          <p className="lede"><span className="pointer-copy">Move over the globe to see sunrise, sunset and the light in between. Click to pin a place.</span><span className="touch-copy">Tap the globe to see sunrise, sunset and the light in between.</span></p>
          <a className="text-link" href="#places">Or choose a place by name or coordinates</a>
        </header>
      </div>
      <section className="results" aria-labelledby="daylight-heading">
        <div className="panel-heading"><h2 id="daylight-heading">The shape of the day</h2><span className={`mode${preview?' is-exploring':''}`}>{preview?'Exploring':'Pinned'}</span></div>
        <div className="place-line">
          <p className="place-coordinates"><MapPin size={15} aria-hidden="true" /><span>{degrees(shown.latitude,'N','S')}, {degrees(shown.longitude,'E','W')}</span></p>
          <p className="live-clock"><Clock3 size={15} aria-hidden="true" /><span className="clock-label">Local time</span><strong aria-label="Current local time">{clockTime(now,zone)}</strong><small>{zone.replace(/_/g,' ')}</small></p>
        </div>
        <div className="duration"><span>Daylight</span><strong>{duration(day?.daylightMinutes??null)}</strong><p className="solar-status" role="status" aria-live={preview?'off':'polite'}><StatusIcon size={17} aria-hidden="true" />{condition}</p></div>
        {result.error&&<p role="alert" className="form-error">{result.error}</p>}
        {day&&<>
          <div className="event-pair"><div><Sunrise size={22} aria-hidden="true" /><span>Sunrise</span><strong>{events(day.rises)}</strong></div><div><Sunset size={22} aria-hidden="true" /><span>Sunset</span><strong>{events(day.sets)}</strong></div></div>
          {day.daylightMinutes!==null&&<div className="day-chart"><svg viewBox="0 0 100 7" role="img" aria-label={`Daylight during ${date}: ${duration(day.daylightMinutes)}. Gold shows sunrise-to-sunset intervals; dark shows the sun below the horizon.`}><rect width="100" height="7" rx="1" fill="var(--night)" />{day.intervals.map((i,index)=><rect key={index} x={(i.start.getTime()-day.start.getTime())/(dayLength*60000)*100} width={(i.end.getTime()-i.start.getTime())/(dayLength*60000)*100} height="7" fill="var(--sunlight)" />)}</svg><div className="chart-labels">{[0,.25,.5,.75,1].map(fraction=><span key={fraction}>{clockTime(new Date(day.start.getTime()+dayLength*60000*fraction),zone)}</span>)}</div><div className="chart-legend"><span><i className="day-key" />Sunrise to sunset</span><span><i className="night-key" />Below horizon</span></div></div>}
          {dayLength!==1440&&<p className="calculation-note">This date lasts {duration(dayLength)} because the clocks change.</p>}
        </>}
        <div className="date-control"><label htmlFor="date"><CalendarDays size={17} aria-hidden="true" />Local date</label><div><input id="date" type="date" min="1900-01-01" max="2100-12-31" value={date} onChange={event=>setDateOverride(event.target.value)} /><button className="text-button" onClick={()=>setDateOverride('')}>Today</button></div></div>
      </section>
    </section>
    <div className="below">
      <section className="location-panel" id="places" aria-labelledby="location-heading"><div className="panel-heading"><h2 id="location-heading">Choose a place</h2><span>Worked out in your browser</span></div><div className="presets" aria-label="Example places">{places.map(place=><button key={place.name} aria-pressed={place.latitude===location.latitude&&place.longitude===location.longitude} onClick={()=>select({latitude:place.latitude,longitude:place.longitude})}>{place.name}</button>)}</div>
        <form onSubmit={event=>{event.preventDefault();try{select(parseCoordinates(latitude,longitude));}catch(cause){setError(cause instanceof Error?cause.message:'Check both coordinates.');}}} noValidate>
          <div className="coordinate-fields"><label htmlFor="latitude">Latitude <span>-90 to 90</span><input id="latitude" inputMode="decimal" value={latitude} onChange={e=>setLatitude(e.target.value)} aria-describedby={error?'location-error':undefined} /></label><label htmlFor="longitude">Longitude <span>-180 to 180</span><input id="longitude" inputMode="decimal" value={longitude} onChange={e=>setLongitude(e.target.value)} aria-describedby={error?'location-error':undefined} /></label></div>
          {error&&<p role="alert" id="location-error" className="form-error">{error}</p>}
          <button className="primary" type="submit">Find the light<ArrowRight size={17} aria-hidden="true" /></button>
        </form>
      </section>
      <section className="about" aria-labelledby="about-heading">
        <h2 id="about-heading">How it works</h2>
        <p>Times are in the place's own time zone, daylight saving included. Days when the clocks change, polar day and polar night are all handled.</p>
        <p>Sunrise and sunset are for sea level, so hills and weather can shift them. Everything is worked out in your browser, and Day Lite never asks for your location.</p>
      </section>
    </div>
    <footer><span>Day Lite / an exploration by Sammii Kellow</span><span>Sun times from Astronomy Engine. Globe by Mapbox.</span></footer>
  </main>;
}
