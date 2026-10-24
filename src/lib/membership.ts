// Membership status. Times use the app clock, so the demo "time travel" can show a membership running out.
import { now } from "./clock";
import { MEMBERSHIP_BONUS, MEMBERSHIP_DAYS } from "./moe";
import type { Profile } from "./types";

const DAY = 86_400_000;

export function isMember(p: Profile, t = now()) {
  return (p.membershipUntil ?? 0) > t;
}

/** Whole days left, rounded up, or 0 if not a member. */
export function memberDaysLeft(p: Profile, t = now()) {
  return isMember(p, t) ? Math.ceil((p.membershipUntil! - t) / DAY) : 0;
}

/** Buying while active adds a month onto the current end date instead of wasting what's left. */
export function extendMembership(p: Profile, t = now()) {
  return Math.max(p.membershipUntil ?? 0, t) + MEMBERSHIP_DAYS * DAY;
}

/** Extra MOE a member gets on top of a game's reward, rounded to the nearest 10. */
export function memberBonus(p: Profile, reward: number, t = now()) {
  return isMember(p, t) ? Math.round((reward * MEMBERSHIP_BONUS) / 10) * 10 : 0;
}
