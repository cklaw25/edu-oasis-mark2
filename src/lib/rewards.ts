// Learn-to-earn: finishing a world session pays MOE.
//   base     200   for showing up and playing
//   skill  0-800   scaled by accuracy (how much you got right)
//   review 0-1000  accuracy × how much you had forgotten, so reviewing a fading island pays most
// Total 200-2000 MOE per session, rounded to the nearest 10.
export function sessionReward(accuracy: number, recallBefore: number) {
  const a = Math.min(1, Math.max(0, accuracy));
  const forgotten = 1 - Math.min(1, Math.max(0, recallBefore));
  const total = 200 + 800 * a + 1000 * a * forgotten;
  return Math.round(total / 10) * 10;
}
