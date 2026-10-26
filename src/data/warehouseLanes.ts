import type { RackLane, WarehouseBin, WarehouseLayout, WarehouseSection } from '../types/warehouse';
import { WAREHOUSE_CONFIG } from './warehouseConfig';
import { WAREHOUSE_LAYOUT } from './warehouseLayout';
import { compartmentSeat } from './storageLocations';

const pad2 = (value: number) => String(value).padStart(2, '0');
const SIDES = ['west', 'east'] as const;

/** Bins in one level (tier) of a section: both faces of every aisle, one per position. */
export const binsPerLevel = (section: WarehouseSection) => section.aisles.length * SIDES.length * WAREHOUSE_CONFIG.rackSystem.positionsPerLevel;

/**
 * Deep lanes of the warehouse, the unit the WMS stores pallets in (its bins). The WMS numbers bins
 * within a section and tier without row or bay (both `*`), so the numbering is fixed here and only
 * here: aisle faces west to east (A1 west, A1 east, A2 west, A2 east), each face from position 1 at
 * the corridor end to position 53. Bin 54 is therefore A1 east, position 1.
 * Lanes are ordered section, level, bin number, so a section's lanes form one index range.
 */
export function generateRackLanes(layout: WarehouseLayout): RackLane[] {
  const { levels, positionsPerLevel, rowPitch } = WAREHOUSE_CONFIG.rackSystem;
  const lanes: RackLane[] = [];
  for (const section of layout.sections) {
    const faces = section.aisles.flatMap((aisle) => SIDES.map((side) => {
      // A row west of its aisle faces east (+1).
      const rows = section.rows.filter((row) => row.aisleId === aisle.id && (row.facing === 1) === (side === 'west'));
      if (!rows.length) throw new Error(`Depo hatları: ${aisle.id} ${side} yüzünde raf sırası yok.`);
      const xs = rows.map((row) => row.centerX);
      const west = Math.min(...xs) - rowPitch / 2, east = Math.max(...xs) + rowPitch / 2;
      return { aisle, side, row: rows[0], frontX: side === 'west' ? east : west, backX: side === 'west' ? west : east };
    }));
    for (let level = 1; level <= levels; level++) {
      faces.forEach((face, f) => {
        for (let position = 1; position <= positionsPerLevel; position++) {
          const [, y, z] = compartmentSeat(face.row, level, position, layout.floorY);
          lanes.push({
            index: lanes.length,
            id: `${face.aisle.id}${face.side === 'west' ? 'W' : 'E'}-L${pad2(level)}-P${pad2(position)}`,
            sectionId: section.id, aisleId: face.aisle.id, side: face.side, level, position,
            slot: f * positionsPerLevel + position,
            frontX: face.frontX, backX: face.backX, z, y,
          });
        }
      });
    }
  }
  return lanes;
}

let cached: RackLane[] | null = null;
/** Lanes of the campus warehouse, built on first use. */
export function getRackLanes(): RackLane[] {
  return cached ??= generateRackLanes(WAREHOUSE_LAYOUT);
}

let bySlot: Map<string, RackLane> | null = null;
const slotKey = (sectionId: string, level: number, slot: number) => `${sectionId}:${level}:${slot}`;

/**
 * Lane a WMS bin stands for: `Warehouse → Code` picks the section, the tier code the level and the
 * bin code the bin number. Undefined when the layout has no such place.
 */
export function laneOfBin(bin: Pick<WarehouseBin, 'warehouseCode' | 'tierCode' | 'binCode'>): RackLane | undefined {
  bySlot ??= new Map(getRackLanes().map((lane) => [slotKey(lane.sectionId, lane.level, lane.slot), lane]));
  const section = WAREHOUSE_LAYOUT.sections.find((item) => item.wmsCode === bin.warehouseCode);
  if (!section || !/^\d+$/.test(bin.tierCode) || !/^\d+$/.test(bin.binCode)) return undefined;
  return bySlot.get(slotKey(section.id, Number(bin.tierCode), Number(bin.binCode)));
}

/** `W01-A1-west`: one side of one aisle, the face its lanes open onto. */
export const faceKey = (lane: Pick<RackLane, 'aisleId' | 'side'>) => `${lane.aisleId}-${lane.side}`;

/** One aisle face of a section: its bin numbers in every level, and where it stands. */
export interface AisleFace {
  key: string;
  aisleId: string;
  side: RackLane['side'];
  firstSlot: number;
  lastSlot: number;
  frontX: number;
  backX: number;
  /** Z of position 1 (corridor end) and of the last position. */
  startZ: number;
  endZ: number;
  /** Lane indices by level (index 0 = level 1), then by position (index 0 = position 1). */
  lanes: number[][];
}

const facesBySection = new Map<string, AisleFace[]>();
/** Faces of a section, west to east, in WMS bin order. */
export function sectionFaces(sectionId: string): AisleFace[] {
  let faces = facesBySection.get(sectionId);
  if (faces) return faces;
  const byKey = new Map<string, AisleFace>();
  for (const lane of getRackLanes()) {
    if (lane.sectionId !== sectionId) continue;
    let face = byKey.get(faceKey(lane));
    if (!face) {
      face = {
        key: faceKey(lane), aisleId: lane.aisleId, side: lane.side, firstSlot: lane.slot, lastSlot: lane.slot,
        frontX: lane.frontX, backX: lane.backX, startZ: lane.z, endZ: lane.z,
        lanes: Array.from({ length: WAREHOUSE_CONFIG.rackSystem.levels }, () => []),
      };
      byKey.set(face.key, face);
    }
    if (lane.level === 1) {
      face.lastSlot = lane.slot;
      face.endZ = lane.z;
    }
    face.lanes[lane.level - 1][lane.position - 1] = lane.index;
  }
  facesBySection.set(sectionId, faces = [...byKey.values()]);
  return faces;
}
