import type { Price, StayContext } from '../domain/pricing';
import { cardContext, pageContext } from './context';
import { parseMoney, parsePrice } from './money';

export interface PriceTarget {
  element: HTMLElement;
  price: Price;
  context: StayContext;
  surface: 'listing' | 'detail' | 'map';
}

export interface PriceSource {
  read(doc: Document, url: URL): PriceTarget[];
}

export const annotationTag = 'enhanced-airbnb-price';
const priceRows = '[data-testid="price-availability-row"]';
const bookingSections =
  '[data-section-id="BOOK_IT_SIDEBAR"], [data-section-id="BOOK_IT_NAV"], [data-section-id="BOOK_IT_FLOATING_FOOTER"]';

function originalText(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  clone
    .querySelectorAll(`${annotationTag}, s, del, [hidden], [style*="line-through"]`)
    .forEach((node) => node.remove());
  return clone.textContent ?? '';
}

function readPrice(element: Element): Price | null {
  for (const node of element.querySelectorAll('[aria-label]')) {
    const price = parsePrice(node.getAttribute('aria-label') ?? '');
    if (price) return price;
  }
  // Smallest labelled price excludes neighbouring financing and cancellation copy.
  for (const node of [...element.querySelectorAll('span, button, div')].toReversed()) {
    if (node.closest(annotationTag)) continue;
    const text = originalText(node);
    if (text.length > 180) continue;
    const price = parsePrice(text);
    if (price) return price;
  }
  return parsePrice(originalText(element));
}

export const airbnbSource: PriceSource = {
  read(doc, url) {
    const context = pageContext(doc, url);
    const targets: PriceTarget[] = [];
    if (!/^en(?:-|$)/i.test(doc.documentElement.lang || 'en')) return targets;
    for (const element of doc.querySelectorAll<HTMLElement>(priceRows)) {
      const price = readPrice(element);
      if (price)
        targets.push({
          element,
          price,
          context: cardContext(element, context, url),
          surface: 'listing',
        });
    }
    for (const section of doc.querySelectorAll<HTMLElement>(bookingSections)) {
      const element =
        section.querySelector<HTMLElement>('[style*="--pricing-guest-display-price-alignment"]') ??
        section;
      const price = readPrice(element);
      if (!price) continue;
      targets.push({ element, price, context, surface: 'detail' });
    }
    const listingTargets = targets.filter(
      (target) => target.surface === 'listing' && target.context.nights === context.nights,
    );
    const bases = new Set(listingTargets.map((target) => target.price.basis));
    const sharedBasis = bases.size === 1 ? listingTargets[0]?.price.basis : undefined;
    for (const element of doc.querySelectorAll<HTMLElement>(
      '[data-testid="map/markers/BasePillMarker"]',
    )) {
      const text = originalText(element);
      const money = parseMoney(text);
      const explicit = parsePrice(text);
      if (!money || (!explicit && !sharedBasis)) continue;
      targets.push({
        element,
        price: explicit ?? { money, basis: sharedBasis!, nights: null },
        context,
        surface: 'map',
      });
    }
    return targets;
  },
};
