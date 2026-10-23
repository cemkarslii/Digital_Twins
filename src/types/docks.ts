export type BuildingFace = 'north' | 'south' | 'east' | 'west';

/**
 * A row of truck dock doors on one building face (static layout).
 * `recessed`: trucks reverse down into a court to reach doors at grade.
 * `dock_high`: doors sit at trailer-bed height above a level apron.
 */
export interface DockBank {
  id: string;
  /** Short operator code; door ids are `${code}-${number}`. */
  code: string;
  name: string;
  buildingId: string;
  face: BuildingFace;
  style: 'recessed' | 'dock_high';
  /** Apron level in front of the doors. */
  apronY: number;
  /** Length of the painted stalls measured out from the wall. */
  stallLength: number;
  doors: DockDoor[];
}

export interface DockDoor {
  id: string;
  bankId: string;
  number: number;
  /** Door centre on the wall surface, at apron level. */
  position: [number, number, number];
  /** Unit outward normal of the wall, [x, z]. */
  normal: [number, number];
}

export type DockDirection = 'inbound' | 'outbound';

/** The truck currently at a door. Handling progress is counted in pallets. */
export interface DockVisit {
  licensePlate: string;
  carrierName: string;
  direction: DockDirection;
  productName: string;
  dockedAt: string;
  plannedDepartureAt: string;
  handledPallets: number;
  totalPallets: number;
}

export type DockDoorRecord =
  | { doorId: string; state: 'free' }
  | { doorId: string; state: 'out_of_service'; reason: string }
  | { doorId: string; state: 'occupied'; visit: DockVisit };

export interface DockSnapshot {
  /** Feed time; dwell and overrun are judged against it, never the viewer's clock. */
  asOf: string;
  doors: DockDoorRecord[];
}

/** Derived from pallets handled: not started, handling, or done and waiting to pull away. */
export type DockVisitPhase = 'waiting' | 'in_progress' | 'ready';

export interface DockVisitAssessment {
  phase: DockVisitPhase;
  progressPct: number;
  dwellMinutes: number;
  /** Minutes past the planned departure; 0 while on schedule. */
  overrunMinutes: number;
}

/** One door as the UI sees it; `record` is null when the feed has no row for the door. */
export interface DockDoorState {
  door: DockDoor;
  record: DockDoorRecord | null;
  assessment: DockVisitAssessment | null;
}
