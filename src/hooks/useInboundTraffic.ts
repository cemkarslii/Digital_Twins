import { useEffect, useState } from 'react';
import { getInboundTraffic } from '../services/inboundTrafficService';
import type { InboundItem } from '../types/inbound';

export type InboundTrafficState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; asOf: string; items: InboundItem[] };

// One request shared by the panel and the road marker; cleared on failure so a remount retries.
let request: ReturnType<typeof getInboundTraffic> | null = null;

export function useInboundTraffic(): InboundTrafficState {
  const [state, setState] = useState<InboundTrafficState>({ phase: 'loading' });
  useEffect(() => {
    let alive = true;
    request ??= getInboundTraffic();
    request
      .then(({ asOf, items }) => alive && setState({ phase: 'ready', asOf, items }))
      .catch((error: unknown) => {
        request = null;
        if (alive) setState({ phase: 'error', message: error instanceof Error ? error.message : 'Veriler alınamadı.' });
      });
    return () => { alive = false; };
  }, []);
  return state;
}
