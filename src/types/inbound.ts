import type { VehicleEntity } from './factory';

/**
 * Trucks on public roads, heading to the campus. Records hold only what the carrier's telematics
 * and the route engine report; phase and exceptions are derived (see inboundTrafficService).
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Last fix reported by the vehicle's telematics unit. */
export interface InboundTelemetry {
  recordedAt: string;
  position: GeoPoint;
  /** Reverse-geocoded place name delivered with the fix. */
  locationLabel: string;
  speedKmh: number;
  /** Reefer box reading; null for trailers without a cooling unit. */
  cargoTemperatureC: number | null;
}

export interface InboundShipment {
  waybillNumber: string;
  senderFullName: string;
  productName: string;
  quantity: { value: number; unit: 'kg' | 'ton' };
  originCity: string;
  /** Allowed cargo temperature band in °C; null when the load needs no cold chain. */
  temperatureRangeC: [number, number] | null;
}

export interface InboundVehicle {
  id: string;
  licensePlate: string;
  trailerPlate: string | null;
  vehicleType: VehicleEntity['vehicleType'];
  carrierName: string;
  driverFullName: string;
  shipment: InboundShipment;
  /** Route engine output: planned road distance and what is left of it. */
  route: { corridor: string; totalKm: number; remainingKm: number };
  /** Gate slot booked for this delivery; lateness is measured against it. */
  appointmentAt: string;
  estimatedArrivalAt: string;
  telemetry: InboundTelemetry;
}

/** One feed read. Ages and lateness are judged against `asOf`, never the viewer's clock. */
export interface InboundSnapshot {
  asOf: string;
  /** Campus gate; bearings to vehicles are measured from it. */
  gate: GeoPoint;
  vehicles: InboundVehicle[];
}

/** Distance band to the gate. */
export type InboundPhase = 'en_route' | 'approaching' | 'arriving';

export type InboundException = 'delayed' | 'stopped' | 'signal_lost' | 'cold_chain';

export interface InboundAssessment {
  phase: InboundPhase;
  exceptions: InboundException[];
  /** ETA minus appointment; negative means early. */
  delayMinutes: number;
  minutesToArrival: number;
  progressPct: number;
  signalAgeMinutes: number;
  /** True bearing from the gate to the last fix, 0–360° clockwise from north. */
  bearingDeg: number;
}

export interface InboundItem {
  vehicle: InboundVehicle;
  assessment: InboundAssessment;
}
