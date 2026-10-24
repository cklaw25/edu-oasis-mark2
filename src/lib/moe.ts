// MOE (Moe Done) prices, plus the demo balance kept in the profile until player wallets are wired up.
export const WORLD_UNLOCK_MOE = 10_000;
export const STARTING_MOE = 30_000;

export function formatMoe(n: number) {
  return n.toLocaleString("en-US");
}
