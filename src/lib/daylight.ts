import { Body, Observer, SearchRiseSet } from 'astronomy-engine';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import tzLookup from 'tz-lookup';
dayjs.extend(utc);
dayjs.extend(timezone);
export interface Coordinates { latitude: number; longitude: number }
export const GREENWICH: Coordinates = { latitude: 51.4769, longitude: 0.0005 };
export function parseCoordinates(latitude: string, longitude: string): Coordinates {
  if (!latitude.trim() || !longitude.trim()) throw new Error('Enter both latitude and longitude.');
  const result = { latitude: Number(latitude), longitude: Number(longitude) };
  if (!Number.isFinite(result.latitude) || result.latitude < -90 || result.latitude > 90) throw new Error('Latitude must be a number between -90 and 90.');
  if (!Number.isFinite(result.longitude) || result.longitude < -180 || result.longitude > 180) throw new Error('Longitude must be a number between -180 and 180.');
  return result;
}
export const timeZoneAt = (location: Coordinates) => tzLookup(location.latitude, location.longitude);
export const localDate = (instant: Date, zone: string) => dayjs(instant).tz(zone).format('YYYY-MM-DD');
export const clockTime = (instant: Date, zone: string) => new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant);
function civilMidnight(date: string, zone: string) {
  const provisional = dayjs.tz(`${date} 00:00`, zone).toDate();
  // Some zones repeat midnight at the autumn fold. Day.js can pick the later
  // occurrence; inspect nearby actual offsets and keep the first valid midnight.
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) offsets.add(dayjs(new Date(provisional.getTime() + hours * 3600000)).tz(zone).utcOffset());
  const candidates = [...offsets].map(offset => new Date(Date.parse(`${date}T00:00:00Z`) - offset * 60000)).filter(instant => dayjs(instant).tz(zone).format('YYYY-MM-DD HH:mm:ss') === `${date} 00:00:00`);
  return candidates.length ? new Date(Math.min(...candidates.map(instant => instant.getTime()))) : provisional;
}
export function dayBounds(date: string, zone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '1900-01-01' || date > '2100-12-31' || dayjs.utc(date).format('YYYY-MM-DD') !== date) throw new Error('Choose a valid date between 1900 and 2100.');
  const next = dayjs.utc(date).add(1, 'day').format('YYYY-MM-DD');
  const start = civilMidnight(date, zone);
  const end = civilMidnight(next, zone);
  if (localDate(start, zone) !== date || end.getTime() <= start.getTime()) throw new Error('This date does not exist in the selected time zone.');
  return { start, end };
}
export type RiseSetSearch = (direction: 1 | -1, start: Date, days: number) => Date | null;
export interface SolarDay {
  start: Date; end: Date; zone: string; rises: Date[]; sets: Date[];
  intervals: Array<{ start: Date; end: Date }>; daylightMinutes: number | null;
  condition: 'events' | 'continuous-daylight' | 'continuous-night' | 'unavailable';
}
export function solarDay(location: Coordinates, date: string, injectedSearch?: RiseSetSearch): SolarDay {
  parseCoordinates(String(location.latitude), String(location.longitude));
  const zone = timeZoneAt(location);
  const { start, end } = dayBounds(date, zone);
  const observer = new Observer(location.latitude, location.longitude, 0);
  const search: RiseSetSearch = injectedSearch || ((direction, after, days) => SearchRiseSet(Body.Sun, observer, direction, after, days)?.date || null);
  // The next event ordering establishes the initial horizon state, including polar seasons.
  // Use the library's own rise/set model, not a separate centre-altitude threshold.
  const nextRise = search(1, start, 370);
  const nextSet = search(-1, start, 370);
  const base = { start, end, zone, rises: [] as Date[], sets: [] as Date[], intervals: [] as Array<{start:Date;end:Date}> };
  if (!nextRise && !nextSet) return { ...base, daylightMinutes: null, condition: 'unavailable' };
  const events: Array<{time:Date;direction:1|-1}> = [];
  for (const direction of [1, -1] as const) {
    let event = direction === 1 ? nextRise : nextSet;
    let count = 0;
    while (event && event >= start && event < end) {
      if (++count > 8) return { ...base, daylightMinutes: null, condition: 'unavailable' };
      events.push({time:event,direction});
      const after = new Date(event.getTime() + 1000);
      event = after < end ? search(direction, after, (end.getTime() - after.getTime()) / 86400000) : null;
    }
  }
  events.sort((a,b) => a.time.getTime() - b.time.getTime());
  let daylight = Boolean(nextSet && (!nextRise || nextSet < nextRise));
  let cursor = start;
  for (const event of events) {
    if (daylight) base.intervals.push({ start: cursor, end: event.time });
    (event.direction === 1 ? base.rises : base.sets).push(event.time);
    daylight = event.direction === 1;
    cursor = event.time;
  }
  if (daylight) base.intervals.push({ start: cursor, end });
  const minutes = base.intervals.reduce((sum,interval) => sum + (interval.end.getTime() - interval.start.getTime()) / 60000, 0);
  return { ...base, daylightMinutes: minutes, condition: events.length ? 'events' : daylight ? 'continuous-daylight' : 'continuous-night' };
}
export function duration(minutes: number | null) {
  if (minutes === null) return 'Unavailable';
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}h ${String(rounded % 60).padStart(2, '0')}m`;
}
