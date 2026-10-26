import type { VehicleEntity } from './factory';
import type { TruckShipment } from './shipment';

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

/** A truck on the road, with the same truck and waybill fields as trucks on site. */
export interface InboundVehicle extends TruckShipment {
  id: string;
  vehicleType: VehicleEntity['vehicleType'];
  /** Route engine output: origin, planned road distance and what is left of it. */
  route: { originCity: string; corridor: string; totalKm: number; remainingKm: number };
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
