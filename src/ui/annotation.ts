import { annotationTag, type PriceTarget } from '../airbnb/adapter';
import { formatMoney } from '../airbnb/money';
import type { Breakdown } from '../domain/pricing';

export interface AnnotationRenderer {
  render(target: PriceTarget, breakdown: Breakdown, locale: string): HTMLElement;
}

const styles = `
:host { all: initial; display: block; margin-top: 6px; font-family: inherit; color: #365453; }
.summary { font: 12px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.prices { display: flex; flex-wrap: wrap; gap: 2px 12px; }
strong { font-weight: 650; font-variant-numeric: tabular-nums; }
.note { display: block; color: #626868; font-size: 10px; margin-top: 2px; }
:host([data-surface='map']) { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 2px; z-index: 1; }
.map-line { display: block; padding: 2px 7px; border: 1px solid #cbdedb; border-radius: 5px; color: #244b47; background: #f0f8f6; white-space: nowrap; font: 11px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-shadow: 0 1px 2px #00000014; }
.full { display: none; position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); width: max-content; max-width: 240px; padding: 10px; border-radius: 8px; background: white; border: 1px solid #cbdedb; box-shadow: 0 3px 12px #0002; }
:host(:hover) .full, :host(:focus) .full { display: block; }
:host(:focus-visible) { outline: 2px solid #23675f; outline-offset: 2px; }
`;

export const annotationRenderer: AnnotationRenderer = {
  render(target, breakdown, locale) {
    const doc = target.element.ownerDocument;
    const host = doc.createElement(annotationTag);
    host.dataset.surface = target.surface;
    const shadow = host.attachShadow({ mode: 'open' });
    const style = doc.createElement('style');
    style.textContent = styles;
    shadow.append(style);
    const summary = doc.createElement('span');
    summary.className = 'summary';
    const prices = doc.createElement('span');
    prices.className = 'prices';
    const values: [number | null, string][] = [
      [breakdown.nightly, '/ night'],
      [breakdown.perPerson, '/ person for stay'],
      [breakdown.perPersonNight, '/ person / night'],
    ];
    const lines: string[] = [];
    for (const [amount, label] of values) {
      if (amount === null) continue;
      const row = doc.createElement('span');
      const value = doc.createElement('strong');
      value.textContent = formatMoney(amount, target.price.money, locale);
      row.append(value, ` ${label}`);
      prices.append(row);
      lines.push(`${value.textContent} ${label}`);
    }
    const note = doc.createElement('span');
    note.className = 'note';
    note.textContent = `Split between ${breakdown.guests} ${breakdown.guests === 1 ? 'guest' : 'guests'}${breakdown.nights ? ` over ${breakdown.nights} ${breakdown.nights === 1 ? 'night' : 'nights'}` : ''}. ${target.price.basis === 'total' ? 'Based on displayed total.' : 'Based on nightly rate; extra fees may apply.'}`;
    summary.append(prices, note);
    host.title = `${lines.join(' • ')}. ${note.textContent}`;
    if (target.surface === 'map') {
      host.tabIndex = 0;
      host.setAttribute('role', 'note');
      host.setAttribute('aria-label', host.title);
      const compact = doc.createElement('span');
      compact.className = 'map-line';
      const amount = breakdown.perPersonNight ?? breakdown.perPerson;
      if (amount === null) return host;
      compact.textContent = `${formatMoney(amount, target.price.money, locale)} / person${breakdown.perPersonNight === null ? '' : ' / night'}`;
      compact.setAttribute('aria-hidden', 'true');
      summary.classList.add('full');
      shadow.append(compact);
    }
    shadow.append(summary);
    return host;
  },
};
