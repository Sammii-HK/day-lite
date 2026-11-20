import {afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act,waitFor} from '@testing-library/react';
import App from '../App';
import MapPanel from '../MapPanel';
import {GREENWICH} from '../lib/daylight';
const mocks=vi.hoisted(()=>({construct:vi.fn(),remove:vi.fn(),markerRemove:vi.fn(),handlers:{} as Record<string,(event?:unknown)=>void>}));
vi.mock('mapbox-gl',()=>({default:{accessToken:'',Map:class {
  constructor(options:unknown){mocks.construct(options);}
  on(name:string,handler:(event?:unknown)=>void){mocks.handlers[name]=handler;return this;}
  remove(){mocks.remove();}
},Marker:class {setLngLat(){return this;}addTo(){return this;}remove(){mocks.markerRemove();}}}}));
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();mocks.construct.mockClear();mocks.remove.mockClear();mocks.markerRemove.mockClear();});
describe('actual local interface',()=>{
  it('calculates without a map request and retains a valid location after invalid input',()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);render(<App/>);
    expect(mocks.construct).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Latitude/),{target:{value:'91'}});
    fireEvent.submit(screen.getByRole('button',{name:'Find the light'}).closest('form')!);
    expect(screen.getByRole('alert').textContent).toContain('Latitude');
    expect(screen.getByText('Europe/London')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Tokyo'}));
    expect(screen.queryByRole('alert')).toBeNull();expect(screen.getByText('Asia/Tokyo')).toBeTruthy();
    expect(mocks.construct).not.toHaveBeenCalled();vi.unstubAllGlobals();
  });
  it('updates the local clock and clears its timer on unmount',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));
    const view=render(<App/>);expect(screen.getByLabelText('Current local time').textContent).toBe('12:00');
    act(()=>{vi.advanceTimersByTime(60000);});expect(screen.getByLabelText('Current local time').textContent).toBe('12:01');
    view.unmount();expect(vi.getTimerCount()).toBe(0);
  });
  it('rolls Today at local midnight while preserving an explicitly chosen date',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-20T23:59:45Z'));render(<App/>);
    expect((screen.getByLabelText('Local date') as HTMLInputElement).value).toBe('2026-11-20');
    act(()=>vi.advanceTimersByTime(30000));
    expect((screen.getByLabelText('Local date') as HTMLInputElement).value).toBe('2026-11-21');
    fireEvent.change(screen.getByLabelText('Local date'),{target:{value:'2026-06-21'}});
    act(()=>vi.advanceTimersByTime(60000));
    expect((screen.getByLabelText('Local date') as HTMLInputElement).value).toBe('2026-06-21');
  });
  it('keeps polar dates explicit and lets Today follow the chosen location',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));render(<App/>);
    fireEvent.click(screen.getByRole('button',{name:'Tromsø'}));
    fireEvent.change(screen.getByLabelText('Local date'),{target:{value:'2026-06-21'}});
    expect(screen.getByText('Continuous daylight')).toBeTruthy();expect(screen.getByText('24h 00m')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Local date'),{target:{value:'2026-12-21'}});
    expect(screen.getByText('No sunrise this date')).toBeTruthy();expect(screen.getByText('0h 00m')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Today'}));
    expect((screen.getByLabelText('Local date') as HTMLInputElement).value).toBe('2026-11-20');
  });
  it('only loads the map explicitly; mocked errors remove resources and preserve local controls',async()=>{
    const select=vi.fn();const view=render(<MapPanel location={GREENWICH} onSelect={select} token="test-map-token"/>);
    expect(mocks.construct).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Load interactive map'}));
    await waitFor(()=>expect(mocks.construct).toHaveBeenCalledOnce());
    act(()=>mocks.handlers.click({lngLat:{lat:10,lng:190}}));expect(select).toHaveBeenCalledWith({latitude:10,longitude:-170});
    act(()=>mocks.handlers.error());expect(screen.getByText(/map could not load/)).toBeTruthy();
    expect(mocks.remove).toHaveBeenCalledOnce();expect(mocks.markerRemove).toHaveBeenCalledOnce();
    view.unmount();
  });
});
