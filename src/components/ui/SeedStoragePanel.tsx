import { useEffect, useRef } from 'react';
import { Droplets, Sprout, Thermometer, X } from 'lucide-react';
import { useFactoryStore } from '../../store/useFactoryStore';
import { useSeedWarehouseRecords } from '../../hooks/useSeedWarehouseRecords';
import { filledCrateCount, SEED_CRATE_CAPACITY } from '../../data/seedWarehouses';
import type { SeedWarehouseStatus } from '../../types/seedStorage';

const STATUS_LABEL: Record<SeedWarehouseStatus, string> = {
  normal: 'Normal',
  temperature_alert: 'Sıcaklık uyarısı',
  maintenance: 'Bakımda',
};

const decimal = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('tr-TR');
const time = new Intl.DateTimeFormat('tr-TR', { timeStyle: 'short', timeZone: 'Europe/Istanbul' });

/** Depot list for seed storage mode. Reads the same records that fill the 3D interiors. */
export function SeedStoragePanel() {
  const open = useFactoryStore((s) => s.seedStorageOpen);
  const selectedId = useFactoryStore((s) => s.selectedSeedWarehouseId);
  const buildings = useFactoryStore((s) => s.buildings);
  const select = useFactoryStore((s) => s.openSeedStorage);
  const close = useFactoryStore((s) => s.closeSeedStorage);
  const state = useSeedWarehouseRecords(open);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Scroll only the list; scrollIntoView would also shift the overflow-hidden scene container.
  useEffect(() => {
    const list = listRef.current;
    const card = selectedId ? list?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`) : null;
    if (!list || !card) return;
    const outer = list.getBoundingClientRect(), inner = card.getBoundingClientRect();
    const delta = inner.top < outer.top ? inner.top - outer.top - 8 : inner.bottom > outer.bottom ? inner.bottom - outer.bottom + 8 : 0;
    if (delta) list.scrollBy({ top: delta, behavior: 'smooth' });
  }, [selectedId, state.phase]);

  if (!open) return null;
  const codeOf = (id: string) => buildings.find((b) => b.id === id)?.code ?? id;
  const active = state.phase === 'ready' ? state.records.filter((r) => r.status !== 'maintenance') : [];
  const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
  const totalFilled = state.phase === 'ready' ? state.records.reduce((sum, r) => sum + filledCrateCount(r.occupancyPct), 0) : 0;
  const totalCapacity = state.phase === 'ready' ? state.records.length * SEED_CRATE_CAPACITY : 0;

  return (
    <aside className="logistics-panel seed-panel" aria-label="Tohum depoları">
      <header>
        <Sprout size={20} strokeWidth={1.5} />
        <div><small>SOĞUK HAVA DEPOLARI</small><h2>Tohum depoları</h2></div>
        {state.phase === 'ready' && <span className="logistics-count">{state.records.length} depo</span>}
        <button onClick={close} aria-label="Paneli kapat"><X size={16} /></button>
      </header>

      {state.phase === 'ready' && (
        <dl className="seed-summary">
          <div><dt>Ort. sıcaklık</dt><dd>{decimal.format(average(active.map((r) => r.temperatureC)))} °C</dd></div>
          <div><dt>Ort. nem</dt><dd>%{integer.format(Math.round(average(active.map((r) => r.humidityPct))))}</dd></div>
          <div><dt>Doluluk</dt><dd>{integer.format(totalFilled)} / {integer.format(totalCapacity)}</dd></div>
        </dl>
      )}

      <div className="logistics-body" ref={listRef}>
        {state.phase === 'loading' && <p className="logistics-note">Yükleniyor…</p>}
        {state.phase === 'error' && <p className="logistics-note" role="alert">{state.message}</p>}
        {state.phase === 'ready' && state.records.map((record) => {
          const filled = filledCrateCount(record.occupancyPct);
          return (
            <button
              key={record.buildingId}
              data-id={record.buildingId}
              className="logistics-card seed-card"
              aria-pressed={record.buildingId === selectedId}
              onClick={() => select(record.buildingId)}
            >
              <div className="logistics-card-head">
                <strong className="logistics-plate">{codeOf(record.buildingId)}</strong>
                <span className={`logistics-status seed-status-${record.status}`}>{STATUS_LABEL[record.status]}</span>
              </div>
              <p className="seed-product">{record.productName} · {record.variety} <small>{record.seedClass}</small></p>
              <div className="seed-metrics">
                <span><Thermometer size={13} /> {decimal.format(record.temperatureC)} °C <small>hedef {decimal.format(record.targetTemperatureC)}</small></span>
                <span><Droplets size={13} /> %{record.humidityPct}</span>
              </div>
              <div className="seed-occupancy" aria-label={`Doluluk yüzde ${record.occupancyPct}`}>
                <span style={{ width: `${record.occupancyPct}%` }} />
              </div>
              <div className="seed-foot">
                <span>{integer.format(filled)} / {integer.format(SEED_CRATE_CAPACITY)} kasa · %{record.occupancyPct}</span>
                <span>Lot {record.lotNumber} · {time.format(new Date(record.updatedAt))}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
