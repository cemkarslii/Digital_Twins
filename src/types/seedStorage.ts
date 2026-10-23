export type SeedWarehouseStatus = 'normal' | 'temperature_alert' | 'maintenance';

/** Live state of one seed cold store, keyed to its building. */
export interface SeedWarehouseRecord {
  buildingId: string;
  productName: string;
  variety: string;
  seedClass: string;
  lotNumber: string;
  temperatureC: number;
  targetTemperatureC: number;
  humidityPct: number;
  occupancyPct: number;
  status: SeedWarehouseStatus;
  updatedAt: string;
}
