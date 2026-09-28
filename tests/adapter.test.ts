import fixture from './fixtures/search.html?raw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { airbnbSource, annotationTag } from '../src/airbnb/adapter';
import { createEnhancer, observePage } from '../src/application/enhancer';
import { annotationRenderer } from '../src/ui/annotation';

const url = new URL(
  'https://www.airbnb.co.uk/s/London/homes?adults=4&checkin=2026-11-10&checkout=2026-11-14',
);
beforeEach(() => {
  document.documentElement.lang = 'en-GB';
  document.body.innerHTML = fixture;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Airbnb adapter', () => {
  it('reads current prices, per-card dates, and map basis', () => {
    const targets = airbnbSource.read(document, url);
    expect(targets).toHaveLength(3);
    expect(targets[0]?.price.money.amount).toBe(1200);
    expect(targets[1]?.context.nights).toBe(3);
    expect(targets[2]).toMatchObject({
      surface: 'map',
      price: { basis: 'total', money: { amount: 1200 } },
    });
  });
  it('does not guess a bare map price without list evidence', () => {
    document
      .querySelectorAll('[data-testid="price-availability-row"]')
      .forEach((el) => el.remove());
    expect(airbnbSource.read(document, url)).toHaveLength(0);
  });
  it('skips unsupported languages', () => {
    document.documentElement.lang = 'de';
    expect(airbnbSource.read(document, url)).toHaveLength(0);
  });
  it('finds detail and sticky prices outside hidden screen-reader spans', () => {
    document.body.innerHTML =
      '<div data-section-id="BOOK_IT_SIDEBAR"><div style="--pricing-guest-display-price-alignment:flex-start"><button><span>£680 total</span></button><span style="position:absolute;width:1px">£680 total</span></div></div><div data-section-id="BOOK_IT_NAV"><div>£680 total</div></div>';
    const targets = airbnbSource.read(
      document,
      new URL('https://www.airbnb.com/rooms/1?adults=4&check_in=2026-11-10&check_out=2026-11-14'),
    );
    expect(targets).toHaveLength(2);
    expect(targets[0]?.element.getAttribute('style')).toContain(
      '--pricing-guest-display-price-alignment',
    );
  });
});
describe('render lifecycle', () => {
  it('renders once, updates, and removes stale annotations', () => {
    const enhancer = createEnhancer(document, () => url, airbnbSource, annotationRenderer);
    enhancer.refresh();
    enhancer.refresh();
    expect(document.querySelectorAll(annotationTag)).toHaveLength(2);
    expect(document.querySelector(annotationTag)?.shadowRoot?.textContent).toContain(
      '£300 / night',
    );
    const price = document.querySelector('[aria-label]')!;
    price.setAttribute('aria-label', '£1,600 total, originally £1,800');
    enhancer.refresh();
    expect(document.querySelector(annotationTag)?.shadowRoot?.textContent).toContain(
      '£400 / night',
    );
    enhancer.setEnabled(false);
    expect(document.querySelectorAll(annotationTag)).toHaveLength(0);
    enhancer.setEnabled(true);
    expect(document.querySelectorAll(annotationTag)).toHaveLength(2);
    document
      .querySelectorAll('[data-testid="price-availability-row"]')
      .forEach((el) => (el.textContent = 'Add dates for prices'));
    enhancer.refresh();
    expect(document.querySelectorAll(annotationTag)).toHaveLength(0);
    enhancer.destroy();
  });
  it('responds to URL guest changes and clears missing context', () => {
    let current = url;
    const enhancer = createEnhancer(document, () => current, airbnbSource, annotationRenderer);
    document.body.innerHTML = '<div data-section-id="BOOK_IT_SIDEBAR">£1,200 total</div>';
    enhancer.refresh();
    current = new URL(
      'https://www.airbnb.com/rooms/1?adults=6&checkin=2026-11-10&checkout=2026-11-14',
    );
    enhancer.refresh();
    expect(document.querySelector(annotationTag)?.shadowRoot?.textContent).toContain(
      '£300 / night',
    );
    current = new URL('https://www.airbnb.com/rooms/1');
    enhancer.refresh();
    expect(document.querySelectorAll(annotationTag)).toHaveLength(0);
  });
  it('observes new cards without responding to its own writes', async () => {
    vi.useFakeTimers();
    const enhancer = createEnhancer(document, () => url, airbnbSource, annotationRenderer);
    const refresh = vi.fn(enhancer.refresh);
    const stop = observePage(document, refresh);
    await vi.advanceTimersByTimeAsync(300);
    expect(refresh).toHaveBeenCalledTimes(1);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div data-testid="price-availability-row">£800 total</div>',
    );
    await vi.advanceTimersByTimeAsync(300);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(document.querySelectorAll(annotationTag)).toHaveLength(3);
    stop();
    enhancer.destroy();
    document.body.append(document.createElement('div'));
    await vi.advanceTimersByTimeAsync(300);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});

describe('shared price mode', () => {
  it('changes native prices and discounts once, including maps, and restores them', () => {
    const original = document.body.innerHTML;
    const enhancer = createEnhancer(document, () => url, airbnbSource, annotationRenderer);
    enhancer.setMode('person');
    enhancer.refresh();
    const row = document.querySelector('[data-testid="price-availability-row"]')!;
    expect(row.textContent).toContain('£300');
    expect(row.textContent).toContain('£375');
    expect(row.textContent).toContain('per person');
    expect(row.textContent).toContain('Pay £0 today');
    expect(row.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe(
      '£300 per person, originally £375',
    );
    expect(row.querySelector(annotationTag)?.shadowRoot?.textContent).toContain('£75 / night');
    const map = document.querySelector('[data-testid="map/markers/BasePillMarker"]')!;
    expect(map.textContent).toContain('£300');
    expect(map.querySelector(annotationTag)).toBeNull();
    enhancer.setMode('total');
    expect(row.textContent).toContain('£1,200');
    expect(map.textContent).toContain('£1,200');
    enhancer.setEnabled(false);
    expect(document.body.innerHTML).toBe(original);
  });
  it('preserves external price updates while per-person mode is on', () => {
    document.body.innerHTML =
      '<div data-testid="price-availability-row"><span>£1,200 total</span></div>';
    const enhancer = createEnhancer(document, () => url, airbnbSource, annotationRenderer);
    enhancer.setMode('person');
    document.querySelector('span')!.firstChild!.textContent = '£800 total';
    enhancer.refresh();
    expect(document.querySelector('span')?.textContent).toBe('£200 per person');
    enhancer.destroy();
    expect(document.querySelector('span')?.textContent).toBe('£800 total');
  });
  it('places a working switch beside the results heading', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<h1><span data-testid="stays-page-heading" aria-hidden="true">80 homes within map area</span></h1>',
    );
    const changed = vi.fn();
    const enhancer = createEnhancer(document, () => url, airbnbSource, annotationRenderer, changed);
    enhancer.refresh();
    const control = document.querySelector('h1 enhanced-airbnb-mode')!;
    expect(control.closest('[aria-hidden="true"]')).toBeNull();
    const person = control.shadowRoot!.querySelectorAll('button')[1]!;
    person.click();
    expect(person.getAttribute('aria-pressed')).toBe('true');
    expect(changed).toHaveBeenCalledWith('person');
    expect(
      document.querySelector('[data-testid="map/markers/BasePillMarker"]')?.textContent,
    ).toContain('£300');
  });
  it('does not create mutation feedback loops when rewriting native prices', async () => {
    vi.useFakeTimers();
    const enhancer = createEnhancer(document, () => url, airbnbSource, annotationRenderer);
    const refresh = vi.fn(enhancer.refresh);
    const stop = observePage(document, refresh);
    enhancer.setMode('person');
    await vi.advanceTimersByTimeAsync(500);
    expect(refresh).toHaveBeenCalledTimes(1);
    document
      .querySelector('[aria-label]')!
      .setAttribute('aria-label', '£800 total, originally £1,200');
    await vi.advanceTimersByTimeAsync(500);
    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
    enhancer.destroy();
  });
});
