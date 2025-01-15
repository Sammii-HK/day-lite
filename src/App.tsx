import { useRef, useEffect, useState } from 'react'

import 'mapbox-gl/dist/mapbox-gl.css';

import './App.css'
import { Observer, SearchRiseSet, Body } from 'astronomy-engine';
import dayjs from 'dayjs';
import mapboxgl from 'mapbox-gl'
import tzlookup from 'tz-lookup';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

function App() {

  const mapRef = useRef()
  const mapContainerRef = useRef()

  // const day = dayjs().add(7, 'day').toDate();
  dayjs.extend(utc);
  const day = dayjs().toDate();

  const greenwichLongLat = { lat: 51.4769, long: 0.0005};

  const observer = ({long, lat}:{long: number, lat: number}) =>  new Observer(lat, long, 0);

  const Direction = {
    Rise: +1,
    Set: -1
  }

  const [observerLocation, setObserverLocation] = useState(greenwichLongLat);

  const sunrise  = SearchRiseSet(Body.Sun, observer({lat: observerLocation.lat, long: observerLocation.long}), Direction.Rise, day, 1);
  const sunset  = SearchRiseSet(Body.Sun, observer({lat: observerLocation.lat, long: observerLocation.long}), Direction.Set, day, 1);
  const daylightMinutes = dayjs(sunrise?.date).diff(dayjs(sunset?.date), 'minute');
  const daylightHours = Math.floor(daylightMinutes / 60);
  const isInPast = daylightMinutes < 0;
  const getMinutes = daylightMinutes - (60 * daylightHours)
  

  const multipleHours = (hours: number) => {
    return hours > 1 ? 's' : '';
  }

  function calculateUtcOffset(longitude: number) {
    const offset = Math.round(longitude / 15);
  
    return Math.max(-12, Math.min(14, offset));
  }

  const currentUtcOffset = calculateUtcOffset(observerLocation.long);
  
  const daylightTime = `${Math.abs(daylightHours)} hour${multipleHours(daylightHours)} ${getMinutes} minute${multipleHours(getMinutes)}`;
  const sunriseTime = dayjs(sunrise?.date).utcOffset(currentUtcOffset).format('HH:mm');
  const sunsetTime = dayjs(sunset?.date).utcOffset(currentUtcOffset).format('HH:mm');
  

  // console.log("observerLocation", observerLocation);
  
  
  // console.log("sunrise", dayjs(sunrise?.date).format('HH:mm'));
  // console.log("sunset", dayjs(sunset?.date).format('HH:mm'));

  // console.log("daylightTime", daylightTime);
  
  useEffect(() => {    
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
    });
    
    mapRef.current.on('mousemove', (e) => {
      setObserverLocation({lat: e.lngLat.lat, long: e.lngLat.lng})
      calculateUtcOffset(e.lngLat.lng)
    })
    
    return () => {
      mapRef.current.remove()
    }
  }, [])

  

  return (
    <>
      <div>{isInPast ? "🌘" : "🌤️"}</div>
      <div>Sunrise: {sunriseTime}</div>
      <div>Sunset: {sunsetTime}</div>
      <div>Daylight: {daylightTime}</div>
      <div>UTC Offset: {calculateUtcOffset(observerLocation.long)}</div>
      <div id='map-container' ref={mapContainerRef}/>
    </>
  )
}

export default App