# Privacy

Enhanced Airbnb processes the displayed price, selected guest count and dates locally in your browser to calculate average prices. These values are not sent to a server or saved.

The extension saves one boolean setting (`enabled`) in Chrome's local extension storage. It contains no analytics, trackers, remote scripts, advertising, cookies access, history access, or private Airbnb API calls.

Chrome grants the content script access to the Airbnb domains listed in the manifest. The only additional extension API permission is `storage`, used for the on/off setting. Uninstalling the extension removes its local setting.
