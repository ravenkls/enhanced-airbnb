import type { PriceMode } from './annotation';
export const modeControlTag = 'enhanced-airbnb-mode';

export function createPriceModeControl(doc: Document, onChange: (mode: PriceMode) => void) {
  const host = doc.createElement(modeControlTag);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = `:host{display:inline-block;font-family:inherit;font-size:14px;margin-inline-start:16px;vertical-align:middle;font-weight:400}div{display:inline-flex;align-items:center;gap:2px;background:#f7f7f7;border:1px solid #ddd;border-radius:24px;padding:3px}button{font:inherit;border:0;border-radius:20px;padding:7px 12px;background:transparent;color:#6a6a6a;cursor:pointer;white-space:nowrap}button[aria-pressed=true]{background:#fff;color:#222;box-shadow:0 1px 4px #0002;font-weight:600}button:focus-visible{outline:2px solid #222;outline-offset:2px}button:disabled{opacity:.45;cursor:default}@media(max-width:600px){:host{margin-inline-start:8px}button{padding:6px 9px}}`;
  const group = doc.createElement('div');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Price display');
  const buttons = new Map<PriceMode, HTMLButtonElement>();
  for (const [value, label] of [
    ['total', 'Total'],
    ['person', 'Per person'],
  ] as const) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => onChange(value));
    buttons.set(value, button);
    group.append(button);
  }
  shadow.append(style, group);
  return {
    update(mode: PriceMode, available: boolean) {
      for (const [value, button] of buttons) {
        button.setAttribute('aria-pressed', String(value === mode));
        button.disabled = value === 'person' && !available;
        button.title =
          value === 'person'
            ? available
              ? 'Split stay prices equally between adults and children'
              : 'Select guests to see per-person prices'
            : 'Show prices for the whole group';
      }
      const title = doc.querySelector('[data-testid="stays-page-heading"]');
      const heading = title?.closest('h1, h2') ?? title ?? doc.querySelector('main h1');
      if (heading && host.parentNode !== heading) heading.append(host);
    },
    remove() {
      host.remove();
    },
  };
}
