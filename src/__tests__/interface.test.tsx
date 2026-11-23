import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act,waitFor} from '@testing-library/react';
import App from '../App';
import MapPanel from '../MapPanel';
import {GREENWICH} from '../lib/daylight';
import {MAP_STYLES,fogForScheme} from '../lib/map';
const mocks=vi.hoisted(()=>({construct:vi.fn(),remove:vi.fn(),markerRemove:vi.fn(),setStyle:vi.fn(),setFog:vi.fn(),flyTo:vi.fn(),jumpTo:vi.fn(),easeTo:vi.fn(),handlers:{} as Record<string,(event?:unknown)=>void>}));
vi.mock('mapbox-gl',()=>({default:{accessToken:'',Map:class {
  constructor(options:unknown){mocks.construct(options);}
  on(name:string,handler:(event?:unknown)=>void){mocks.handlers[name]=handler;return this;}
  remove(){mocks.remove();}
  setStyle(style:string){mocks.setStyle(style);return this;}
  setFog(fog:unknown){mocks.setFog(fog);return this;}
  flyTo(options:unknown){mocks.flyTo(options);return this;}
  jumpTo(options:unknown){mocks.jumpTo(options);return this;}
  easeTo(options:unknown){mocks.easeTo(options);return this;}
  stop(){return this;}
  setPadding(){return this;}
  addControl(){return this;}
  getCenter(){return {lng:0,lat:51};}
  getCanvas(){return document.createElement('canvas');}
},NavigationControl:class {},Marker:class {setLngLat(){return this;}addTo(){return this;}remove(){mocks.markerRemove();}}}}));
vi.mock('mapbox-gl/dist/mapbox-gl.css',()=>({}));

