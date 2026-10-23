import { useEffect, useState } from 'react';
import { CirclePause, Clock, Route, Snowflake, WifiOff, X } from 'lucide-react';
import { useFactoryStore } from '../../store/useFactoryStore';
import { useInboundTraffic } from '../../hooks/useInboundTraffic';
import { DELAY_TOLERANCE_MIN } from '../../services/inboundTrafficService';
import { compass } from '../../data/compass';
import type { InboundException, InboundItem, InboundPhase } from '../../types/inbound';

const PHASE_LABEL: Record<InboundPhase, string> = {
  en_route: 'Yolda',
  approaching: 'Yaklaşıyor',
  arriving: 'Kapıya yakın',
};

const EXCEPTION_META: Record<InboundException, { label: string; icon: typeof Clock }> = {
  delayed: { label: 'Gecikme', icon: Clock },
  stopped: { label: 'Duruyor', icon: CirclePause },
  signal_lost: { label: 'Sinyal yok', icon: WifiOff },
  cold_chain: { label: 'Soğuk zincir', icon: Snowflake },
};

type Filter = 'all' | 'near' | 'exceptions';
const FILTERS: { id: Filter; label: string; test: (item: InboundItem) => boolean }[] = [
  { id: 'all', label: 'Tümü', test: () => true },
  { id: 'near', label: 'Yaklaşan', test: ({ assessment }) => assessment.phase !== 'en_route' },
  { id: 'exceptions', label: 'Uyarılı', test: ({ assessment }) => assessment.exceptions.length > 0 },
];

const time = new Intl.DateTimeFormat('tr-TR', { timeStyle: 'short', timeZone: 'Europe/Istanbul' });
const dateTime = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' });
const number = new Intl.NumberFormat('tr-TR');
const decimal = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatTime = (iso: string) => time.format(new Date(iso));
function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h} sa ${m} dk` : `${m} dk`;
}
function formatDelay(minutes: number) {
  if (minutes === 0) return 'zamanında';
  return minutes > 0 ? `+${minutes} dk` : `${-minutes} dk erken`;
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return <div><dt>{label}</dt><dd className={tone ? `inbound-${tone}` : undefined}>{value}</dd></div>;
}

function InboundCard({ item }: { item: InboundItem }) {
  const { vehicle, assessment } = item;
  const { shipment, route, telemetry } = vehicle;
  const range = shipment.temperatureRangeC;
  const quantity = `${number.format(shipment.quantity.value)} ${shipment.quantity.unit}`;
  return (
    <article className="logistics-card inbound-card">
      <div className="logistics-card-head">
        <strong className="logistics-plate">
          {vehicle.licensePlate}
          {vehicle.trailerPlate && <small className="inbound-trailer">{vehicle.trailerPlate}</small>}
        </strong>
        <span className={`logistics-status inbound-phase-${assessment.phase}`}>{PHASE_LABEL[assessment.phase]}</span>
      </div>
      <p className="seed-product">{shipment.productName} · {quantity} <small>{vehicle.carrierName}</small></p>

      <div className="inbound-route">
        <span>{shipment.originCity}</span>
        <div className="seed-occupancy" aria-label={`Yolun yüzde ${assessment.progressPct} kadarı tamamlandı`}>
          <span style={{ width: `${assessment.progressPct}%` }} />
        </div>
        <span>Kampüs</span>
      </div>
      <div className="seed-foot">
        <span>{number.format(route.remainingKm)} km kaldı · {route.corridor} · {compass(assessment.bearingDeg).from}</span>
        <span>{telemetry.locationLabel}</span>
      </div>

      <dl>
        <Row label="Tahmini varış" value={`${formatTime(vehicle.estimatedArrivalAt)} · ${formatDuration(assessment.minutesToArrival)}`} />
        <Row
          label="Randevu"
          value={`${formatTime(vehicle.appointmentAt)} · ${formatDelay(assessment.delayMinutes)}`}
          tone={assessment.delayMinutes > DELAY_TOLERANCE_MIN ? 'warn' : undefined}
        />
        <Row label="Hız" value={`${number.format(telemetry.speedKmh)} km/sa`} />
        <Row
          label="Son sinyal"
          value={assessment.signalAgeMinutes ? `${assessment.signalAgeMinutes} dk önce` : 'şimdi'}
          tone={assessment.exceptions.includes('signal_lost') ? 'warn' : undefined}
        />
        <Row label="Şoför" value={vehicle.driverFullName} />
        <Row label="İrsaliye" value={shipment.waybillNumber} />
        {range && (
          <Row
            label={`Yük sıcaklığı (${range[0]}–${range[1]} °C)`}
            value={telemetry.cargoTemperatureC === null ? '—' : `${decimal.format(telemetry.cargoTemperatureC)} °C`}
            tone={assessment.exceptions.includes('cold_chain') ? 'warn' : undefined}
          />
        )}
      </dl>

      {assessment.exceptions.length > 0 && (
        <ul className="inbound-exceptions">
          {assessment.exceptions.map((exception) => {
            const { label, icon: Icon } = EXCEPTION_META[exception];
            return <li key={exception}><Icon size={12} /> {label}</li>;
          })}
        </ul>
      )}
    </article>
  );
}

/** Trucks on public roads heading to the campus, read from the inbound traffic service. */
export function InboundTrafficPanel() {
  const open = useFactoryStore((s) => s.inboundOpen);
  const close = useFactoryStore((s) => s.closeInbound);
  const state = useInboundTraffic();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;
  const items = state.phase === 'ready' ? state.items : [];
  const shown = items.filter(FILTERS.find((f) => f.id === filter)!.test);
  const count = (test: (item: InboundItem) => boolean) => items.filter(test).length;

  return (
    <aside className="logistics-panel inbound-panel" aria-label="Yoldaki araçlar">
      <header>
        <Route size={20} strokeWidth={1.5} />
        <div><small>KAMPÜS DIŞI · GELEN SEVKİYAT</small><h2>Yoldaki araçlar</h2></div>
        {state.phase === 'ready' && <span className="logistics-count">{items.length} araç</span>}
        <button onClick={close} aria-label="Paneli kapat"><X size={16} /></button>
      </header>

      {state.phase === 'ready' && (
        <>
          <dl className="seed-summary inbound-summary">
            <div><dt>Yolda</dt><dd>{items.length}</dd></div>
            <div><dt>≤ 1 saat</dt><dd>{count(({ assessment }) => assessment.minutesToArrival <= 60)}</dd></div>
            <div><dt>Gecikmeli</dt><dd>{count(({ assessment }) => assessment.exceptions.includes('delayed'))}</dd></div>
            <div><dt>Uyarılı</dt><dd>{count(({ assessment }) => assessment.exceptions.length > 0)}</dd></div>
          </dl>
          <div className="inbound-filters" role="group" aria-label="Araç filtresi">
            {FILTERS.map(({ id, label, test }) => (
              <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
                {label} <small>{count(test)}</small>
              </button>
            ))}
            <span>Veri {dateTime.format(new Date(state.asOf))}</span>
          </div>
        </>
      )}

      <div className="logistics-body">
        {state.phase === 'loading' && <p className="logistics-note">Yükleniyor…</p>}
        {state.phase === 'error' && <p className="logistics-note" role="alert">{state.message}</p>}
        {state.phase === 'ready' && shown.length === 0 && <p className="logistics-note">Bu filtrede araç yok.</p>}
        {shown.map((item) => <InboundCard key={item.vehicle.id} item={item} />)}
      </div>
    </aside>
  );
}
