// MOE (Moe Done) prices, plus the demo balance kept in the profile until player wallets are wired up.
export const STARTING_MOE = 30_000;
/** every shop world costs this, so a new player can buy exactly one to try */
export const MARKET_PRICE_MOE = 30_000;
/** growing a world after the 2 free generations */
export const GENERATE_PRICE_MOE = 10_000;
export const MEMBERSHIP_PRICE_MOE = 90_000;

export function formatMoe(n: number) {
  return n.toLocaleString("en-US");
}
