/**
 * Interior warehouse of GES-02. Every coordinate is building-local, in scaled-plan metres:
 * origin at the building's centre on the ground, +X east, +Z south (north is -Z), Y up.
 */
export type CompassSide = 'north' | 'south' | 'east' | 'west';

/** Axis-aligned floor rectangle. */
export interface PlanRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WarehouseSectionSpec {
  id: string;
  /** Location code prefix, e.g. `W01`. */
  code: string;
  /** `Warehouse → Code` of this section in the WMS bin data. */
  wmsCode: string;
  name: string;
  row: 'north' | 'south';
  column: 'west' | 'east';
  /** Wall that carries the entrances; it must face the central corridor. */
  entranceSide: 'north' | 'south';
  entranceCount: number;
}

export interface WarehouseEntrance {
  id: string;
  sectionId: string;
  number: number;
  /** Centre of the opening at floor level, on the corridor-side face of the wall. */
  center: [number, number];
  side: 'north' | 'south';
  width: number;
  height: number;
}

/**
 * One storage row of a rack block: 53 compartments per level along Z. Rows of a block stand
 * shoulder to shoulder on shared uprights, with no aisle between them, so a row is reached from
 * its block's aisle side `laneDepth` positions deep (deep-lane storage: pallet shuttle or drive-in).
 * Position 1 sits at the cross-aisle end, next to the corridor.
 */
export interface RackRow {
  id: string;
  sectionId: string;
  /** 1-based, west to east within the section. */
  number: number;
  centerX: number;
  /** Direction from the row towards its access aisle: +1 east, -1 west. */
  facing: 1 | -1;
  aisleId: string;
  /** 1 = the row on the aisle; deeper rows are loaded through it. */
  laneDepth: number;
  /** Positions in this row's lane, from the aisle to the back of the block. */
  laneLength: number;
  /** Z of position 1's corridor-side frame, and the step towards position 53. */
  startZ: number;
  stepZ: 1 | -1;
}

/** Rows packed between a wall and an aisle (end block) or between two aisles (inner block). */
export interface RackBlock {
  id: string;
  sectionId: string;
  minX: number;
  maxX: number;
  /** X of every upright line; neighbouring rows share the line between them. */
  uprightX: number[];
  rows: RackRow[];
  minZ: number;
  maxZ: number;
}

/** Forklift aisle through the racks; one per entrance, straight in line with it. */
export interface WarehouseAisle extends PlanRect {
  id: string;
  sectionId: string;
  centerX: number;
  width: number;
}

export interface WarehouseSection extends WarehouseSectionSpec {
  bounds: PlanRect;
  entrances: WarehouseEntrance[];
  blocks: RackBlock[];
  rows: RackRow[];
  aisles: WarehouseAisle[];
  /** Cross aisle between the rack ends and the entrance wall. */
  crossAisle: PlanRect;
}

export interface DockOpening {
  id: string;
  /** Door centre X on the north wall. */
  x: number;
  width: number;
}

export interface WarehouseLayout {
  buildingId: string;
  /** Top of the dock-high slab. */
  floorY: number;
  ceilingY: number;
  /** Inside faces of the perimeter wall lining. */
  interior: PlanRect;
  /** Storage block west of the loading area. */
  storage: PlanRect;
  corridor: PlanRect;
  loadingArea: PlanRect;
  office: PlanRect & { height: number; doorZ: number };
  dockOpenings: DockOpening[];
  sections: WarehouseSection[];
}

/**
 * One deep lane at one level, the unit the WMS calls a bin: it runs across the rows of a block
 * from its aisle to the back and holds pallets back to back. The scene shows it as one marker.
 */
export interface RackLane {
  /** Index into the live stock arrays; stable for a given layout. */
  index: number;
  /** `W01-A1W-L01-P01`: aisle, side of the aisle, level, position; equals `StorageLocation.laneId`. */
  id: string;
  sectionId: string;
  aisleId: string;
  side: 'west' | 'east';
  level: number;
  /** 1 at the corridor end. */
  position: number;
  /** WMS bin number within its section and level (tier). */
  slot: number;
  /** Plan X where the lane opens onto its aisle, and of its back end. */
  frontX: number;
  backX: number;
  z: number;
  /** Top of the lane's beams. */
  y: number;
}

/** Bin master data from the WMS: where a bin is and how many pallets it takes. */
export interface WarehouseBin {
  /** WMS record id; state changes refer to it. */
  id: string;
  /** `1-1-1`: warehouse, tier, bin. */
  code: string;
  warehouseCode: string;
  warehouseName: string;
  tierCode: string;
  tierName: string;
  binCode: string;
  /** Pallets the bin takes back to back (`Max Pallet Count`). */
  capacity: number;
}

/** Current content of one bin. */
export interface BinState {
  binId: string;
  palletCount: number;
  /** Epoch milliseconds of the change in the WMS; an older state never replaces a newer one. */
  updatedAt: number;
}

/** Choices that lead to one bin, in order: section, aisle face, level, then the bin (lane) itself. */
export type WarehouseStep = 'section' | 'face' | 'level' | 'bin';

/** Open section display: lane markers coloured by fill, or every pallet with its load inside the full rack. */
export type WarehouseView = 'occupancy' | 'stock';

/** `unknown`: no WMS bin or no state for the lane yet, so it is never shown as empty. */
export type LaneStatus = 'empty' | 'partial' | 'full' | 'unknown';

/** One addressable pallet position. Logical data only; rendering derives from the same layout. */
export interface StorageLocation {
  /** `W01-R01-L01-P01`. */
  id: string;
  sectionId: string;
  rowId: string;
  level: number;
  position: number;
  /**
   * Deep lane this position belongs to: same aisle side, level and position along the rows.
   * `laneDepth` 1 is at the aisle; `laneLength` is the deepest.
   */
  laneId: string;
  laneDepth: number;
  laneLength: number;
  /** Pallet seat centre (x, z) and the top of its beam (y), building-local. */
  seat: [number, number, number];
}
