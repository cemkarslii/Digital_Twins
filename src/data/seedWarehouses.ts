import type { BuildingEntity } from '../types/factory';
import { SITE_PLAN_SCALE } from './siteCoordinates';

/**
 * Seed storage precinct: ten identical cold-store sheds on the footprint of the
 * former single seed warehouse (reference units, scaled by DEFAULT_BUILDINGS).
 * Two columns of five with a central service aisle.
 */
const PRECINCT_CENTER: [number, number] = [-88, 44];
const SHED = { width: 16, depth: 11, height: 7 };
const COLUMN_X = [-98.5, -77.5];
const ROW_Z = [16.5, 30.25, 44, 57.75, 71.5];

export const SEED_STORAGE_CENTER = PRECINCT_CENTER;

export const REFERENCE_SEED_WAREHOUSES: BuildingEntity[] = COLUMN_X.flatMap((x, column) =>
  ROW_Z.map((z, row) => {
    const number = String(column * ROW_Z.length + row + 1).padStart(2, '0');
    return {
      id: `seed-${number}`, name: `Tohum Deposu ${number}`, code: `TOH-${number}`, type: 'building' as const,
      category: 'agri_storage' as const, categoryLabel: 'Tohum Depoları',
      dimensions: { ...SHED }, position: [x, SHED.height / 2, z] as [number, number, number], rotationY: 0,
      roofType: 'gable_multi_bay' as const, wallColor: '#cdd3c8', roofColor: '#e0e4dc',
      footprintAreaM2: SHED.width * SHED.depth, operationalStatus: 'Aktif İzleme' as const,
      features: ['Soğuk hava deposu', 'Yalıtımlı sandviç panel iç cephe', 'Dört seviyeli palet rafı', 'Ortak servis koridoruna açılan cephe'],
      description: 'Tohum depoları yerleşkesindeki on özdeş soğuk hava deposundan biri. Ölçüler temsilidir.',
      visible: true,
    };
  }));

/** Cold-room interior in building-local meters (scaled plan). Shared by the 3D scene and the panel. */
export const COLD_ROOM = {
  floorY: 0.5,
  wallPanel: 0.3,
  rackDepth: 1.1,
  flue: 0.2,
  aisle: 3,
  bayLength: 2.75,
  endClearance: 3.2,
  levels: [0.15, 1.65, 3.15, 4.65],
  crate: { width: 1, height: 1.15, length: 1.2 },
  cratesPerBay: 2,
  uprightHeight: 6,
} as const;

export interface RackLayout {
  /** Centers of back-to-back double racks along X. */
  rackCentersX: number[];
  /** Z of rack frames (bay boundaries). */
  frameZ: number[];
  rackLength: number;
  /** Crate seat positions: [x, y (bottom), z]. */
  slots: [number, number, number][];
}

/** Fits as many double racks and bays as the room allows, centered, with aisles between. */
export function rackLayout(width: number, depth: number): RackLayout {
  const c = COLD_ROOM;
  const innerW = width - 2 * c.wallPanel;
  const innerD = depth - 2 * c.wallPanel;
  const doubleDepth = c.rackDepth * 2 + c.flue;
  const pitch = doubleDepth + c.aisle;
  const rackCount = Math.max(0, Math.floor((innerW - c.aisle) / pitch));
  const bays = Math.max(0, Math.floor((innerD - 2 * c.endClearance) / c.bayLength));
  const rackLength = bays * c.bayLength;
  const rackCentersX = Array.from({ length: rackCount }, (_, i) => (i - (rackCount - 1) / 2) * pitch);
  const frameZ = Array.from({ length: bays + 1 }, (_, i) => -rackLength / 2 + i * c.bayLength);

  const slots: [number, number, number][] = [];
  const sideOffset = c.flue / 2 + c.rackDepth / 2;
  for (const x of rackCentersX) for (const side of [-1, 1]) for (let bay = 0; bay < bays; bay++) {
    const bayCenter = frameZ[bay] + c.bayLength / 2;
    for (const level of c.levels) for (let k = 0; k < c.cratesPerBay; k++) {
      const offset = (k - (c.cratesPerBay - 1) / 2) * (c.bayLength / c.cratesPerBay);
      slots.push([x + side * sideOffset, c.floorY + level, bayCenter + offset]);
    }
  }
  return { rackCentersX, frameZ, rackLength, slots };
}

export const SEED_ROOM_LAYOUT = rackLayout(SHED.width * SITE_PLAN_SCALE, SHED.depth * SITE_PLAN_SCALE);
export const SEED_CRATE_CAPACITY = SEED_ROOM_LAYOUT.slots.length;

export function filledCrateCount(occupancyPct: number): number {
  return Math.round(SEED_CRATE_CAPACITY * Math.min(100, Math.max(0, occupancyPct)) / 100);
}
