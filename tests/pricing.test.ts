import { describe, expect, it } from 'vitest';
import { calculate, nightsBetween, type Price } from '../src/domain/pricing';
import { formatMoney, parseMoney, parsePrice } from '../src/airbnb/money';
import { contextFromUrl, pageContext } from '../src/airbnb/context';

const price: Price = {
  money: { amount: 1200, token: '£', suffix: false },
  basis: 'total',
  nights: null,
};
describe('stay calculations', () => {
  it('splits the original amount without intermediate rounding', () => {
    expect(calculate(price, { guests: 4, nights: 3 })).toEqual({
      nightly: 400,
      perPerson: 300,
      perPersonNight: 100,
      guests: 4,
      nights: 3,
    });
    expect(
      calculate({ ...price, money: { ...price.money, amount: 100 } }, { guests: 3, nights: 3 })
        ?.perPersonNight,
    ).toBeCloseTo(100 / 9);
  });
  it('does not invent dates or guests', () => {
    expect(calculate(price, { guests: null, nights: 3 })).toBeNull();
    expect(calculate(price, { guests: 0, nights: 3 })).toBeNull();
    expect(calculate(price, { guests: 4, nights: null })).toMatchObject({
      nightly: null,
      perPerson: 300,
      perPersonNight: null,
    });
    expect(calculate({ ...price, basis: 'night' }, { guests: 4, nights: null })).toMatchObject({
      nightly: 1200,
      perPerson: null,
      perPersonNight: 300,
    });
  });
  it('uses explicit price night counts before search dates', () => {
    expect(calculate({ ...price, nights: 2 }, { guests: 4, nights: 3 })?.nightly).toBe(600);
  });
  it.each([
    [0, 3],
    [-1, 3],
    [NaN, 3],
    [Infinity, 3],
    [4.5, 3],
  ])('rejects invalid guest count %s', (guests, nights) => {
    expect(calculate(price, { guests, nights })).toBeNull();
  });
  it('counts UTC calendar days across DST and leap years', () => {
    expect(nightsBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(nightsBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(nightsBetween('2026-02-30', '2026-03-03')).toBeNull();
    expect(nightsBetween('2026-03-30', '2026-03-28')).toBeNull();
    expect(nightsBetween(null, null)).toBeNull();
  });
});
describe('money and price interpretation', () => {
  it.each([
    ['£1,234.56', 1234.56],
    ['1.234,56 €', 1234.56],
    ['1\u202f234,56 EUR', 1234.56],
    ['CHF 1’234.50', 1234.5],
    ['$1,234', 1234],
    ['₹1,20,000', 120000],
    ['¥10,000', 10000],
  ])('reads %s', (text, amount) => {
    expect(parseMoney(text)?.amount).toBe(amount);
  });
  it('keeps the actual displayed currency symbol', () => {
    expect(formatMoney(12.345, { token: 'CA$', amount: 1, suffix: false }, 'en-GB')).toBe(
      'CA$12.35',
    );
  });
  it.each([
    '£1,200 total',
    'Total before taxes £1,200',
    '£1,200 for 3 nights',
    '£1,200 total, originally £1,500',
  ])('reads total %s', (text) => {
    expect(parsePrice(text)).toMatchObject({ basis: 'total', money: { amount: 1200 } });
  });
  it.each(['£100 night', '£100 per night', '£100 / night'])('reads nightly rate %s', (text) => {
    expect(parsePrice(text)).toMatchObject({ basis: 'night', money: { amount: 100 } });
  });
  it.each(['£100', '£100 per month', 'Pay £100 today', '£0 total', 'Add dates for prices'])(
    'skips ambiguous price %s',
    (text) => {
      expect(parsePrice(text)).toBeNull();
    },
  );
});
describe('guest and date context', () => {
  it('counts adults and children without infants or pets', () => {
    expect(
      contextFromUrl(
        new URL(
          'https://www.airbnb.com/s/homes?adults=2&children=2&infants=1&pets=2&checkin=2026-11-10&checkout=2026-11-14',
        ),
      ),
    ).toEqual({ guests: 4, nights: 4 });
  });
  it('rejects malformed counts', () => {
    expect(contextFromUrl(new URL('https://www.airbnb.com/?adults=2x')).guests).toBeNull();
  });
  it('uses current detail controls ahead of stale URL values', () => {
    document.body.innerHTML =
      '<div id="GuestPicker-book_it-trigger">6 guests, 1 infant</div><div data-testid="book-it-default"><button aria-label="Change dates; Check-in: 2026-11-10; Checkout: 2026-11-12"></button></div>';
    expect(
      pageContext(
        document,
        new URL('https://www.airbnb.com/rooms/1?adults=2&check_in=2026-11-10&check_out=2026-11-14'),
      ),
    ).toEqual({ guests: 6, nights: 2 });
  });
});
