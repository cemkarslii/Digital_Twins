import type { RackLane } from '../../../types/warehouse';
import { sectionFaces } from '../../../data/warehouseLanes';

/**
 * Focus cuts the rack like a section drawing: the chosen level and every level below it are drawn,
 * the chosen one on top, and with a face chosen only that face's rack. Selecting a lane chooses its
 * level, so the lane is always on top of the cut. Floor, walls and aisle signs stay.
 */
export interface FocusState {
  level: number | null;
  face: string | null;
}

interface FocusSource {
  warehouseLevel: number | null;
  warehouseFace: string | null;
}

export const focusOf = (s: FocusSource): FocusState => ({ level: s.warehouseLevel, face: s.warehouseFace });
export const focusChanged = (a: FocusSource, b: FocusSource) =>
  a.warehouseLevel !== b.warehouseLevel || a.warehouseFace !== b.warehouseFace;
export const hasFocus = (focus: FocusState) => focus.level !== null || focus.face !== null;

/** A lane at or below the chosen level, on the chosen face. */
export function inFocus(focus: FocusState, lane: Pick<RackLane, 'level'>, laneFace: string) {
  return (focus.level === null || lane.level <= focus.level) && (focus.face === null || laneFace === focus.face);
}

/** Plan X span and rack level of a rack part. */
export interface PartExtent {
  minX: number;
  maxX: number;
  level: number;
}

/** Rack in focus: X span (infinite without a face) and top level. */
export interface FocusRegion {
  minX: number;
  maxX: number;
  maxLevel: number;
}

/** Region of the rack the focus covers, or null when nothing is focused. */
export function focusRegion(focus: FocusState, sectionId: string): FocusRegion | null {
  if (!hasFocus(focus)) return null;
  const face = sectionFaces(sectionId).find((item) => item.key === focus.face);
  return {
    minX: face ? Math.min(face.frontX, face.backX) : -Infinity,
    maxX: face ? Math.max(face.frontX, face.backX) : Infinity,
    maxLevel: focus.level ?? Infinity,
  };
}

const EPS = 0.01;

/** Whether a part is in the region; a part that only touches its edge (the next face's rack) stays out. */
export function inRegion(region: FocusRegion, part: PartExtent) {
  return part.level <= region.maxLevel && part.maxX > region.minX + EPS && part.minX < region.maxX - EPS;
}
