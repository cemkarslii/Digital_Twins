import { useEffect, useState } from 'react';
import { getSeedWarehouseRecords } from '../services/seedStorageService';
import type { SeedWarehouseRecord } from '../types/seedStorage';

export type SeedRecordsState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; records: SeedWarehouseRecord[]; byBuilding: Map<string, SeedWarehouseRecord> };

// One request shared by the panel and the 3D interiors; cleared on failure so a reopen retries.
let request: Promise<SeedWarehouseRecord[]> | null = null;

export function useSeedWarehouseRecords(enabled: boolean): SeedRecordsState {
  const [state, setState] = useState<SeedRecordsState>({ phase: 'loading' });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    request ??= getSeedWarehouseRecords();
    request
      .then((records) => alive && setState({
        phase: 'ready', records, byBuilding: new Map(records.map((record) => [record.buildingId, record])),
      }))
      .catch((error: unknown) => {
        request = null;
        if (alive) setState({ phase: 'error', message: error instanceof Error ? error.message : 'Veriler alınamadı.' });
      });
    return () => { alive = false; };
  }, [enabled]);
  return state;
}
