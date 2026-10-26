import { useEffect } from 'react';
import { Route, X } from 'lucide-react';
import { useFactoryStore } from '../../store/useFactoryStore';
import { useInboundTraffic } from '../../hooks/useInboundTraffic';
import type { InboundPhase } from '../../types/inbound';
import { ShipmentRows, TruckPlate } from './ShipmentDetails';

const PHASE_LABEL: Record<InboundPhase, string> = {
  en_route: 'Yolda',
  approaching: 'Yaklaşıyor',
  arriving: 'Kapıya yakın',
};

/**
 * Trucks on public roads heading to the campus. Cards carry exactly the truck park's fields;
 * route and telemetry stay in the feed for the road markers but are not listed here.
 */
export function InboundTrafficPanel() {
  const open = useFactoryStore((s) => s.inboundOpen);
  const close = useFactoryStore((s) => s.closeInbound);
  const state = useInboundTraffic();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <aside className="logistics-panel" aria-label="Yoldaki araçlar">
      <header>
        <Route size={20} strokeWidth={1.5} />
        <div><small>KAMPÜS DIŞI · GELEN SEVKİYAT</small><h2>Yoldaki araçlar</h2></div>
        {state.phase === 'ready' && <span className="logistics-count">{state.items.length} araç</span>}
        <button onClick={close} aria-label="Paneli kapat"><X size={16} /></button>
      </header>
      <div className="logistics-body">
        {state.phase === 'loading' && <p className="logistics-note">Yükleniyor…</p>}
        {state.phase === 'error' && <p className="logistics-note" role="alert">{state.message}</p>}
        {state.phase === 'ready' && state.items.length === 0 && <p className="logistics-note">Yolda araç yok.</p>}
        {state.phase === 'ready' && state.items.map(({ vehicle, assessment }) => (
          <article key={vehicle.id} className="logistics-card">
            <div className="logistics-card-head">
              <TruckPlate truck={vehicle} />
              <span className={`logistics-status inbound-phase-${assessment.phase}`}>{PHASE_LABEL[assessment.phase]}</span>
            </div>
            {/* Not weighed yet: the kantar row stays empty until the truck reaches the gate. */}
            <dl><ShipmentRows truck={vehicle} weighingStartedAt={null} /></dl>
          </article>
        ))}
      </div>
    </aside>
  );
}
