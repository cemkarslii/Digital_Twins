export type LogisticsArea = 'gate_security' | 'truck_park';
export type LogisticsStatus = 'at_gate' | 'weighing' | 'waiting';

export interface LogisticsRecord {
  id: string;
  area: LogisticsArea;
  senderFullName: string;
  licensePlate: string;
  waybillDate: string;
  status: LogisticsStatus;
  weighingStartedAt: string | null;
  productName: string;
  waybillQuantity: {
    value: number;
    unit: 'kg' | 'ton';
  };
  driverFullName: string;
  /** Parked vehicle in the scene, when the truck is physically on site. */
  vehicleId?: string;
}
