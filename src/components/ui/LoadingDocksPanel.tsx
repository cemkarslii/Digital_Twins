import { useEffect, useRef } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Container, X } from 'lucide-react';
import { useFactoryStore } from '../../store/useFactoryStore';
import { useDockDoors } from '../../hooks/useDockDoors';
import { DOCK_BANKS } from '../../data/dockBanks';
import type { DockDoorState, DockVisitPhase } from '../../types/docks';

const PHASE_LABEL: Record<DockVisitPhase, { inbound: string; outbound: string }> = {
  waiting: { inbound: 'Boşaltma bekliyor', outbound: 'Yükleme bekliyor' },
  in_progress: { inbound: 'Boşaltılıyor', outbound: 'Yükleniyor' },
  ready: { inbound: 'Boşaltıldı · çıkış bekliyor', outbound: 'Yüklendi · çıkış bekliyor' },
};

const time = new Intl.DateTimeFormat('tr-TR', { timeStyle: 'short', timeZone: 'Europe/Istanbul' });
const dateTime = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' });
const formatTime = (iso: string) => time.format(new Date(iso));
function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h} sa ${m} dk` : `${m} dk`;
}

function DoorRow({ item }: { item: DockDoorState }) {
  const { door, record, assessment } = item;
  if (record?.state !== 'occupied' || !assessment) {
    const label = record?.state === 'free' ? 'Boş' : record?.state === 'out_of_service' ? record.reason : 'Veri yok';
    const tone = record && record.state !== 'occupied' ? record.state : 'unknown';
    return (
      <li className={`dock-door dock-door-${tone}`}>
        <span className="dock-door-id">{door.id}</span>
        <span className="dock-door-state">{label}</span>
      </li>
    );
  }
  const { visit } = record;
  const Direction = visit.direction === 'inbound' ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <li className={`dock-door dock-door-occupied dock-phase-${assessment.phase}`}>
      <span className="dock-door-id">{door.id}</span>
      <div className="dock-door-body">
        <div className="dock-door-head">
          <strong className="logistics-plate">{visit.licensePlate}</strong>
          <span className="dock-door-state"><Direction size={12} /> {PHASE_LABEL[assessment.phase][visit.direction]}</span>
        </div>
        <p className="dock-door-meta">{visit.productName} · {visit.carrierName}</p>
        <div className="seed-occupancy" aria-label={`Paletlerin yüzde ${assessment.progressPct} kadarı işlendi`}>
          <span style={{ width: `${assessment.progressPct}%` }} />
        </div>
        <div className="seed-foot">
          <span>{visit.handledPallets} / {visit.totalPallets} palet</span>
          <span>Rampada {formatDuration(assessment.dwellMinutes)}</span>
          <span className={assessment.overrunMinutes ? 'inbound-warn' : undefined}>
            Çıkış {formatTime(visit.plannedDepartureAt)}{assessment.overrunMinutes ? ` · +${formatDuration(assessment.overrunMinutes)}` : ''}
          </span>
        </div>
      </div>
    </li>
  );
}

/** Door status of every dock bank, read from the loading dock service. */
export function LoadingDocksPanel() {
  const open = useFactoryStore((s) => s.docksOpen);
  const selectedId = useFactoryStore((s) => s.selectedDockBankId);
  const select = useFactoryStore((s) => s.openDocks);
  const close = useFactoryStore((s) => s.closeDocks);
  const buildings = useFactoryStore((s) => s.buildings);
  const state = useDockDoors();
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
    const section = selectedId ? list?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`) : null;
    if (!list || !section) return;
    list.scrollBy({ top: section.getBoundingClientRect().top - list.getBoundingClientRect().top - 10, behavior: 'smooth' });
  }, [selectedId, state.phase]);

  if (!open) return null;
  const doors = state.phase === 'ready' ? state.doors : [];
  const count = (test: (item: DockDoorState) => boolean) => doors.filter(test).length;
  const byId = new Map(doors.map((item) => [item.door.id, item]));

  return (
    <aside className="logistics-panel docks-panel" aria-label="Yükleme rampaları">
      <header>
        <Container size={20} strokeWidth={1.5} />
        <div><small>TIR YANAŞMA KAPILARI</small><h2>Yükleme rampaları</h2></div>
        {state.phase === 'ready' && <span className="logistics-count">{doors.length} kapı</span>}
        <button onClick={close} aria-label="Paneli kapat"><X size={16} /></button>
      </header>

      {state.phase === 'ready' && (
        <>
          <dl className="seed-summary inbound-summary">
            <div><dt>Dolu</dt><dd>{count((item) => item.record?.state === 'occupied')}</dd></div>
            <div><dt>Boş</dt><dd>{count((item) => item.record?.state === 'free')}</dd></div>
            <div><dt>Çıkış gecikmesi</dt><dd>{count((item) => (item.assessment?.overrunMinutes ?? 0) > 0)}</dd></div>
            <div><dt>Hizmet dışı</dt><dd>{count((item) => item.record?.state === 'out_of_service')}</dd></div>
          </dl>
          <p className="dock-asof">Veri {dateTime.format(new Date(state.asOf))}</p>
        </>
      )}

      <div className="logistics-body" ref={listRef}>
        {state.phase === 'loading' && <p className="logistics-note">Yükleniyor…</p>}
        {state.phase === 'error' && <p className="logistics-note" role="alert">{state.message}</p>}
        {state.phase === 'ready' && DOCK_BANKS.map((bank) => {
          const items = bank.doors.map((door) => byId.get(door.id)).filter((item): item is DockDoorState => !!item);
          const occupied = items.filter((item) => item.record?.state === 'occupied').length;
          const building = buildings.find((item) => item.id === bank.buildingId);
          return (
            <section key={bank.id} data-id={bank.id} className="logistics-card dock-bank" aria-current={bank.id === selectedId}>
              <button className="dock-bank-head" onClick={() => select(bank.id)} title="Rampaya odaklan">
                <strong>{bank.code}</strong>
                <span>{bank.name}<small>{building?.code} · {bank.style === 'recessed' ? 'çukur rampa' : 'yükseltilmiş rampa'}</small></span>
                <em>{occupied}/{bank.doors.length} dolu</em>
              </button>
              <ul>{items.map((item) => <DoorRow key={item.door.id} item={item} />)}</ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
