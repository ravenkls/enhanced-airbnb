# Verification

`npm run check` runs type checking, linting, format checking and regression tests. `npm run zip` verifies production compilation and packaging. Tests cover UTC/DST date arithmetic, missing and invalid context, guest counting, discounts, supported number formats, differing card dates, map price-basis evidence, idempotent rendering, updates, disabling, stale annotation removal, and observer cleanup.

The local preview at `npm run preview` exercises the same adapter, renderer and observer in a real browser. Change guests/nights, apply the sample discount, and switch annotations off/on. Check the map annotation with keyboard focus and a narrow viewport.

## Installed-extension smoke test

Load `.output/chrome-mv3` from `chrome://extensions`, then refresh Airbnb. Use English as the website language.

- Search for 4 guests and a 4-night stay; compare a result's total divided by 4 and 16.
- Check a discounted result: the current total, not its crossed-out predecessor, is divided.
- Check a similar-dates recommendation: its link's stay length is used.
- Open a listing and change guests and dates in its booking panel.
- Pan/zoom the map, open a marker's preview card, and navigate between results pages.
- Tab to a map breakdown to reveal all three calculations.
- Toggle the extension off/on and verify existing open tabs react immediately.
- Remove dates/guests and check that unsupported calculations disappear.
- Check a different currency and a page with nightly pricing.
- Check narrow layouts and sticky booking summaries.

The initial build has live-markup inspection and local browser preview verification. Installed-extension smoke testing across Airbnb's experiments is a separate check and should be repeated before future releases. Do not make reservations to test this extension.
