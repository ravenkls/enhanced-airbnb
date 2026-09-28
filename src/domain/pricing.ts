export interface StayContext {
  guests: number | null;
  nights: number | null;
}

export interface Money {
  amount: number;
  token: string;
  suffix: boolean;
}

export interface Price {
  money: Money;
  basis: 'total' | 'night';
  nights: number | null;
}

export interface Breakdown {
  nightly: number | null;
  perPerson: number | null;
  perPersonNight: number | null;
  guests: number;
  nights: number | null;
}

export function positiveInteger(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value > 0;
}

export function calculate(price: Price, context: StayContext): Breakdown | null {
  const { amount } = price.money;
  if (!Number.isFinite(amount) || amount <= 0 || !positiveInteger(context.guests)) return null;
  const nights = price.nights ?? context.nights;
  const validNights = positiveInteger(nights) ? nights : null;
  const nightly = price.basis === 'night' ? amount : validNights ? amount / validNights : null;
  const total = price.basis === 'total' ? amount : validNights ? amount * validNights : null;
  return {
    nightly,
    perPerson: total === null ? null : total / context.guests,
    perPersonNight: nightly === null ? null : nightly / context.guests,
    guests: context.guests,
    nights: validNights,
  };
}

const parse = (value: string | null): number | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
};

export function nightsBetween(checkIn: string | null, checkOut: string | null): number | null {
  const start = parse(checkIn);
  const end = parse(checkOut);
  if (start === null || end === null) return null;
  const nights = (end - start) / 86_400_000;
  return positiveInteger(nights) ? nights : null;
}
