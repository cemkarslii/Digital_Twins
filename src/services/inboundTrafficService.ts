import mockData from '../data/inboundTraffic.mock.json';
import type {
  GeoPoint, InboundAssessment, InboundException, InboundItem, InboundPhase, InboundShipment,
  InboundSnapshot, InboundTelemetry, InboundVehicle,
} from '../types/inbound';

// Operating thresholds. Distances are road kilometres to the gate.
export const APPROACHING_KM = 50;
export const ARRIVING_KM = 10;
export const DELAY_TOLERANCE_MIN = 15;
export const SIGNAL_TIMEOUT_MIN = 15;
const STOPPED_BELOW_KMH = 3;

interface InboundAdapter {
  getSnapshot(signal?: AbortSignal): Promise<InboundSnapshot>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isNonNegative = (value: unknown): value is number => isNumber(value) && value >= 0;
const isTimestamp = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && Number.isFinite(Date.parse(value));
const VEHICLE_TYPES: readonly InboundVehicle['vehicleType'][] = ['semi_trailer', 'box_truck', 'flatbed'];

function parseShipment(value: unknown): InboundShipment | null {
  if (!isObject(value) || !isText(value.waybillNumber) || !isText(value.senderFullName)
    || !isText(value.productName) || !isText(value.originCity)
    || !isObject(value.quantity) || !isNonNegative(value.quantity.value)
    || !(value.quantity.unit === 'kg' || value.quantity.unit === 'ton')) return null;
  const range = value.temperatureRangeC;
  if (!(range === null || (Array.isArray(range) && range.length === 2
    && isNumber(range[0]) && isNumber(range[1]) && range[0] <= range[1]))) return null;
  return {
    waybillNumber: value.waybillNumber,
    senderFullName: value.senderFullName,
    productName: value.productName,
    quantity: { value: value.quantity.value, unit: value.quantity.unit },
    originCity: value.originCity,
    temperatureRangeC: range === null ? null : [range[0], range[1]],
  };
}

const isGeoPoint = (value: unknown): value is GeoPoint => isObject(value)
  && isNumber(value.lat) && Math.abs(value.lat) <= 90 && isNumber(value.lng) && Math.abs(value.lng) <= 180;

function parseTelemetry(value: unknown): InboundTelemetry | null {
  if (!isObject(value) || !isTimestamp(value.recordedAt) || !isText(value.locationLabel)
    || !isNonNegative(value.speedKmh)
    || !(value.cargoTemperatureC === null || isNumber(value.cargoTemperatureC))
    || !isGeoPoint(value.position)) return null;
  return {
    recordedAt: value.recordedAt,
    position: { lat: value.position.lat, lng: value.position.lng },
    locationLabel: value.locationLabel,
    speedKmh: value.speedKmh,
    cargoTemperatureC: value.cargoTemperatureC,
  };
}

function parseVehicle(value: unknown, index: number): InboundVehicle {
  const shipment = isObject(value) ? parseShipment(value.shipment) : null;
  const telemetry = isObject(value) ? parseTelemetry(value.telemetry) : null;
  if (!isObject(value) || !shipment || !telemetry
    || !isText(value.id) || !isText(value.licensePlate)
    || !(value.trailerPlate === null || isText(value.trailerPlate))
    || !VEHICLE_TYPES.includes(value.vehicleType as InboundVehicle['vehicleType'])
    || !isText(value.carrierName) || !isText(value.driverFullName)
    || !isObject(value.route) || !isText(value.route.corridor)
    || !isNumber(value.route.totalKm) || value.route.totalKm <= 0
    || !isNonNegative(value.route.remainingKm) || value.route.remainingKm > value.route.totalKm
    || !isTimestamp(value.appointmentAt) || !isTimestamp(value.estimatedArrivalAt)) {
    throw new Error(`Yoldaki araç kaydı geçersiz: ${index + 1}. satır.`);
  }
  return {
    id: value.id,
    licensePlate: value.licensePlate,
    trailerPlate: value.trailerPlate,
    vehicleType: value.vehicleType as InboundVehicle['vehicleType'],
    carrierName: value.carrierName,
    driverFullName: value.driverFullName,
    shipment,
    route: { corridor: value.route.corridor, totalKm: value.route.totalKm, remainingKm: value.route.remainingKm },
    appointmentAt: value.appointmentAt,
    estimatedArrivalAt: value.estimatedArrivalAt,
    telemetry,
  };
}

function parseSnapshot(value: unknown): InboundSnapshot {
  if (!isObject(value) || !isTimestamp(value.asOf) || !isGeoPoint(value.gate) || !Array.isArray(value.vehicles)) {
    throw new Error('Yoldaki araç veri kaynağı geçersiz.');
  }
  const vehicles = value.vehicles.map(parseVehicle);
  if (new Set(vehicles.map((vehicle) => vehicle.id)).size !== vehicles.length) {
    throw new Error('Yoldaki araç kimlikleri benzersiz olmalıdır.');
  }
  return { asOf: value.asOf, gate: { lat: value.gate.lat, lng: value.gate.lng }, vehicles };
}

const minutesBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 60_000);

