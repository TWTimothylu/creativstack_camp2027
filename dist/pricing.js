// Taiwan time: the offer includes all of November 30, 2026.
export const EARLY_BIRD_END = Date.parse('2026-11-02T00:00:00+08:00');
export function earlyBirdDiscount(now = Date.now()) { return now < EARLY_BIRD_END ? 500 : 0; }
export function campTotal(base, earlyDays = 0, now = Date.now()) { return base - earlyBirdDiscount(now) + earlyDays * 100; }
