import type { WarehouseSectionSpec } from '../types/warehouse';
import { DOCK_HIGH } from './dockBanks';

const SECTIONS: readonly WarehouseSectionSpec[] = [
  { id: 'warehouse-1', code: 'W01', wmsCode: '1', name: 'DEPO 1', row: 'north', column: 'west', entranceSide: 'south', entranceCount: 2 },
  { id: 'warehouse-2', code: 'W02', wmsCode: '2', name: 'DEPO 2', row: 'north', column: 'east', entranceSide: 'south', entranceCount: 2 },
  { id: 'warehouse-3', code: 'W03', wmsCode: '3', name: 'DEPO 3', row: 'south', column: 'west', entranceSide: 'north', entranceCount: 2 },
  { id: 'warehouse-4', code: 'W04', wmsCode: '4', name: 'DEPO 4', row: 'south', column: 'east', entranceSide: 'north', entranceCount: 2 },
];

/**
 * Interior warehouse of GES-02, from the annotated floor plan: four storage sections around a
 * horizontal central corridor, a loading area along the east wall and a small office in it. The
 * rack system sets the section widths; the loading area takes the rest and must receive every door
 * of the dock bank. Only relationships and minimum clearances live here; coordinates come from the
 * building and its dock bank (warehouseLayout.ts). Lengths are scaled-plan metres.
 */
export const WAREHOUSE_CONFIG = {
  buildingId: 'bldg-02',
  /** R3 doors on the north wall open into the loading area. */
  dockBankId: 'dock-ges02',
  /** Dock-high slab: trailer beds at the R3 doors are level with the warehouse floor. */
  floorY: DOCK_HIGH.sill,
  shell: {
    /** Inner lining of the outer walls. */
    lining: 0.3,
    /** Interior partition walls. */
    partition: 0.25,
    /** Gap kept under the roof slab. */
    ceilingGap: 0.15,
  },
  sections: SECTIONS,
  corridor: {
    orientation: 'horizontal',
    /** Clear width between the corridor walls: two forklifts passing plus walkway. */
    width: 8,
  },
  /** Opening in the corridor wall, as wide as the aisle behind it. */
  entrance: { width: 3.5, height: 4.6 },
  loadingArea: {
    side: 'east',
    /** Clear floor kept between the outermost dock opening and the storage wall. */
    dockClearance: 2,
    allowTrucksInside: false,
  },
  office: {
    side: 'east',
    /** Centre along the loading area, measured from its north end (annotated plan ≈ mid-length). */
    centerShare: 0.55,
    width: 9,
    length: 18,
    height: 3.4,
    detailedInterior: false,
  },
  rackSystem: {
    levels: 5,
    positionsPerLevel: 53,
    /** Compartment pitch along a row: 0.8 m EUR pallet face, uprights and handling gaps. */
    positionPitch: 1.0,
    /** Row pitch across a block: one 1.2 m pallet deep, sharing uprights with the next row. */
    rowPitch: 1.2,
    upright: 0.09,
    /** Top of the first beam, then one level per pitch. */
    firstLevel: 0.15,
    levelPitch: 1.4,
    beamHeight: 0.12,
    uprightHeight: 7,
    /** Counterbalance forklift aisle; the entrance aisles carry all traffic of a section. */
    minAisle: 3.5,
    /**
     * Rack rows one deep lane spans, from its aisle into the block. Wall blocks are one lane deep,
     * inner blocks two (one per aisle). This sets the drawn depth only; when a lane counts as full
     * comes from its WMS bin (`Max Pallet Count`).
     */
    laneCapacity: 7,
    wallGap: 0.2,
    /** Space behind the rack ends at the outer wall. */
    rearClearance: 0.6,
    /** Turning space between the rack ends and the entrance wall. */
    minCrossAisle: 3.5,
  },
  pallet: { width: 0.8, length: 1.2, height: 0.144, maxLoadHeight: 1.05 },
  /**
   * Section colour by pallet fill (pallets / capacity over lanes with a known state): green below
   * `high`, amber from `high`, red from `full`. Sections carry no colour of their own, so red and
   * green always mean fill.
   */
  fillBands: { high: 0.7, full: 0.9 },
  /** Lane markers by status, and section fill bands, shared by the scene and the panel. */
  stockColors: { empty: '#3fb27f', partial: '#e8b52e', full: '#d9483b', unknown: '#cdd2cd' },
} as const;

export type WarehouseConfig = typeof WAREHOUSE_CONFIG;
