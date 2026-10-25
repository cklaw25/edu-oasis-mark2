// MOE (Moe Done) prices, plus the demo balance kept in the profile until player wallets are wired up.
// Amounts can have up to 3 decimals (0.001 MOE is the smallest step the game uses).
export const STARTING_MOE = 30;
/** every shop world costs this, so a new player can buy exactly one to try */
export const MARKET_PRICE_MOE = 30;
/** growing a world after the 2 free generations */
export const GENERATE_PRICE_MOE = 10;
export const MEMBERSHIP_PRICE_MOE = 90;

/** Round to the game's smallest MOE step (0.001), which also clears floating-point dust. */
export function roundMoe(n: number) {
  return Math.round(n * 1000) / 1000;
}

/** Round down to the smallest MOE step, for splitting a pool without paying out more than it holds. */
export function floorMoe(n: number) {
  return Math.floor(Math.round(n * 1e6) / 1000) / 1000;
}

export function formatMoe(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
