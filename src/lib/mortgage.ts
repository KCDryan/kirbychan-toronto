/** Minimum down payment in Canada (FCAC): 5% to $500,000, 10% on the part above, 20% from $1.5 million. */
export function minDown(price: number): number {
  if (price >= 1500000) return price * 0.2;
  if (price > 500000) return 25000 + (price - 500000) * 0.1;
  return price * 0.05;
}

/** Monthly payment with the rate compounded semi-annually, as the Interest Act expects. */
export function payment(principal: number, rate: number, years: number): number {
  const r = Math.pow(1 + rate / 2, 1 / 6) - 1;
  const n = years * 12;
  return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** OSFI and FCAC qualifying rate: the greater of the contract rate plus 2% or 5.25%. */
export const qualifyingRate = (rate: number) => Math.max(0.0525, rate + 0.02);

// ponytail: self-check against a hand-checked example ($600,000 over 25 years: 4% -> $3,156, 6% -> $3,839).
if (Math.round(payment(600000, 0.04, 25)) !== 3156 || Math.round(payment(600000, 0.06, 25)) !== 3839) {
  throw new Error('Mortgage payment formula is wrong');
}
