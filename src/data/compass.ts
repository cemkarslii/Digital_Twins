const SECTORS = [
  ['K', 'Kuzeyden'], ['KD', 'Kuzeydoğudan'], ['D', 'Doğudan'], ['GD', 'Güneydoğudan'],
  ['G', 'Güneyden'], ['GB', 'Güneybatıdan'], ['B', 'Batıdan'], ['KB', 'Kuzeybatıdan'],
] as const;

/** Eight-way compass point for a bearing; `from` names the direction something approaches from. */
export function compass(bearingDeg: number) {
  const [short, from] = SECTORS[Math.round((((bearingDeg % 360) + 360) % 360) / 45) % 8];
  return { short, from };
}

/** Scene plan: north is −Z and east is +X. Bearing of a horizontal direction, 0–360°. */
export const sceneBearing = (dx: number, dz: number) => ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;

/** Smallest angle between two bearings, 0–180°. */
export function bearingGap(a: number, b: number) {
  const gap = Math.abs(a - b) % 360;
  return gap > 180 ? 360 - gap : gap;
}
