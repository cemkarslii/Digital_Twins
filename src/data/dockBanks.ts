import type { BuildingFace, DockBank, DockDoor } from '../types/docks';
import { DEFAULT_BUILDINGS } from './factoryLayout';
import { LOADING_DOCK } from './loadingDock';

/**
 * Truck dock doors of the campus, in scaled-plan metres. Door positions are derived from the
 * building they belong to, so moving or resizing a building moves its docks with it.
 */
const NORMALS: Record<BuildingFace, [number, number]> = {
  north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0],
};

/** Clear wall left between the outermost door centre and the building corner. */
const CORNER_CLEARANCE = 3;

/** Dock-high doors: sill at trailer-bed height, opening and spacing between door centres. */
export const DOCK_HIGH = { sill: 1.2, doorWidth: 3, doorHeight: 3, spacing: 5 } as const;

interface BankSpec extends Omit<DockBank, 'doors'> {
  /** Door centres along the face: world X on north/south faces, world Z on east/west faces. */
  doorsAlong: readonly number[];
}

const evenly = (first: number, count: number, spacing: number) =>
  Array.from({ length: count }, (_, index) => first + index * spacing);

const BANK_SPECS: BankSpec[] = [
  {
    // The recessed court beside GES-02; its floor, walls and doors come from LOADING_DOCK.
    id: 'dock-ek03', code: 'R1', name: 'EK-03 Doğu Rampası', buildingId: LOADING_DOCK.buildingId,
    face: 'east', style: 'recessed', apronY: LOADING_DOCK.floorY, stallLength: 0,
    doorsAlong: LOADING_DOCK.doorCentersZ,
  },
  {
    // Centred on DEP-06's south wall, facing the west warehouse loading yard (≈ 36 m deep).
    id: 'dock-dep06', code: 'R2', name: 'Batı Depo Güney Rampası', buildingId: 'bldg-06',
    face: 'south', style: 'dock_high', apronY: 0, stallLength: 18,
    doorsAlong: evenly(-86.5, 6, DOCK_HIGH.spacing),
  },
  {
    // GES-02's north wall in front of the interior loading area, on the level approach pad north of it.
    // Doors stay east of the storage sections, which have no truck doors of their own.
    id: 'dock-ges02', code: 'R3', name: 'GES-02 Kuzey Rampası', buildingId: 'bldg-02',
    face: 'north', style: 'dock_high', apronY: LOADING_DOCK.streetY, stallLength: 18,
    doorsAlong: evenly(190, 4, DOCK_HIGH.spacing),
  },
];

function buildBank({ doorsAlong, ...spec }: BankSpec): DockBank {
  const building = DEFAULT_BUILDINGS.find((item) => item.id === spec.buildingId);
  if (!building) throw new Error(`Rampa ${spec.code}: ${spec.buildingId} binası bulunamadı.`);
  if (building.rotationY !== 0) throw new Error(`Rampa ${spec.code}: döndürülmüş binalar desteklenmez.`);

  const [cx, , cz] = building.position;
  const { width, depth } = building.dimensions;
  const normal = NORMALS[spec.face];
  const alongX = normal[1] !== 0;
  const center = alongX ? cx : cz;
  const half = (alongX ? width : depth) / 2;
  const wall = alongX ? cz + normal[1] * depth / 2 : cx + normal[0] * width / 2;

  const doors = doorsAlong.map((along, index): DockDoor => {
    if (Math.abs(along - center) > half - CORNER_CLEARANCE) {
      throw new Error(`Rampa ${spec.code}: ${index + 1}. kapı ${building.code} cephesinin dışında.`);
    }
    return {
      id: `${spec.code}-${String(index + 1).padStart(2, '0')}`,
      bankId: spec.id,
      number: index + 1,
      position: alongX ? [along, spec.apronY, wall] : [wall, spec.apronY, along],
      normal,
    };
  });
  return { ...spec, doors };
}

export const DOCK_BANKS: DockBank[] = BANK_SPECS.map(buildBank);
export const DOCK_DOORS: DockDoor[] = DOCK_BANKS.flatMap((bank) => bank.doors);

/** Rotation that turns local +Z onto the wall's outward normal. */
export const faceRotation = ([nx, nz]: [number, number]) => Math.atan2(nx, nz);

/** Door row midpoint on the wall. */
export function bankCenter(bank: DockBank): [number, number, number] {
  const sum = bank.doors.reduce((acc, { position }) => [acc[0] + position[0], acc[1] + position[1], acc[2] + position[2]], [0, 0, 0]);
  return sum.map((value) => value / bank.doors.length) as [number, number, number];
}

/** Painted stall area in front of a dock-high bank, where landscape items must not stand. */
export function isDockApron(x: number, z: number, clearance = 0) {
  return DOCK_BANKS.some((bank) => {
    if (bank.style !== 'dock_high') return false;
    const [nx, nz] = bank.doors[0].normal;
    const [ox, , oz] = bank.doors[0].position;
    const out = (x - ox) * nx + (z - oz) * nz;
    const along = nz !== 0 ? x : z;
    const ends = bank.doors.map(({ position }) => (nz !== 0 ? position[0] : position[2]));
    return out >= -clearance && out <= bank.stallLength + clearance
      && along >= Math.min(...ends) - DOCK_HIGH.spacing / 2 - clearance
      && along <= Math.max(...ends) + DOCK_HIGH.spacing / 2 + clearance;
  });
}
