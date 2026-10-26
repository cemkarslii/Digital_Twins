import type { RackRow, StorageLocation, WarehouseLayout } from '../types/warehouse';
import { WAREHOUSE_CONFIG } from './warehouseConfig';
import { WAREHOUSE_LAYOUT } from './warehouseLayout';

const pad2 = (value: number) => String(value).padStart(2, '0');

/** `W01-R01-L01-P01`: warehouse, rack row, level (1 = floor beam), position (1 = corridor end). */
export const storageLocationId = (rowId: string, level: number, position: number) =>
  `${rowId}-L${pad2(level)}-P${pad2(position)}`;

/** Pallet seat of one compartment: row centre and position pitch, y on top of its beam. */
export function compartmentSeat(row: RackRow, level: number, position: number, floorY: number): [number, number, number] {
  const r = WAREHOUSE_CONFIG.rackSystem;
  return [
    row.centerX,
    floorY + r.firstLevel + (level - 1) * r.levelPitch,
    row.startZ + row.stepZ * (position - 0.5) * r.positionPitch,
  ];
}

/**
 * Every addressable pallet position, row by row, level by level, position by position.
 * The order is stable, so an index into this list can address render instances later.
 */
export function generateStorageLocations(layout: WarehouseLayout): StorageLocation[] {
  const { levels, positionsPerLevel } = WAREHOUSE_CONFIG.rackSystem;
  const locations: StorageLocation[] = [];
  for (const section of layout.sections) for (const row of section.rows) {
    for (let level = 1; level <= levels; level++) for (let position = 1; position <= positionsPerLevel; position++) {
      locations.push({
        id: storageLocationId(row.id, level, position),
        sectionId: section.id, rowId: row.id, level, position,
        laneId: `${row.aisleId}${row.facing === 1 ? 'W' : 'E'}-L${pad2(level)}-P${pad2(position)}`,
        laneDepth: row.laneDepth, laneLength: row.laneLength,
        seat: compartmentSeat(row, level, position, layout.floorY),
      });
    }
  }
  return locations;
}

let cached: StorageLocation[] | null = null;
/** Locations of the campus warehouse, built on first use. */
export function getStorageLocations(): StorageLocation[] {
  return cached ??= generateStorageLocations(WAREHOUSE_LAYOUT);
}

/** Positions per rack row, from the configuration alone. */
export const POSITIONS_PER_ROW = WAREHOUSE_CONFIG.rackSystem.levels * WAREHOUSE_CONFIG.rackSystem.positionsPerLevel;
