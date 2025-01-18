import { useRef, useEffect, useState } from 'react'

import 'mapbox-gl/dist/mapbox-gl.css';

import './App.css'
import { Observer, SearchRiseSet, Body } from 'astronomy-engine';
import dayjs from 'dayjs';
import mapboxgl from 'mapbox-gl'
import utc from 'dayjs/plugin/utc';
import isBetween from 'dayjs/plugin/isBetween';

function App() {
  const mapRef = useRef<mapboxgl.Map>()
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  dayjs.extend(utc);
  dayjs.extend(isBetween);
  const day = dayjs().toDate();

  const greenwichLongLat = { lat: 51.4769, long: 0.0005};

  const observer = ({long, lat}:{long: number, lat: number}) =>  new Observer(lat, long, 0);

  const Direction = {
    Rise: +1,
    Set: -1
  }

  const [observerLocation, setObserverLocation] = useState(greenwichLongLat);

  const currentUtcOffset = calculateUtcOffset(observerLocation.long);
  const getSunrise = (days: number) => SearchRiseSet(Body.Sun, observer({lat: observerLocation.lat, long: observerLocation.long}), Direction.Rise, day, days);

  const sunrise  = getSunrise(1);
  const sunset  = SearchRiseSet(Body.Sun, observer({lat: observerLocation.lat, long: observerLocation.long}), Direction.Set, day, 1);
  const lastSunrise = dayjs(sunrise?.date).get('date') > dayjs(sunset?.date).get('date') ? getSunrise(-1) : sunrise;

  const multipleHours = (hours: number) => {
    return hours > 1 ? 's' : '';
  }

  function calculateUtcOffset(longitude: number) {
    const offset = Math.round(longitude / 15);
  
    return Math.max(-12, Math.min(14, offset));
  }
  
  const sunriseTime = lastSunrise ? dayjs(lastSunrise.date).utcOffset(currentUtcOffset).format('HH:mm') : '';
  const sunsetTime = dayjs(sunset?.date).utcOffset(currentUtcOffset).format('HH:mm');
  const daylightMinutes = dayjs(lastSunrise?.date).diff(dayjs(sunset?.date), 'minute');
  const getMinutes = Math.abs(daylightMinutes % 60);
  const daylightHours = Math.floor(daylightMinutes / 60);
  const daylightTime = `${Math.abs(daylightHours)} hour${multipleHours(daylightHours)} ${getMinutes} minute${multipleHours(getMinutes)}`;
  const isDayTime = dayjs().isBetween(dayjs(lastSunrise?.date), dayjs(sunset?.date));

  useEffect(() => {    
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current || 'map-container',
    });
    
    mapRef.current.on('mousemove', (e) => {
      setObserverLocation({lat: e.lngLat.lat, long: e.lngLat.lng})
      calculateUtcOffset(e.lngLat.lng)
    })
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
      }
    }
  }, [])

  

  return (
    <>
        <h1 id='title' className='sm mt-0'>Day Lite</h1>
      <div id="info-container">
        <h2>Daylight hours: {daylightTime}</h2>
        <div>{!isDayTime ? "🌘" : "🌤️"} Sunrise: {sunriseTime} Sunset: {sunsetTime}</div>
      </div>
      <div id='map-container' ref={mapContainerRef}/>
    </>
  )
}

export default App