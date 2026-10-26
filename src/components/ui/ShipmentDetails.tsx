import type { TruckShipment } from '../../types/shipment';

const dateTime = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' });
const number = new Intl.NumberFormat('tr-TR');

export function DetailRow({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return <div><dt>{label}</dt><dd className={tone ? `inbound-${tone}` : undefined}>{value}</dd></div>;
}

/** Tractor plate with the trailer plate beside it. */
export function TruckPlate({ truck }: { truck: TruckShipment }) {
  return (
    <strong className="logistics-plate">
      {truck.licensePlate}
      {truck.trailerPlate && <small className="inbound-trailer">{truck.trailerPlate}</small>}
    </strong>
  );
}

/**
 * The rows of every truck card (on the road, at the gate, in the truck park), so all three panels
 * show the same headings in the same order. Render inside a card's `<dl>`.
 */
export function ShipmentRows({ truck, weighingStartedAt }: { truck: TruckShipment; weighingStartedAt: string | null }) {
  const { waybill } = truck;
  return (
    <>
      <DetailRow label="Ürün" value={waybill.productName} />
      <DetailRow label="İrsaliye miktarı" value={`${number.format(waybill.quantity.value)} ${waybill.quantity.unit}`} />
      <DetailRow label="Gönderici" value={waybill.senderFullName} />
      <DetailRow label="Taşıyıcı" value={truck.carrierName} />
      <DetailRow label="Şoför" value={truck.driverFullName} />
      <DetailRow label="İrsaliye no" value={waybill.number} />
      <DetailRow label="İrsaliye tarihi" value={dateTime.format(new Date(waybill.issuedAt))} />
      <DetailRow label="Kantar başlangıcı" value={weighingStartedAt ? dateTime.format(new Date(weighingStartedAt)) : '—'} />
    </>
  );
}
