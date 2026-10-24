// MOE (Moe Done) prices, plus the demo balance kept in the profile until player wallets are wired up.
export const WORLD_PRICE_MOE = 10_000;
export const STARTING_MOE = 30_000;

// Membership: a month of extra learn-to-earn MOE from every game played
export const MEMBERSHIP_PRICE_MOE = 90_000;
export const MEMBERSHIP_DAYS = 30;
export const MEMBERSHIP_BONUS = 0.5;

export function formatMoe(n: number) {
  return n.toLocaleString("en-US");
}