/** Initial great-circle bearing, degrees clockwise from true north. */
function bearing(from: GeoPoint, to: GeoPoint) {
  const rad = Math.PI / 180;
  const φ1 = from.lat * rad, φ2 = to.lat * rad, Δλ = (to.lng - from.lng) * rad;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

/** Business rules over one record; pure, so a live feed reuses them unchanged. */
export function assessInbound(vehicle: InboundVehicle, asOf: string, gate: GeoPoint): InboundAssessment {
  const { route, telemetry, shipment } = vehicle;
  const phase: InboundPhase = route.remainingKm <= ARRIVING_KM ? 'arriving'
    : route.remainingKm <= APPROACHING_KM ? 'approaching' : 'en_route';
  const delayMinutes = minutesBetween(vehicle.appointmentAt, vehicle.estimatedArrivalAt);
  const signalAgeMinutes = Math.max(0, minutesBetween(telemetry.recordedAt, asOf));
  const signalLost = signalAgeMinutes > SIGNAL_TIMEOUT_MIN;

  const exceptions: InboundException[] = [];
  if (delayMinutes > DELAY_TOLERANCE_MIN) exceptions.push('delayed');
  // A stale fix says nothing about current speed.
  if (!signalLost && telemetry.speedKmh < STOPPED_BELOW_KMH) exceptions.push('stopped');
  if (signalLost) exceptions.push('signal_lost');
  const range = shipment.temperatureRangeC, temperature = telemetry.cargoTemperatureC;
  if (range && temperature !== null && (temperature < range[0] || temperature > range[1])) exceptions.push('cold_chain');

  return {
    phase,
    exceptions,
    delayMinutes,
    minutesToArrival: Math.max(0, minutesBetween(asOf, vehicle.estimatedArrivalAt)),
    progressPct: Math.round(((route.totalKm - route.remainingKm) / route.totalKm) * 100),
    signalAgeMinutes,
    bearingDeg: Math.round(bearing(gate, telemetry.position)),
  };
}

/** Fictional local demo feed. Replace this adapter with the telematics/TMS integration. */
const inboundAdapter: InboundAdapter = {
  async getSnapshot(signal) {
    signal?.throwIfAborted();
    return parseSnapshot(mockData);
  },
};

/** Read-only boundary consumed by the UI: validated records with their assessment, soonest arrival first. */
export async function getInboundTraffic(signal?: AbortSignal): Promise<{ asOf: string; items: InboundItem[] }> {
  const snapshot = await inboundAdapter.getSnapshot(signal);
  signal?.throwIfAborted();
  const items = snapshot.vehicles
    .map((vehicle) => ({ vehicle, assessment: assessInbound(vehicle, snapshot.asOf, snapshot.gate) }))
    .sort((a, b) => Date.parse(a.vehicle.estimatedArrivalAt) - Date.parse(b.vehicle.estimatedArrivalAt));
  return { asOf: snapshot.asOf, items };
}
