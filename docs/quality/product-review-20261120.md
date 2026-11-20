# Day Lite local product review, 20 November 2026

## Baseline and scope

Private catalogue mapping identifies `/Users/sammii/development/day-lite`, clean main `d36261e`. Work is isolated on `codex/day-lite-product-polish`, excluding environment files and runtime/state/data directories. Main was not changed. This local candidate is not a deployment.

The original client recomputed solar events on every map mouse move and rendered a clock only when something else caused a render. It searched forward from the current instant, then compared day-of-month values and subtracted sunrise from sunset in the wrong direction. `dayjs(undefined)` could turn a missing polar event into a plausible current time. A longitude/15 offset could not represent civil time zones or daylight-saving changes. There was no keyboard coordinate path, map configuration/error boundary or narrow-screen layout.

## Current actual behaviour

- The independent solar module uses the existing Astronomy Engine and tz-lookup libraries. It validates coordinates/date, determines civil day boundaries and collects rise/set events within that date. Daylight is the sum of intervals within those bounds, not an absolute negative timestamp difference. It handles a sunset-only or sunrise-only day and excludes events at the next day's midnight.
- Next rise/set ordering establishes the initial horizon state using the same library model. A bounded 370-day lookahead allows polar seasons to be distinguished. No events in the selected date can mean continuous daylight or night; no resolvable event ordering remains explicitly unavailable. It never substitutes the current time for a missing event. Searches are bounded to eight events per direction per local date, then report unavailable rather than loop.
- Civil date conversion handles 23/25-hour DST dates and the repeated-midnight fold. A real regression found that the default Day.js conversion chose the later Havana midnight; valid nearby offset candidates now select the earliest midnight. A skipped entire local date is rejected. Runtime time-zone data and the coordinate lookup remain dependencies, not a certification of every border or historical rule.
- Local time refreshes every 30 seconds with cleanup. Today follows the selected zone and rolls at its midnight; an explicitly chosen date remains selected. Solar results are memoised by coordinates/date and do not recalculate on every clock tick or pointer movement.
- Latitude/longitude form controls, four public example places, labelled local-date input, Today, native buttons, visible focus and announced errors work without a map. Empty/out-of-range coordinates retain the prior valid place. The timeline is a data visualisation of rise-to-set intervals, not a terminator, solar altitude plot or weather observation.
- The optional map is lazy-loaded only after an explicit Load action when configured. The interface explains the third-party map boundary. Selection uses a map click rather than continuous hover. Missing configuration and load errors preserve the calculator; map/marker disposal and late-load cancellation are handled. Contracts are checked with a mocked SDK, never a real token or tile request. No map controls, globe projection or custom terminator layer are claimed.
- All UI icons use Lucide. Degree signs, coordinates, chart intervals and counts remain domain notation. The canonical source gate runs in normal lint/build; all 11 canonical regressions run in normal test.

## Source checks

Twelve tests cover real Astronomy Engine solstice/polar calculations, injected event boundaries and missing data, civil zones/DST/Havana/skipped dates, coordinate rejection, actual mounted form/preset/date/clock flows and SDK-mocked map selection/error disposal. The 11 shared icon regressions pass. Normal lint and TypeScript/Vite build pass, with zero source icon violations or symbol-review candidates. The Vite build retains a large optional Mapbox chunk warning; it is lazy, not eliminated or measured over a real network.

The baseline had no test runner. The initial new Vitest3 candidate exposed an advisory-affected tinypool graph and was replaced before saving with Vitest4.1.12, whose vendor metadata supports the existing Vite6/Node24 lines. Vite is patched within its existing major to 6.4.6. A scoped `vitest/vite` alignment selects that supported Vite6 line instead of letting Yarn1 hoist an unrelated newer major. The initial Yarn hoisting error is resolved. Further dependency audit evidence is recorded separately; no force-major or cross-major tinypool override was used.

## Offline browser boundary

`scripts/review.mjs` serves only compiled assets at 127.0.0.1:4838. The review build explicitly sets the map token empty, excludes environment files and removes the old external Mapbox stylesheet. A visible banner labels the local offline review. CSP is `connect-src 'none'`; there are no APIs, proxies or runtime/private state routes. The solar outputs are the actual local calculation, not hand-entered fixture results. Browser evidence is recorded after checking the actual view.

Configured Mapbox rendering, physical touch/virtual keyboards, all browsers/assistive technologies, terrain/weather effects and every possible political time-zone boundary remain unverified. No private notes/calendar, geolocation permission, actual location, provider/model, email, database or release action was accessed.

Primary model reference: [Astronomy Engine JavaScript API](https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md). Rise/set uses the Sun's visible limb and the library's refraction model; real atmospheric conditions are outside this model. The coordinate time-zone lookup is bundled local data, not a live location service.

## Actual offline browser receipt

Chrome desktop 1144px and temporary phone 390 by 844px were checked against the compiled actual client, with no map action. Invalid latitude `999` submitted through Enter announced an error and retained Greenwich results. Native Enter on Tokyo changed its civil Today to 21 November while London was still on 20 November. Manual Sydney coordinates plus Enter changed the zone, hemisphere notation and calculated result; Today restored its current civil date.

Native date-field month keys selected Tromsø on 20 December (zero daylight, missing rise/set labels) and 20 June (continuous 24-hour daylight, missing rise/set labels). A direct automation fill of the date field did not commit native React input, so that was not accepted as evidence; actual native keys did commit and update the calculation. At 390px, document width equalled viewport width; observed form/buttons were 44px high. Today initially measured narrower than 44px, so all buttons now also have a 44px minimum width for the final check. Physical virtual keyboards are not certified. The viewport was reset to 1144px and the browser handed back.

The saved phone capture revealed a semantic icon error: a historical continuous-daylight result used the current-time Moon branch. The status icon now follows the selected condition, with a mounted regression asserting Sun for polar daylight; an ordinary historical date uses Calendar rather than implying current night. The final no-key production build was reloaded and the polar-day result was verified with the actual Lucide Sun class, then all three captures were refreshed. The final 390px geometry check confirms all observed controls are at least 44 by 44px, including Today; document width remains 390px. The viewport was reset to 1144px and browser ownership released again.

Ignored local captures are not production screenshots or a configured-map demo: desktop 1144 by 926, full polar-day phone 390 by 1684 and coordinate-entry phone 390 by 844. Solar values are calculated locally, not supplied fixtures. No geolocation prompt, tile request, permission or private data was used.


Current final captures, ignored and local only:
- `.codex-artifacts/day-lite-offline-desktop.jpg`: actual Greenwich results and the labelled no-map review boundary.
- `.codex-artifacts/day-lite-offline-polar-phone.jpg`: full 390px view of Tromsø on 21 June 2026, calculated continuous daylight and missing event labels, corrected Sun icon and native date focus.
- `.codex-artifacts/day-lite-offline-coordinates-phone.jpg`: actual negative-latitude Sydney form entry, selected preset state and offline map explanation, 390 by 844.

The compatible dependency follow-up audits zero in both full and production groups; its receipt distinguishes the discarded initial test-runner candidate from the owner's original source.
