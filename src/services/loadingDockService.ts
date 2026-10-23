import mockData from '../data/loadingDocks.mock.json';
import { DOCK_DOORS } from '../data/dockBanks';
import type { DockDoorRecord, DockDoorState, DockSnapshot, DockVisit, DockVisitAssessment } from '../types/docks';

interface DockAdapter {
  getSnapshot(signal?: AbortSignal): Promise<DockSnapshot>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isTimestamp = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && Number.isFinite(Date.parse(value));
const KNOWN_DOORS = new Set(DOCK_DOORS.map((door) => door.id));

function parseVisit(value: unknown): DockVisit | null {
  if (!isObject(value) || !isText(value.licensePlate) || !isText(value.carrierName)
    || !(value.direction === 'inbound' || value.direction === 'outbound') || !isText(value.productName)
    || !isTimestamp(value.dockedAt) || !isTimestamp(value.plannedDepartureAt)
    || Date.parse(value.plannedDepartureAt) < Date.parse(value.dockedAt)
    || !isCount(value.totalPallets) || value.totalPallets === 0
    || !isCount(value.handledPallets) || value.handledPallets > value.totalPallets) return null;
  return {
    licensePlate: value.licensePlate,
    carrierName: value.carrierName,
    direction: value.direction,
    productName: value.productName,
    dockedAt: value.dockedAt,
    plannedDepartureAt: value.plannedDepartureAt,
    handledPallets: value.handledPallets,
    totalPallets: value.totalPallets,
  };
}

function parseRecord(value: unknown, index: number): DockDoorRecord {
  const fail = () => new Error(`Rampa kaydı geçersiz: ${index + 1}. satır.`);
  if (!isObject(value) || !isText(value.doorId)) throw fail();
  if (!KNOWN_DOORS.has(value.doorId)) throw new Error(`Rampa kaydı bilinmeyen kapıya ait: ${value.doorId}.`);
  if (value.state === 'free') return { doorId: value.doorId, state: 'free' };
  if (value.state === 'out_of_service' && isText(value.reason)) {
    return { doorId: value.doorId, state: 'out_of_service', reason: value.reason };
  }
  const visit = value.state === 'occupied' ? parseVisit(value.visit) : null;
  if (!visit) throw fail();
  return { doorId: value.doorId, state: 'occupied', visit };
}

function parseSnapshot(value: unknown): DockSnapshot {
  if (!isObject(value) || !isTimestamp(value.asOf) || !Array.isArray(value.doors)) {
    throw new Error('Rampa veri kaynağı geçersiz.');
  }
  const doors = value.doors.map(parseRecord);
  if (new Set(doors.map((record) => record.doorId)).size !== doors.length) {
    throw new Error('Her kapı için tek rampa kaydı olmalıdır.');
  }
  return { asOf: value.asOf, doors };
}

const minutesBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 60_000);

/** Business rules over one visit; pure, so a live feed reuses them unchanged. */
export function assessVisit(visit: DockVisit, asOf: string): DockVisitAssessment {
  const { handledPallets: handled, totalPallets: total } = visit;
  return {
    phase: handled === 0 ? 'waiting' : handled >= total ? 'ready' : 'in_progress',
    progressPct: Math.round((handled / total) * 100),
    dwellMinutes: Math.max(0, minutesBetween(visit.dockedAt, asOf)),
    overrunMinutes: Math.max(0, minutesBetween(visit.plannedDepartureAt, asOf)),
  };
}

/** Fictional local demo feed. Replace this adapter with the yard/warehouse management integration. */
const dockAdapter: DockAdapter = {
  async getSnapshot(signal) {
    signal?.throwIfAborted();
    return parseSnapshot(mockData);
  },
};

/** Every door of the layout, in layout order, with its record and assessment. */
export async function getDockDoorStates(signal?: AbortSignal): Promise<{ asOf: string; doors: DockDoorState[] }> {
  const snapshot = await dockAdapter.getSnapshot(signal);
  signal?.throwIfAborted();
  const byDoor = new Map(snapshot.doors.map((record) => [record.doorId, record]));
  return {
    asOf: snapshot.asOf,
    doors: DOCK_DOORS.map((door) => {
      const record = byDoor.get(door.id) ?? null;
      return { door, record, assessment: record?.state === 'occupied' ? assessVisit(record.visit, snapshot.asOf) : null };
    }),
  };
}
