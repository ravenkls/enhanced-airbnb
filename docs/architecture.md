# Architecture

The content script runs in Chrome's isolated extension world. It reads rendered DOM and page URLs; it does not call private Airbnb APIs or read React internals.

1. `airbnb/context.ts` reads a stay from URL parameters. Listing links override dates for recommendations. On property pages, the selected booking guest and ISO-date controls override URL values.
2. `airbnb/adapter.ts` identifies known list, booking, and marker price components. Accessible discount labels have priority; explicit total/nightly wording establishes the price basis. A consistent current-card basis supplies the otherwise unlabelled marker unit.
3. `domain/pricing.ts` divides the original price, with no intermediate rounding. Nights use UTC calendar dates so daylight-saving transitions do not change the count.
4. `application/enhancer.ts` passes validated inputs to the domain and renderer. Before each scan, previous presentation changes are restored if their values have not been changed by Airbnb. This prevents repeated division while retaining external updates.
5. `ui/annotation.ts` rewrites native price text and accessible price labels reversibly, and adds only a small inline nightly price. All price text is written with `textContent`; page text is never inserted as HTML. Native price nodes and event handlers are retained. A shared Total / Per person control sits beside the results heading.

A debounced MutationObserver handles asynchronous content and price updates. It ignores the extension's own nodes and tracked text/attribute writes, comparing current values to avoid suppressing Airbnb updates to the same nodes. A lightweight URL comparison catches History API navigations from Airbnb's main world. Observer, timers, annotations, and storage listeners are disposed when WXT invalidates the content script.

## Responsibility boundaries

- Domain calculations depend on typed values, not DOM, currency formatting, or storage.
- Site detection implements `PriceSource`; alternate site layouts can extend the adapter without changing arithmetic.
- Rendering implements `AnnotationRenderer`; presentation can evolve without altering detection.
- The enhancer depends on these small contracts and accepts its document and URL provider explicitly.
- The content entrypoint handles browser integration, while the popup manages saved enablement and price mode preferences.

This follows SOLID's separation and dependency principles using focused modules and composition rather than a hierarchy of unnecessary classes.

## Known tradeoffs

Page data is eventually consistent while Airbnb is refreshing. The extension debounces updates by 150 ms and skips explicitly busy components, but cannot atomically synchronise Airbnb's price and context updates. DOM experiments can remove selector coverage. Unknown languages, monthly pricing and ambiguous units are skipped instead of guessed. Currency parsing preserves symbols; it does not assert an ISO currency where Airbnb only supplies `$` or `¥`.

No background service worker is required. No remote code or network access is used by the extension.
