import {describe,it,expect} from 'vitest';
import {dayBounds, duration, GREENWICH, parseCoordinates, RiseSetSearch, solarDay, timeZoneAt} from '../lib/daylight';
const searchFor=(rises:string[],sets:string[]):RiseSetSearch=>(direction,start,days)=>(direction===1?rises:sets).map(s=>new Date(s)).find(d=>d>=start&&d.getTime()<=start.getTime()+days*86400000)||null;
describe('civil day and solar events',()=>{
  it('uses civil zones rather than longitude offsets, including DST day length',()=>{
    expect(timeZoneAt({latitude:27.7172,longitude:85.324})).toBe('Asia/Kathmandu');
    const start=dayBounds('2026-06-21','Asia/Kathmandu').start;
    expect(start.toISOString()).toBe('2026-06-20T18:15:00.000Z');
    const spring=dayBounds('2026-03-29','Europe/London'),autumn=dayBounds('2026-10-25','Europe/London');
    expect((spring.end.getTime()-spring.start.getTime())/3600000).toBe(23);
    expect((autumn.end.getTime()-autumn.start.getTime())/3600000).toBe(25);
    const midnightFold=dayBounds('2026-11-01','America/Havana');
    expect((midnightFold.end.getTime()-midnightFold.start.getTime())/3600000).toBe(25);
  });
  it('rejects impossible local dates and invalid/empty coordinates',()=>{
    for(const date of ['2026-02-31','2026-13-01','1800-01-01','2026-1-1'])expect(()=>dayBounds(date,'Europe/London')).toThrow();
    for(const pair of [['','0'],['91','0'],['0','181'],['NaN','0']])expect(()=>parseCoordinates(...pair as [string,string])).toThrow();
    expect(parseCoordinates('-90','180')).toEqual({latitude:-90,longitude:180});
    expect(()=>dayBounds('2011-12-30','Pacific/Apia')).toThrow();
  });
  it('integrates the selected day, not a negative sunrise/sunset difference',()=>{
    const result=solarDay(GREENWICH,'2026-11-20',searchFor(['2026-11-20T06:15Z'],['2026-11-20T18:40Z']));
    expect(result.daylightMinutes).toBe(745);expect(duration(result.daylightMinutes)).toBe('12h 25m');
    expect(result.rises).toHaveLength(1);expect(result.sets).toHaveLength(1);
  });
  it('handles a sunset-only local date without inventing a sunrise',()=>{
    const result=solarDay(GREENWICH,'2026-11-20',searchFor(['2026-11-21T06:00Z'],['2026-11-20T11:00Z']));
    expect(result.daylightMinutes).toBe(660);expect(result.rises).toHaveLength(0);
  });
  it('distinguishes polar day, polar night and unavailable event data',()=>{
    expect(solarDay(GREENWICH,'2026-11-20',searchFor(['2027-01-02T08:00Z'],['2027-01-02T16:00Z'])).daylightMinutes).toBe(0);
    const allDay=solarDay(GREENWICH,'2026-11-20',searchFor(['2026-12-01T08:00Z'],['2026-11-30T16:00Z']));
    expect(allDay.condition).toBe('continuous-daylight');expect(allDay.daylightMinutes).toBe(1440);
    const missing=solarDay(GREENWICH,'2026-11-20',()=>null);
    expect(missing.condition).toBe('unavailable');expect(missing.daylightMinutes).toBeNull();
  });
  it('does not attach events from the next civil date to the selected date',()=>{
    const result=solarDay(GREENWICH,'2026-11-20',searchFor(['2026-11-21T00:00Z'],['2026-11-21T12:00Z']));
    expect(result.rises).toHaveLength(0);expect(result.daylightMinutes).toBe(0);
  });
  it('calculates real solstice/polar events locally with Astronomy Engine',()=>{
    const summer=solarDay(GREENWICH,'2026-06-21');
    expect(summer.daylightMinutes).toBeGreaterThan(990);expect(summer.daylightMinutes).toBeLessThan(1050);
    const tromso={latitude:69.6492,longitude:18.9553};
    expect(solarDay(tromso,'2026-06-21').condition).toBe('continuous-daylight');
    expect(solarDay(tromso,'2026-12-21').condition).toBe('continuous-night');
  });
});
