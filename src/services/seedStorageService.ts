import mockData from '../data/seedStorage.mock.json';
import type { SeedWarehouseRecord, SeedWarehouseStatus } from '../types/seedStorage';

const STATUSES: readonly SeedWarehouseStatus[] = ['normal', 'temperature_alert', 'maintenance'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isPercent = (value: unknown): value is number => isNumber(value) && value >= 0 && value <= 100;

function parseRecord(value: unknown, index: number): SeedWarehouseRecord {
  if (!isObject(value)
    || !isText(value.buildingId) || !isText(value.productName) || !isText(value.variety)
    || !isText(value.seedClass) || !isText(value.lotNumber)
    || !isNumber(value.temperatureC) || !isNumber(value.targetTemperatureC)
    || !isPercent(value.humidityPct) || !isPercent(value.occupancyPct)
    || !STATUSES.includes(value.status as SeedWarehouseStatus)
    || !isText(value.updatedAt) || !Number.isFinite(Date.parse(value.updatedAt))) {
    throw new Error(`Tohum deposu kaydı geçersiz: ${index + 1}. satır.`);
  }
  return {
    buildingId: value.buildingId,
    productName: value.productName,
    variety: value.variety,
    seedClass: value.seedClass,
    lotNumber: value.lotNumber,
    temperatureC: value.temperatureC,
    targetTemperatureC: value.targetTemperatureC,
    humidityPct: value.humidityPct,
    occupancyPct: value.occupancyPct,
    status: value.status as SeedWarehouseStatus,
    updatedAt: value.updatedAt,
  };
}

/** Fictional local demo records. Replace the body with a backend call when one exists. */
export async function getSeedWarehouseRecords(signal?: AbortSignal): Promise<SeedWarehouseRecord[]> {
  signal?.throwIfAborted();
  if (!isObject(mockData) || !Array.isArray(mockData.warehouses)) {
    throw new Error('Tohum deposu veri kaynağı geçersiz.');
  }
  return mockData.warehouses.map(parseRecord);
}
