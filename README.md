# Enhanced Airbnb

A native-looking **Total / Per person** switch for Airbnb. Compare stay prices and nightly costs without extra price badges or explanatory rows.

A Chrome Manifest V3 extension built with TypeScript and WXT. No account, backend, analytics, or tracking. The extension reads prices locally and only stores your on/off preference and price display mode.

## Install from GitHub

1. Open [Releases](https://github.com/ravenkls/enhanced-airbnb/releases/latest) and download `enhanced-airbnb-<version>-chrome.zip` under **Assets**. The source-code ZIP is not the extension.
2. Unzip into a permanent folder.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
5. Refresh Airbnb, select your dates and guests, and browse. Pin the extension to access its on/off switch.

To update, replace the files in that folder with the next release, click **Reload** on the extension, and refresh Airbnb. GitHub installations do not update automatically. Chrome Web Store publishing is a separate future distribution option.

## What it does

| Surface                                                    | Enhancement                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| Search cards and map preview cards                         | Stay price and nightly price on one line, in the selected mode |
| Property booking panel and supported sticky booking prices | The same compact price display                                 |
| Map price markers                                          | One stay price inside the original pin, in the selected mode   |

Use **Total / Per person** beside the search results count. The choice applies to supported list, property and map prices together and is remembered across tabs. The popup offers the same preference and an on/off control.

For **£1,200 total**, **4 guests**, **3 nights**:

- **Total:** list `£1,200 total · £400 / night`; map `£1,200`.
- **Per person:** list `£300 per person · £100 / night`; map `£300`.

Adults and children share the price equally; infants and pets are excluded. Each card's own dates are used, including similar-dates recommendations. Current and crossed-out prices are converted consistently. Currency symbols are preserved without exchange-rate conversion. Calculations use the displayed price and its existing fee basis, rounded to at most two decimals.

Prices update as Airbnb changes results, dates, guests or prices. Without reliable guest context, per-person mode is unavailable. A nightly rate without known dates cannot become a stay total, so it is left unchanged. Switching off restores Airbnb's original text and removes the added controls.

### Current scope

Version 0.2 supports **English-language pages** on `airbnb.com`, `airbnb.co.uk`, `airbnb.ca`, `airbnb.com.au`, `airbnb.co.nz`, and `airbnb.ie` (including subdomains). Switch Airbnb's language to English if needed. Amount parsing covers common currency symbols and codes, including comma/period decimal formats.

Airbnb changes and experiments with its markup. The adapter targets known price components; it deliberately does not interpret every monetary amount (deposits, instalments, monthly prices, fee line items, and checkout are outside this release's scope). Bare map prices are annotated only when the current search cards establish a consistent total/nightly basis. Map-only results without that evidence are skipped.

Selectors were checked against live UK search, map, and property markup on 28 September 2026. Automated tests use reduced fixtures, and browser rendering was checked in the local preview. Full installed-extension validation across Airbnb experiments and regional layouts is still needed; this is an initial release, not a guarantee of universal page coverage.

## Develop

Use Node **24 LTS** (`nvm use`) and npm. Dependencies are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

WXT starts a development browser with the extension. For a manual install:

```sh
npm run build
```

Load `.output/chrome-mv3` using the installation steps above.

```sh
npm run check         # Strict TypeScript, Oxlint, Oxfmt check, Vitest
npm run format        # Format using Oxfmt
npm run test:watch    # Watch regression tests
npm run preview       # Interactive local fixture at /demo/
npm run zip           # Production extension ZIP in .output/
```

The preview uses the actual adapter, calculator, renderer and observer. Its prices are illustrative; it is not a live Airbnb page.

## Structure

```text
src/
  domain/             Pure price arithmetic and calendar-day calculations
  airbnb/             DOM selectors, money parsing, URL and booking context
  application/        Refresh lifecycle and injected source/renderer interfaces
  ui/                 Shadow DOM price annotations
  entrypoints/
    content.ts        Extension startup and storage wiring
    popup/            On/off control and calculation explanation
 tests/               Calculation and DOM lifecycle regressions
 demo/                Interactive integration fixture
 scripts/             Release version verification
 .github/workflows/   CI and tag-triggered downloadable releases
```

The domain has no browser or WXT dependency. `PriceSource` and `AnnotationRenderer` are small interfaces injected into the enhancer. Airbnb selector changes stay in the adapter, rendering stays in the UI, and entrypoints compose them. See [architecture](docs/architecture.md) and [manual verification](docs/testing.md).

## Releases

CI runs checks and creates a downloadable build artifact for pushes to `main` and pull requests. A `vX.Y.Z` tag starts a separate release workflow: verify the tag matches `package.json`, run the checks, build the Chrome ZIP, calculate SHA-256 checksums, then publish both assets to GitHub Releases. Only the publishing job receives write permission; no store credentials are needed.

```sh
# On a clean main branch after changes have been reviewed:
npm version patch
# Review the version commit, then publish the branch and tag:
git push origin main --follow-tags
```

Never overwrite a published release tag. Releases from GitHub require the manual update process above.

## Privacy and independence

The only extension API permission is `storage`. Content scripts run on the listed Airbnb domains and do not send page data anywhere. No cookies, browsing history, credentials, or booking data are stored. See [privacy](docs/privacy.md).

An independent project, not affiliated with or endorsed by Airbnb.
