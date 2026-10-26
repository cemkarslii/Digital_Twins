import mockData from '../data/logistics.mock.json';
import type { LogisticsArea, LogisticsRecord, LogisticsStatus } from '../types/logistics';
import { parseTruckShipment } from './truckShipment';

interface LogisticsAdapter {
  getRecords(signal?: AbortSignal): Promise<LogisticsRecord[]>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArea(value: unknown): value is LogisticsArea {
  return value === 'gate_security' || value === 'truck_park';
}

function isStatus(value: unknown): value is LogisticsStatus {
  return value === 'at_gate' || value === 'weighing' || value === 'waiting';
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function parseRecord(value: unknown, index: number): LogisticsRecord {
  const truck = parseTruckShipment(value);
  if (!isObject(value) || !truck
    || !isNonemptyString(value.id)
    || !isArea(value.area)
    || !isStatus(value.status)
    || !(value.weighingStartedAt === null || isTimestamp(value.weighingStartedAt))
    || !(value.vehicleId === undefined || isNonemptyString(value.vehicleId))) {
    throw new Error(`Lojistik kaydı geçersiz: ${index + 1}. satır.`);
  }

  return {
    id: value.id,
    area: value.area,
    ...truck,
    status: value.status,
    weighingStartedAt: value.weighingStartedAt,
    ...(value.vehicleId === undefined ? {} : { vehicleId: value.vehicleId }),
  };
}

function parseRecords(value: unknown): LogisticsRecord[] {
  if (!isObject(value) || !Array.isArray(value.records)) {
    throw new Error('Lojistik veri kaynağı geçersiz.');
  }
  const records = value.records.map(parseRecord);
  if (new Set(records.map((record) => record.id)).size !== records.length) {
    throw new Error('Lojistik kayıt kimlikleri benzersiz olmalıdır.');
  }
  return records;
}

/** Fictional local demo records. Replace this adapter when a backend becomes available. */
const logisticsAdapter: LogisticsAdapter = {
  async getRecords(signal) {
    signal?.throwIfAborted();
    return parseRecords(mockData);
  },
};

/** Read-only boundary consumed by the UI; no remote endpoint or simulated network delay. */
export async function getLogisticsRecords(
  area: LogisticsArea,
  signal?: AbortSignal,
): Promise<LogisticsRecord[]> {
  signal?.throwIfAborted();
  const records = await logisticsAdapter.getRecords(signal);
  signal?.throwIfAborted();
  return records.filter((record) => record.area === area);
}
