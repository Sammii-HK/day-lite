# Day Lite compatible dependency review, 20 November 2026

The initial review graph, after adding the first test setup, reported Yarn counts of 2 critical / 59 high / 43 moderate / 10 low. These are advisory-resolution path counts, not unique package counts. The two critical tinypool findings came from the discarded new Vitest3 test candidate; they must not be attributed to the owner's original checkout, which had no test runner. An initial production-only audit was not recorded.

Final full and production-dependency-group Yarn audits both report **zero findings**. Curated counts and actual installed versions are in `dependency-audit-20261120.json`.

## Bounded repair

The first product batch selected current patched Vitest4.1.12 instead of carrying the temporary advisory-affected test pool. Vendor package metadata explicitly supports the existing Vite6 and Node24 lines. No cross-major tinypool override was attempted. Yarn1 initially failed to link a nested Vite; a scoped `vitest/vite: 6.4.6` resolution aligns the test runner's documented supported range with the app, rather than hoisting an unrelated Vite major.

The original Vite6.0.7 line had high advisory fixes available within its major. Vite is now 6.4.6. This follow-up updates the lock within existing declared ranges, including current compatible Mapbox3, Day.js1, React18, ESLint9 and build-tool transitive fixes. No app framework major, schema, authentication or model/provider change was made. The exact selected framework/test versions are pinned or constrained in the manifest; no `audit fix --force` or broad cross-major resolution is used.

A frozen-lockfile Yarn install with lifecycle scripts ignored passes. Normal test passes all 11 canonical icon regressions and 12 solar/UI checks. Normal lint reports zero icon findings and passes ESLint. The TypeScript/Vite production build passes, built for the offline review with an explicitly empty map token. It still warns about the large optional Mapbox chunk. That SDK is lazy-loaded only after explicit map enablement; the warning was not hidden and no real-network performance claim is made.

Browser evidence checks actual local solar/form/date/layout behaviour; configured Mapbox remains mocked and unverified. No environment file, actual key, user location, private calendar/notes, permission, database, provider, email, push, merge or deployment was accessed. Node24 was used for verification; the new test runner requires a supported Node20/22/24+ line rather than the machine's old Node16 default.
