import { annotationTag, type PriceTarget } from '../airbnb/adapter';
import { formatMoney, parseMoney, scaleMoneyText } from '../airbnb/money';
import type { Breakdown } from '../domain/pricing';
import { writeAttribute, writeText } from './dom-writes';

export type PriceMode = 'total' | 'person';
export interface PricePresentation {
  restore(): void;
}
export interface AnnotationRenderer {
  render(
    target: PriceTarget,
    breakdown: Breakdown,
    locale: string,
    mode: PriceMode,
  ): PricePresentation;
}

export const annotationRenderer: AnnotationRenderer = {
  render(target, breakdown, locale, mode) {
    const doc = target.element.ownerDocument;
    const undo: (() => void)[] = [];
    const hasStay = target.price.basis === 'total' || breakdown.nights !== null;
    // A nightly rate without dates cannot be presented as a whole-stay map price.
    if (!hasStay) return { restore() {} };
    const factor =
      (target.price.basis === 'night' ? breakdown.nights! : 1) /
      (mode === 'person' ? breakdown.guests : 1);
    const transform = (text: string) => {
      let value = scaleMoneyText(text, factor, locale).replace(
        /\bfor\s+\d+\s+nights?\b/gi,
        'total',
      );
      if (target.price.basis === 'night')
        value = value.replace(/(?:per |a |\/\s*)?\bnight\b/gi, 'total');
      if (mode === 'person') value = value.replace(/\btotal\b/gi, 'per person');
      return value;
    };
    const root =
      target.element.querySelector<HTMLElement>(
        '[style*="--pricing-guest-display-price-alignment"]',
      ) ?? target.element;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node as Text;
      if (text.parentElement?.closest(`${annotationTag}, script, style`)) continue;
      // Financing and cancellation copy are not part of the accommodation price.
      if (
        /^\s*(?:pay\b|due\b|free cancellation\b|instalment\b|installment\b)/i.test(
          text.parentElement?.textContent ?? '',
        )
      )
        continue;
      const original = text.data;
      const next = transform(original);
      if (next === original) continue;
      writeText(text, next);
      undo.push(() => {
        if (text.data === next) writeText(text, original);
      });
    }
    const labels = [...root.querySelectorAll('[aria-label]')];
    if (root.hasAttribute('aria-label')) labels.push(root);
    const marker = target.surface === 'map' ? root.closest('[role="button"]') : null;
    if (marker?.hasAttribute('aria-label') && !labels.includes(marker)) labels.push(marker);
    for (const element of labels) {
      const original = element.getAttribute('aria-label')!;
      if (!parseMoney(original)) continue;
      let next = transform(original);
      if (target.surface === 'map' && mode === 'person' && !next.includes('per person'))
        next += ' per person';
      if (next === original) continue;
      writeAttribute(element, 'aria-label', next);
      undo.push(() => {
        if (element.getAttribute('aria-label') === next)
          writeAttribute(element, 'aria-label', original);
      });
    }
    if (target.surface !== 'map') {
      const nightly = mode === 'person' ? breakdown.perPersonNight : breakdown.nightly;
      if (nightly !== null) {
        const host = doc.createElement(annotationTag);
        host.dataset.surface = target.surface;
        const shadow = host.attachShadow({ mode: 'open' });
        const style = doc.createElement('style');
        style.textContent =
          ':host{display:inline;font:inherit;color:inherit;margin-inline-start:8px;white-space:nowrap}span{font:inherit;font-weight:400;color:#6a6a6a}';
        const label = doc.createElement('span');
        label.textContent = `· ${formatMoney(nightly, target.price.money, locale)} / night`;
        host.title =
          mode === 'person'
            ? `Per person, per night. Split between ${breakdown.guests} guests.`
            : 'Average price per night.';
        shadow.append(style, label);
        const button = [...root.querySelectorAll('button')].find((el) =>
          parseMoney(el.textContent ?? ''),
        );
        const anchor =
          button ??
          [...root.querySelectorAll('span')].find(
            (el) => parseMoney(el.textContent ?? '') && !el.querySelector('span'),
          ) ??
          root;
        anchor.append(host);
        undo.push(() => host.remove());
      }
    }
    return {
      restore() {
        for (const restore of undo.toReversed()) restore();
      },
    };
  },
};
