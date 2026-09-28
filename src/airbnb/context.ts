import { nightsBetween, type StayContext } from '../domain/pricing';

export function contextFromUrl(url: URL): StayContext {
  const params = url.searchParams;
  const count = (name: string): number | null => {
    const raw = params.get(name);
    return raw !== null && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw))
      ? Number(raw)
      : null;
  };
  const adults = count('adults');
  const children = params.has('children') ? count('children') : 0;
  const guests = adults !== null && children !== null ? adults + children : count('guests');
  return {
    guests: guests !== null && guests > 0 ? guests : null,
    nights: nightsBetween(
      params.get('check_in') ?? params.get('checkin'),
      params.get('check_out') ?? params.get('checkout'),
    ),
  };
}

export function pageContext(doc: Document, url: URL): StayContext {
  const context = contextFromUrl(url);
  if (context.guests === null) {
    const label = doc.querySelector('[data-testid="little-search-guests"]')?.textContent ?? '';
    const count = /\b(\d+)\s+guests?\b/i.exec(label);
    if (count) context.guests = Number(count[1]) || null;
  }
  if (url.pathname.startsWith('/rooms/')) {
    const guestControl = doc.getElementById('GuestPicker-book_it-trigger');
    if (guestControl) {
      const count = /\b(\d+)\s+guests?\b/i.exec(guestControl.textContent ?? '');
      context.guests = count ? Number(count[1]) || null : null;
    }
    const dateControl = doc.querySelector(
      '[data-testid="book-it-default"] [aria-label^="Change dates"]',
    );
    if (dateControl) {
      const dates = dateControl.getAttribute('aria-label')?.match(/\d{4}-\d{2}-\d{2}/g);
      context.nights = nightsBetween(dates?.[0] ?? null, dates?.[1] ?? null);
    }
  }
  return context;
}

export function cardContext(element: Element, page: StayContext, url: URL): StayContext {
  const card = element.closest('[data-testid="card-container"]');
  const link = card?.querySelector<HTMLAnchorElement>('a[href*="/rooms/"]');
  if (!link) return page;
  const target = new URL(link.getAttribute('href') ?? '', url);
  const local = contextFromUrl(target);
  // Recommended stays can have different dates from the search itself.
  return {
    guests: local.guests ?? page.guests,
    nights:
      target.searchParams.has('check_in') || target.searchParams.has('checkin')
        ? local.nights
        : page.nights,
  };
}
