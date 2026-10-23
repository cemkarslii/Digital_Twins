import { useEffect, useState } from 'react';
import { getDockDoorStates } from '../services/loadingDockService';
import type { DockDoorState } from '../types/docks';

export type DockDoorsState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; asOf: string; doors: DockDoorState[] };

// One request shared by the panel and the 3D docks; cleared on failure so a remount retries.
let request: ReturnType<typeof getDockDoorStates> | null = null;

export function useDockDoors(): DockDoorsState {
  const [state, setState] = useState<DockDoorsState>({ phase: 'loading' });
  useEffect(() => {
    let alive = true;
    request ??= getDockDoorStates();
    request
      .then(({ asOf, doors }) => alive && setState({ phase: 'ready', asOf, doors }))
      .catch((error: unknown) => {
        request = null;
        if (alive) setState({ phase: 'error', message: error instanceof Error ? error.message : 'Veriler alınamadı.' });
      });
    return () => { alive = false; };
  }, []);
  return state;
}
