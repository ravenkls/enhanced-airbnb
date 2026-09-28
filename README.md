# Enhanced Airbnb

See the price of a stay **per night**, **per person**, and **per person per night**, alongside Airbnb's original prices.

A Chrome Manifest V3 extension built with TypeScript and WXT. No account, backend, analytics, or tracking. The extension reads prices locally and only stores your on/off preference.

## Install from GitHub

1. Open [Releases](https://github.com/ravenkls/enhanced-airbnb/releases/latest) and download `enhanced-airbnb-<version>-chrome.zip` under **Assets**. The source-code ZIP is not the extension.
2. Unzip into a permanent folder.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
5. Refresh Airbnb, select your dates and guests, and browse. Pin the extension to access its on/off switch.

To update, replace the files in that folder with the next release, click **Reload** on the extension, and refresh Airbnb. GitHub installations do not update automatically. Chrome Web Store publishing is a separate future distribution option.

## What it does

| Surface                                                           | Enhancement                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Search cards and map preview cards using the same price component | Three derived prices below the original price                            |
| Property booking panel and supported sticky booking prices        | Three derived prices next to the booking price                           |
| Map price markers                                                 | Per-person/night line; hover or keyboard-focus it for the full breakdown |

For **£1,200 total**, **4 guests**, **3 nights**: **£400/night**, **£300/person for the stay**, **£100/person/night**.

- Splits adults + children equally. Infants and pets are not counted.
- Uses each card's own dates, including recommendations for similar dates.
- Recognises discounted totals and preserves currency symbols. No exchange-rate conversion.
- Derived prices are averages, rounded to at most two decimal places. A rounded Airbnb source price can introduce small differences from checkout.
- Uses only the fees and taxes already included in the displayed price. A nightly-rate basis is explicitly labelled because extra fees may apply.
- Updates as Airbnb adds results or changes prices, URLs, and booking controls.
- With no reliable guest count, shows nothing. With guests but no dates, shows only derivations that do not require stay length.

### Current scope

Version 0.1 supports **English-language pages** on `airbnb.com`, `airbnb.co.uk`, `airbnb.ca`, `airbnb.com.au`, `airbnb.co.nz`, and `airbnb.ie` (including subdomains). Switch Airbnb's language to English if needed. Amount parsing covers common currency symbols and codes, including comma/period decimal formats.

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
