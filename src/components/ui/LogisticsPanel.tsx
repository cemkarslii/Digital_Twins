import { useEffect, useState } from 'react';
import { Scale, ShieldCheck, Truck, X } from 'lucide-react';
import { useFactoryStore } from '../../store/useFactoryStore';
import { getLogisticsRecords } from '../../services/logisticsService';
import type { LogisticsArea, LogisticsRecord, LogisticsStatus } from '../../types/logistics';

const AREA_META: Record<LogisticsArea, { title: string; eyebrow: string; icon: typeof Truck }> = {
  gate_security: { title: 'Kantar ve güvenlik', eyebrow: 'GİRİŞ KAPISI', icon: ShieldCheck },
  truck_park: { title: 'Tır parkı', eyebrow: 'BEKLEME ALANI', icon: Truck },
};

const STATUS_LABEL: Record<LogisticsStatus, string> = {
  at_gate: 'Kapıda',
  weighing: 'Tartımda',
  waiting: 'Beklemede',
};

const dateTime = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' });
const number = new Intl.NumberFormat('tr-TR');

const formatDate = (iso: string | null) => (iso ? dateTime.format(new Date(iso)) : '—');
const formatQuantity = ({ value, unit }: LogisticsRecord['waybillQuantity']) => `${number.format(value)} ${unit === 'ton' ? 'ton' : 'kg'}`;

type LoadState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; records: LogisticsRecord[] };

function Row({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

/** Side panel listing the trucks of the selected logistics area. Data comes from the logistics service only. */
export function LogisticsPanel() {
  const area = useFactoryStore((s) => s.activeLogisticsArea);
  const close = useFactoryStore((s) => s.closeLogisticsPanel);
  const [state, setState] = useState<LoadState>({ phase: 'loading' });

  useEffect(() => {
    if (!area) return;
    const controller = new AbortController();
    setState({ phase: 'loading' });
    getLogisticsRecords(area, controller.signal)
      .then((records) => setState({ phase: 'ready', records }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ phase: 'error', message: error instanceof Error ? error.message : 'Veriler alınamadı.' });
      });
    return () => controller.abort();
  }, [area]);

  useEffect(() => {
    if (!area) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [area, close]);

  if (!area) return null;
  const { title, eyebrow, icon: Icon } = AREA_META[area];

  return (
    <aside className="logistics-panel" aria-label={title}>
      <header>
        <Icon size={20} strokeWidth={1.5} />
        <div><small>{eyebrow}</small><h2>{title}</h2></div>
        {state.phase === 'ready' && <span className="logistics-count">{state.records.length} araç</span>}
        <button onClick={close} aria-label="Paneli kapat"><X size={16} /></button>
      </header>
      <div className="logistics-body">
        {state.phase === 'loading' && <p className="logistics-note">Yükleniyor…</p>}
        {state.phase === 'error' && <p className="logistics-note" role="alert">{state.message}</p>}
        {state.phase === 'ready' && state.records.length === 0 && <p className="logistics-note">Bu alanda araç yok.</p>}
        {state.phase === 'ready' && state.records.map((record) => (
          <article key={record.id} className="logistics-card">
            <div className="logistics-card-head">
              <strong className="logistics-plate">{record.licensePlate}</strong>
              <span className={`logistics-status logistics-status-${record.status}`}>{STATUS_LABEL[record.status]}</span>
            </div>
            <dl>
              <Row label="Gönderici" value={record.senderFullName} />
              <Row label="Şoför" value={record.driverFullName} />
              <Row label="Ürün" value={record.productName} />
              <Row label="İrsaliye miktarı" value={formatQuantity(record.waybillQuantity)} />
              <Row label="İrsaliye tarihi" value={formatDate(record.waybillDate)} />
              <Row label="Kantar başlangıcı" value={formatDate(record.weighingStartedAt)} />
            </dl>
            {record.status === 'weighing' && <Scale className="logistics-scale" size={14} aria-hidden />}
          </article>
        ))}
      </div>
    </aside>
  );
}
