// The descent ends here; the court is level at street height beyond it (≈ 4.8 % slope), so
// GES-02's north wall east of it is level frontage for dock bank R3.
const SLOPE_END_X = 146;

/** Recessed loading court on the east wall of the northern production annex (dock bank R1). */
export const LOADING_DOCK = {
  buildingId: 'bldg-03',
  wallX: 102,
  minZ: -10,
  maxZ: 7.5,
  flatEndX: 122,
  slopeEndX: SLOPE_END_X,
  entryX: 190,
  floorY: -1.05,
  streetY: 0.11,
  doorCentersZ: [-5, 2],
  // Level pad from the end of the descent to the east road; it also carries the R3 stalls.
  approach: { minX: SLOPE_END_X, maxX: 209, minZ: -26, maxZ: 7.5 },
  /** North-east corner of the pad left out: the east perimeter road bends through it. */
  approachRoadCorner: { minX: 196, maxX: 209, minZ: -26, maxZ: -12 },
} as const;

export const LOADING_PIT = {
  minX: LOADING_DOCK.wallX,
  maxX: LOADING_DOCK.entryX,
  minZ: LOADING_DOCK.minZ,
  maxZ: LOADING_DOCK.maxZ,
};

export function loadingFloorHeight(x: number) {
  const t = Math.max(0, Math.min(1, (x - LOADING_DOCK.flatEndX) / (LOADING_DOCK.slopeEndX - LOADING_DOCK.flatEndX)));
  return LOADING_DOCK.floorY + (LOADING_DOCK.streetY - LOADING_DOCK.floorY) * t;
}

export function isLoadingAccess(x: number, z: number, clearance = 0) {
  return [LOADING_PIT, LOADING_DOCK.approach].some((area) =>
    x >= area.minX - clearance && x <= area.maxX + clearance &&
    z >= area.minZ - clearance && z <= area.maxZ + clearance);
}
