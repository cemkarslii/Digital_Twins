/** Transport document of a load. Issued once at the sender and carried with the truck. */
export interface Waybill {
  number: string;
  issuedAt: string;
  senderFullName: string;
  productName: string;
  quantity: { value: number; unit: 'kg' | 'ton' };
  /** Allowed cargo temperature band in °C; null when the load needs no cold chain. */
  temperatureRangeC: [number, number] | null;
}

/**
 * Truck and waybill fields every truck record carries, wherever the truck is: on the road, at the
 * gate or in the truck park. Panels show them with the same labels, in the same order.
 */
export interface TruckShipment {
  licensePlate: string;
  trailerPlate: string | null;
  carrierName: string;
  driverFullName: string;
  waybill: Waybill;
}