// A controllable matchMedia: flip a query and its listeners hear about it, as when the system setting changes.
const media={state:{} as Record<string,boolean>,listeners:new Set<()=>void>()};
const setMedia=(query:string,value:boolean)=>{media.state[query]=value;media.listeners.forEach(listener=>listener());};
const frames:Array<()=>void>=[];
const flushFrames=()=>act(()=>{frames.splice(0).forEach(run=>run());});
beforeEach(()=>{
  media.state={'(hover: hover) and (pointer: fine)':true};media.listeners.clear();frames.length=0;
  vi.stubGlobal('matchMedia',(query:string)=>({get matches(){return Boolean(media.state[query]);},media:query,addEventListener:(_:string,listener:()=>void)=>media.listeners.add(listener),removeEventListener:(_:string,listener:()=>void)=>media.listeners.delete(listener)}));
  vi.stubGlobal('requestAnimationFrame',(run:()=>void)=>frames.push(run));
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>{frames[id-1]=()=>{};});
  for(const key of Object.keys(mocks.handlers))delete mocks.handlers[key];
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();for(const mock of [mocks.construct,mocks.remove,mocks.markerRemove,mocks.setStyle,mocks.setFog,mocks.flyTo,mocks.jumpTo,mocks.easeTo])mock.mockClear();});
const mapReady=async()=>{await waitFor(()=>expect(mocks.construct).toHaveBeenCalledOnce());};
describe('actual local interface',()=>{
  it('calculates without a map when there is no token and retains a valid location after invalid input',()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);render(<App mapToken=""/>);
    expect(mocks.construct).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/globe is unavailable right now/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Latitude/),{target:{value:'91'}});
    fireEvent.submit(screen.getByRole('button',{name:'Find the light'}).closest('form')!);
    expect(screen.getByRole('alert').textContent).toContain('Latitude');
    expect(screen.getByText('Europe/London')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Tokyo'}));
    expect(screen.queryByRole('alert')).toBeNull();expect(screen.getByText('Asia/Tokyo')).toBeTruthy();
    expect(mocks.construct).not.toHaveBeenCalled();
  });
  it('updates the local clock and clears its timer on unmount',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));
    const view=render(<App mapToken=""/>);expect(screen.getByLabelText('Current local time').textContent).toBe('12:00');
    act(()=>{vi.advanceTimersByTime(60000);});expect(screen.getByLabelText('Current local time').textContent).toBe('12:01');
    view.unmount();expect(vi.getTimerCount()).toBe(0);
  });
  it('rolls Today at local midnight while preserving an explicitly chosen date',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-20T23:59:45Z'));render(<App mapToken=""/>);
    expect((screen.getByLabelText('Local date') as HTMLInputElement).value).toBe('2026-11-20');
    act(()=>vi.advanceTimersByTime(30000));
    expect((screen.getByLabelText('Local date') as HTMLInputElement).value).toBe('2026-11-21');
    fireEvent.change(screen.getByLabelText('Local date'),{target:{value:'2026-06-21'}});
    act(()=>vi.advanceTimersByTime(60000));
    expect((screen.getByLabelText('Local date') as HTMLInputElement).value).toBe('2026-06-21');
  });
  it('keeps polar dates explicit and lets Today follow the chosen location',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));render(<App mapToken=""/>);
    fireEvent.click(screen.getByRole('button',{name:'Tromsø'}));
    fireEvent.change(screen.getByLabelText('Local date'),{target:{value:'2026-06-21'}});
    expect(screen.getByText('Continuous daylight')).toBeTruthy();expect(screen.getByText('24h 00m')).toBeTruthy();
    expect(screen.getByText('Continuous daylight').querySelector('svg')?.classList.contains('lucide-sun')).toBe(true);
    fireEvent.change(screen.getByLabelText('Local date'),{target:{value:'2026-12-21'}});
    expect(screen.getByText('No sunrise this date')).toBeTruthy();expect(screen.getByText('0h 00m')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Today'}));
    expect((screen.getByLabelText('Local date') as HTMLInputElement).value).toBe('2026-11-20');
  });
});
describe('globe',()=>{
  it('loads straight away as a globe; clicks pick a point; an early error removes it and keeps local controls',async()=>{
    const select=vi.fn();const view=render(<MapPanel location={GREENWICH} onSelect={select} token="test-map-token"/>);
    expect(screen.queryByRole('button',{name:/Load/})).toBeNull();
    await mapReady();
    expect(mocks.construct.mock.calls[0][0]).toMatchObject({projection:'globe',style:MAP_STYLES.light,center:[GREENWICH.longitude,GREENWICH.latitude]});
    act(()=>mocks.handlers.click({lngLat:{lat:10,lng:190}}));expect(select).toHaveBeenCalledWith({latitude:10,longitude:-170});
    act(()=>mocks.handlers.error());expect(screen.getByText(/globe could not load/)).toBeTruthy();
    expect(mocks.remove).toHaveBeenCalledOnce();expect(mocks.markerRemove).toHaveBeenCalledOnce();
    view.unmount();expect(mocks.remove).toHaveBeenCalledOnce();
  });
  it('ignores errors once the globe has rendered',async()=>{
    render(<MapPanel location={GREENWICH} onSelect={vi.fn()} token="test-map-token"/>);await mapReady();
    act(()=>mocks.handlers.load());act(()=>mocks.handlers.error());
    expect(mocks.remove).not.toHaveBeenCalled();expect(screen.queryByText(/could not load/)).toBeNull();
  });
  it('follows the colour scheme, switching style live and reapplying the atmosphere',async()=>{
    setMedia('(prefers-color-scheme: dark)',true);
    render(<MapPanel location={GREENWICH} onSelect={vi.fn()} token="test-map-token"/>);await mapReady();
    expect(mocks.construct.mock.calls[0][0]).toMatchObject({style:MAP_STYLES.dark});
    act(()=>mocks.handlers['style.load']());expect(mocks.setFog).toHaveBeenLastCalledWith(fogForScheme('dark'));
    expect(mocks.setStyle).not.toHaveBeenCalled();
    act(()=>setMedia('(prefers-color-scheme: dark)',false));
    expect(mocks.setStyle).toHaveBeenCalledWith(MAP_STYLES.light);
    act(()=>mocks.handlers['style.load']());expect(mocks.setFog).toHaveBeenLastCalledWith(fogForScheme('light'));
    act(()=>setMedia('(prefers-color-scheme: dark)',true));
    expect(mocks.setStyle).toHaveBeenLastCalledWith(MAP_STYLES.dark);expect(mocks.setStyle).toHaveBeenCalledTimes(2);
  });
  it('previews hovered points once per frame with the latest position, and clears on leaving',async()=>{
    const hover=vi.fn();render(<MapPanel location={GREENWICH} onSelect={vi.fn()} onHover={hover} token="test-map-token"/>);await mapReady();
    act(()=>{mocks.handlers.mousemove({lngLat:{lat:1,lng:2}});mocks.handlers.mousemove({lngLat:{lat:3,lng:4}});mocks.handlers.mousemove({lngLat:{lat:35.12345678,lng:139.6}});});
    expect(hover).not.toHaveBeenCalled();flushFrames();
    expect(hover).toHaveBeenCalledOnce();expect(hover).toHaveBeenCalledWith({latitude:35.1235,longitude:139.6});
    act(()=>mocks.handlers.mousemove({lngLat:{lat:5,lng:6}}));act(()=>mocks.handlers.mouseout());flushFrames();
    expect(hover).toHaveBeenCalledTimes(2);expect(hover).toHaveBeenLastCalledWith(null);
  });
  it('does not hover on touch screens, where a tap selects instead',async()=>{
    setMedia('(hover: hover) and (pointer: fine)',false);
    const hover=vi.fn();const select=vi.fn();render(<MapPanel location={GREENWICH} onSelect={select} onHover={hover} token="test-map-token"/>);await mapReady();
    expect(mocks.construct.mock.calls[0][0]).toMatchObject({cooperativeGestures:true});
    act(()=>mocks.handlers.mousemove({lngLat:{lat:1,lng:2}}));flushFrames();expect(hover).not.toHaveBeenCalled();
    act(()=>mocks.handlers.click({lngLat:{lat:1,lng:2}}));expect(select).toHaveBeenCalledWith({latitude:1,longitude:2});
  });
  it('spins gently and flies to chosen places, but neither with reduced motion',async()=>{
    const view=render(<MapPanel location={GREENWICH} onSelect={vi.fn()} token="test-map-token"/>);await mapReady();
    act(()=>mocks.handlers.load());expect(mocks.easeTo).toHaveBeenCalledOnce();
    view.rerender(<MapPanel location={{latitude:35.6762,longitude:139.6503}} onSelect={vi.fn()} token="test-map-token"/>);
    expect(mocks.flyTo).toHaveBeenCalledWith(expect.objectContaining({center:[139.6503,35.6762]}));expect(mocks.jumpTo).not.toHaveBeenCalled();
    act(()=>mocks.handlers.moveend());expect(mocks.easeTo).toHaveBeenCalledOnce();
    view.unmount();cleanup();mocks.construct.mockClear();mocks.easeTo.mockClear();mocks.flyTo.mockClear();
    setMedia('(prefers-reduced-motion: reduce)',true);
    const reduced=render(<MapPanel location={GREENWICH} onSelect={vi.fn()} token="test-map-token"/>);await mapReady();
    act(()=>mocks.handlers.load());act(()=>mocks.handlers.moveend());expect(mocks.easeTo).not.toHaveBeenCalled();
    reduced.rerender(<MapPanel location={{latitude:-33.8688,longitude:151.2093}} onSelect={vi.fn()} token="test-map-token"/>);
    expect(mocks.jumpTo).toHaveBeenCalledWith({center:[151.2093,-33.8688]});expect(mocks.flyTo).not.toHaveBeenCalled();
  });
  it('does not move the globe to a point that was just clicked on it',async()=>{
    const view=render(<MapPanel location={GREENWICH} onSelect={vi.fn()} token="test-map-token"/>);await mapReady();
    act(()=>mocks.handlers.click({lngLat:{lat:10,lng:20}}));
    view.rerender(<MapPanel location={{latitude:10,longitude:20}} onSelect={vi.fn()} token="test-map-token"/>);
    expect(mocks.flyTo).not.toHaveBeenCalled();expect(mocks.jumpTo).not.toHaveBeenCalled();
  });
  it('updates the daylight panel live while hovering and returns to the pinned place',async()=>{
    vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-06-21T12:00:00Z'));
    render(<App mapToken="test-map-token"/>);await mapReady();
    expect(screen.getByText('Pinned')).toBeTruthy();expect(screen.getByText('Europe/London')).toBeTruthy();
    act(()=>mocks.handlers.mousemove({lngLat:{lat:69.6492,lng:18.9553}}));flushFrames();
    expect(screen.getByText('Exploring')).toBeTruthy();expect(screen.getByText('Europe/Oslo')).toBeTruthy();expect(screen.getByText('24h 00m')).toBeTruthy();
    expect(document.querySelector('.solar-status')?.getAttribute('aria-live')).toBe('off');
    act(()=>mocks.handlers.mouseout());
    expect(screen.getByText('Pinned')).toBeTruthy();expect(screen.getByText('Europe/London')).toBeTruthy();
    act(()=>mocks.handlers.mousemove({lngLat:{lat:35.6762,lng:139.6503}}));flushFrames();
    act(()=>mocks.handlers.click({lngLat:{lat:35.6762,lng:139.6503}}));
    expect(screen.getByText('Pinned')).toBeTruthy();expect(screen.getByText('Asia/Tokyo')).toBeTruthy();
    expect((screen.getByLabelText(/Latitude/) as HTMLInputElement).value).toBe('35.6762');
  });
});
