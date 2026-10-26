import type { TruckShipment } from './shipment';

export type LogisticsArea = 'gate_security' | 'truck_park';
export type LogisticsStatus = 'at_gate' | 'weighing' | 'waiting';

/** A truck on site, at the gate or in the truck park, with its shared truck and waybill fields. */
export interface LogisticsRecord extends TruckShipment {
  id: string;
  area: LogisticsArea;
  status: LogisticsStatus;
  weighingStartedAt: string | null;
  /** Parked vehicle in the scene, when the truck is physically on site. */
  vehicleId?: string;
}
