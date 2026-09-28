# Visual direction

A small travel companion for splitting a stay, designed to fit beside Airbnb's own prices.

- Paper `#ffffff`, ink `#263b3a`, secondary text `#626868`, sea green `#23675f`, pale green `#edf7f3`, border `#dce5e2`.
- System sans serif for compact, familiar browser UI; tabular numbers for comparisons.
- Left-aligned annotations below the original price. Each metric stays together and wraps as a unit. The popup uses a simple receipt layout with one highlighted per-person/night result.
- Map labels use a narrow secondary line below the original pill. Hover/focus reveals the full calculation.

Layout: original price → three derived metrics → guest/night basis.
Popup: name → toggle → worked example → short explanation.

Review: avoid a separate dashboard or decorative cards. The only accent identifies the shared price; original Airbnb prices retain visual priority. Shadow DOM isolates annotation styles from Airbnb styles.
