import type { Money, Price } from '../domain/pricing';

const currency =
  '(?:US\\$|CA\\$|AU\\$|NZ\\$|HK\\$|S\\$|R\\$|USD|GBP|EUR|CAD|AUD|NZD|CHF|JPY|CNY|INR|SEK|NOK|DKK|PLN|BRL|MXN|SGD|HKD|AED|ZAR|THB|KRW|TRY|[£€$¥₹₩฿₺])';
const number =
  "(?:\\d{1,3}(?:,\\d{2})+,\\d{3}(?:\\.\\d{1,2})?|\\d{1,3}(?:[, .\u00a0\u202f’']\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)";
const moneyPattern = `(${currency})\\s*(${number})|(${number})\\s*(${currency})`;

export function parseMoney(text: string): Money | null {
  const match = new RegExp(moneyPattern).exec(text);
  if (!match) return null;
  const token = match[1] ?? match[4];
  const raw = match[2] ?? match[3];
  if (!token || !raw) return null;
  const compact = raw.replace(/[\s’']/g, '');
  const decimal = /[.,]\d{1,2}$/.exec(compact);
  const normal = decimal
    ? compact.slice(0, decimal.index).replace(/[.,]/g, '') + '.' + decimal[0].slice(1)
    : compact.replace(/[.,]/g, '');
  const amount = Number(normal);
  return Number.isFinite(amount) && amount > 0 ? { amount, token, suffix: !!match[4] } : null;
}

export function parsePrice(text: string): Price | null {
  const clean = text.replace(/\s+/g, ' ').trim();
  // Only explicit units are accepted. Deposits, instalments and monthly prices are not stay totals.
  if (/\b(?:month|monthly|today|instalment|installment)\b/i.test(clean)) return null;
  const after = new RegExp(
    `(?:${moneyPattern})\\s*(?:for\\s+)?(?:(\\d+)\\s+nights?\\b|(?:per |a |/\\s*)?night\\b|total\\b)`,
    'i',
  );
  const match = after.exec(clean);
  if (match) {
    const money = parseMoney(match[0]);
    if (!money) return null;
    const count = match[5];
    return {
      money,
      basis: /total\b/i.test(match[0]) || count ? 'total' : 'night',
      nights: count ? Number(count) : null,
    };
  }
  const before = new RegExp(`\\bTotal(?: before taxes)?\\s*:?\\s*(?:${moneyPattern})`, 'i').exec(
    clean,
  );
  const money = before ? parseMoney(before[0]) : null;
  return money ? { money, basis: 'total', nights: null } : null;
}

export function formatMoney(amount: number, money: Money, locale: string): string {
  const formatted = new Intl.NumberFormat(locale || 'en', { maximumFractionDigits: 2 }).format(
    amount,
  );
  return money.suffix
    ? `${formatted} ${money.token}`
    : `${money.token}${/^[A-Z]{3}$/.test(money.token) ? ' ' : ''}${formatted}`;
}
