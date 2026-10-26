import type { TruckShipment, Waybill } from '../types/shipment';

/** Shared validation of the truck and waybill fields, so every feed yields the same shape. */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isTimestamp = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && Number.isFinite(Date.parse(value));

function parseWaybill(value: unknown): Waybill | null {
  if (!isObject(value) || !isText(value.number) || !isTimestamp(value.issuedAt)
    || !isText(value.senderFullName) || !isText(value.productName)
    || !isObject(value.quantity) || !isNumber(value.quantity.value) || value.quantity.value < 0
    || !(value.quantity.unit === 'kg' || value.quantity.unit === 'ton')) return null;
  const range = value.temperatureRangeC;
  if (!(range === null || (Array.isArray(range) && range.length === 2
    && isNumber(range[0]) && isNumber(range[1]) && range[0] <= range[1]))) return null;
  return {
    number: value.number,
    issuedAt: value.issuedAt,
    senderFullName: value.senderFullName,
    productName: value.productName,
    quantity: { value: value.quantity.value, unit: value.quantity.unit },
    temperatureRangeC: range === null ? null : [range[0], range[1]],
  };
}

/** The truck and waybill part of a feed record, or null if any of it is missing or malformed. */
export function parseTruckShipment(value: unknown): TruckShipment | null {
  if (!isObject(value)) return null;
  const waybill = parseWaybill(value.waybill);
  if (!waybill || !isText(value.licensePlate) || !(value.trailerPlate === null || isText(value.trailerPlate))
    || !isText(value.carrierName) || !isText(value.driverFullName)) return null;
  return {
    licensePlate: value.licensePlate,
    trailerPlate: value.trailerPlate,
    carrierName: value.carrierName,
    driverFullName: value.driverFullName,
    waybill,
  };
}
