// Phaser-free so React components can use it during SSR.
export interface LabObject {
  id: string;
  icon: string;
  label: string;
  x: number;
  y: number;
}

/** Lay out n objects around the room, leaving the middle free to walk. */
export function layoutObjects<T extends { icon: string; label: string }>(items: T[]): (T & LabObject)[] {
  const spots = [
    [160, 150], [500, 120], [840, 150], [160, 460], [840, 460], [500, 530],
    [330, 300], [670, 300], [330, 520], [670, 520], [330, 120], [670, 120],
  ];
  return items.slice(0, spots.length).map((it, i) => ({ ...it, id: `c${i}`, x: spots[i][0], y: spots[i][1] }));
}
