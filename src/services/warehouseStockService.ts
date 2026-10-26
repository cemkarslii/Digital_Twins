import type { BinState, WarehouseBin } from '../types/warehouse';
import { WAREHOUSE_LAYOUT } from '../data/warehouseLayout';
import { getRackLanes } from '../data/warehouseLanes';
import { stableHash } from '../utils/stableHash';

/** Reconnect delay doubles from the first to the last value. */
const RETRY_MS = [1_000, 30_000] as const;

/** Fields of a WMS bin row that matter here; dimensions, volume and weight are ignored. */
const BIN_FIELD = {
  id: 'ID',
  code: 'Code',
  capacity: 'Max Pallet Count',
  warehouseCode: 'Warehouse → Code',
  warehouseName: 'Warehouse → Name',
  tierCode: 'Warehouse Tier - Tier → Code',
  tierName: 'Warehouse Tier - Tier → Name',
  binCode: 'Warehouse Bin - Bin → Code',
} as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The WMS sends numbers as text; both forms are accepted. */
const text = (value: unknown) => typeof value === 'string' ? value.trim()
  : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

function wholeNumber(value: unknown): number | null {
  const raw = text(value);
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

/** One row of the WMS bin export, e.g. `{"ID":"39","Code":"1-1-1","Max Pallet Count":"8", …}`. */
export function parseBin(value: unknown): WarehouseBin {
  if (!isObject(value)) throw new Error('kayıt nesne değil');
  const field = (key: keyof typeof BIN_FIELD) => text(value[BIN_FIELD[key]]);
  const id = field('id'), code = field('code') || id;
  const capacity = wholeNumber(value[BIN_FIELD.capacity]);
  if (!id) throw new Error(`${code || '?'}: ID yok`);
  if (!field('warehouseCode') || !field('tierCode') || !field('binCode')) throw new Error(`${code}: depo, kat veya göz kodu eksik`);
  if (!capacity || capacity > 255) throw new Error(`${code}: Max Pallet Count geçersiz`);
  return {
    id, code,
    warehouseCode: field('warehouseCode'), warehouseName: field('warehouseName'),
    tierCode: field('tierCode'), tierName: field('tierName'),
    binCode: field('binCode'), capacity,
  };
}

/** One bin state: `{ binId: "39", palletCount: 3, updatedAt: "2026-10-26T09:30:00Z" }`. */
export function parseBinState(value: unknown): BinState {
  const binId = isObject(value) ? text(value.binId) : '';
  const palletCount = isObject(value) ? wholeNumber(value.palletCount) : null;
  const updatedAt = isObject(value) && typeof value.updatedAt === 'string' ? Date.parse(value.updatedAt) : NaN;
  if (!binId || palletCount === null || !Number.isFinite(updatedAt)) {
    throw new Error(`göz durumu geçersiz (${binId || '?'})`);
  }
  return { binId, palletCount, updatedAt };
}

/** Parses every row on its own; one bad row is reported, never fatal for the rest. */
function parseRows<T>(rows: unknown, parse: (row: unknown) => T): { items: T[]; rejected: string[] } {
  if (!Array.isArray(rows)) throw new Error('WMS yanıtı liste değil.');
  const items: T[] = [], rejected: string[] = [];
  for (const row of rows) {
    try { items.push(parse(row)); } catch (error) { rejected.push(error instanceof Error ? error.message : String(error)); }
  }
  return { items, rejected };
}

/** Transport to the WMS. Rows stay raw here; parsing and mapping happen on this side of it. */
interface WarehouseStockAdapter {
  /** Bin master data, every bin once. */
  getBins(signal: AbortSignal): Promise<unknown[]>;
  /** Current state of every bin. */
  getStates(signal: AbortSignal): Promise<unknown[]>;
  /** Pushes changed bin states until the returned function is called; `onLost` reports a broken stream. */
  subscribe(onRows: (rows: unknown[]) => void, onLost: (error: Error) => void): () => void;
}

/** Bin rows in the WMS export shape, one per lane of the layout, numbered as warehouseLanes.ts expects. */
function demoBinRows() {
  const wmsCode = new Map(WAREHOUSE_LAYOUT.sections.map((section) => [section.id, section.wmsCode]));
  return getRackLanes().map((lane) => {
    const warehouse = wmsCode.get(lane.sectionId)!, code = `${warehouse}-${lane.level}-${lane.slot}`;
    return {
      'ID': String(lane.index + 1), 'Code': code, 'Name': code, 'Facility ID': '3',
      'Max Height': '300', 'Max Length': '820', 'Max Pallet Count': '8', 'Max Volume': null, 'Max Weight': null, 'Max Width': '100',
      'Warehouse Bin - Bin → Code': String(lane.slot), 'Warehouse Bin - Bin → Name': String(lane.slot),
      'Warehouse Tier - Tier → Code': String(lane.level), 'Warehouse Tier - Tier → Name': `${lane.level}.Raf`,
      'Warehouse Row - Row → Code': '*', 'Warehouse Bay - Bay → Code': '*',
      'Warehouse → Code': warehouse, 'Warehouse → Name': `SOĞUK HAVA DEPO - ${warehouse}`,
    };
  });
}

/** Demo fill per WMS warehouse code, set apart so every section fill band shows. */
const DEMO_FILL: Record<string, number> = { '1': 0.45, '2': 0.78, '3': 0.93, '4': 0.6 };

/**
 * Fictional local demo feed: stable starting stock around each section's demo fill, then a few
 * put-aways and picks every couple of seconds that keep it there. Replace this adapter with the WMS
 * integration (REST snapshot plus a WebSocket/SSE stream, or polling with `updatedSince`); nothing
 * else changes.
 */
function demoAdapter(): WarehouseStockAdapter {
  const bins = demoBinRows();
  const fill = new Map(bins.map((row) => [row.ID, DEMO_FILL[row['Warehouse → Code']] ?? 0.6]));
  const states = new Map(bins.map((row) => {
    // r^k over uniform r averages 1 / (k + 1), so k = (1 - f) / f centres a lane on fill f.
    const f = fill.get(row.ID)!;
    const palletCount = Math.round(8 * stableHash(row.ID, 0) ** ((1 - f) / f));
    return [row.ID, { binId: row.ID, palletCount, updatedAt: new Date(Date.now() - stableHash(row.ID, 2) * 3_600_000).toISOString() }];
  }));
  return {
    async getBins(signal) { signal.throwIfAborted(); return bins; },
    async getStates(signal) { signal.throwIfAborted(); return [...states.values()].map((state) => ({ ...state })); },
    subscribe(onRows) {
      const ids = [...states.keys()];
      const timer = setInterval(() => {
        const changed = Array.from({ length: 10 + Math.floor(Math.random() * 30) }, () => {
          const id = ids[Math.floor(Math.random() * ids.length)];
          const state = states.get(id)!;
          // Put-away at rate f per free place, picking at 1 - f per pallet, out of a fixed total of 8
          // (the rest leaves the lane as it is): this chain settles on Binomial(8, f), so the fill holds at f.
          const f = fill.get(id)!, n = state.palletCount, u = Math.random() * 8;
          const step = u < f * (8 - n) ? 1 : u < f * (8 - n) + (1 - f) * n ? -1 : 0;
          if (!step) return [];
          state.palletCount = n + step;
          state.updatedAt = new Date().toISOString();
          return [{ ...state }];
        }).flat();
        if (changed.length) onRows(changed);
      }, 2_000);
      return () => clearInterval(timer);
    },
  };
}

const adapter = demoAdapter();

export type StockFeedStatus = 'connecting' | 'live' | 'reconnecting';

export interface StockFeedHandlers {
  onBins(bins: WarehouseBin[], rejected: string[]): void;
  /** Snapshot and stream alike; a state older than the one already held must be ignored. */
  onStates(states: BinState[], rejected: string[]): void;
  onStatus(status: StockFeedStatus, error?: string): void;
}

/**
 * Opens the WMS feed: bin master data once, then the stream and a full snapshot. A failure or a
 * broken stream reconnects with growing delay and takes a fresh snapshot, so missed changes heal.
 * Returns the function that closes the feed.
 */
export function connectWarehouseStock(handlers: StockFeedHandlers): () => void {
  const controller = new AbortController();
  let unsubscribe: (() => void) | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0, binsLoaded = false;

  const lost = (error: unknown) => {
    if (controller.signal.aborted || retry !== undefined) return;
    unsubscribe?.();
    unsubscribe = null;
    retry = setTimeout(connect, Math.min(RETRY_MS[1], RETRY_MS[0] * 2 ** attempt++));
    handlers.onStatus('reconnecting', error instanceof Error ? error.message : String(error));
  };

  async function connect() {
    retry = undefined;
    handlers.onStatus(attempt ? 'reconnecting' : 'connecting');
    try {
      if (!binsLoaded) {
        const { items, rejected } = parseRows(await adapter.getBins(controller.signal), parseBin);
        if (controller.signal.aborted) return;
        handlers.onBins(items, rejected);
        binsLoaded = true;
      }
      // Stream before snapshot, so no change falls between them; the older of the two loses.
      unsubscribe = adapter.subscribe((rows) => {
        try {
          const { items, rejected } = parseRows(rows, parseBinState);
          handlers.onStates(items, rejected);
        } catch (error) { lost(error); }
      }, lost);
      const { items, rejected } = parseRows(await adapter.getStates(controller.signal), parseBinState);
      // Closed, or the stream broke while the snapshot loaded and a reconnect is already due.
      if (controller.signal.aborted || retry !== undefined) return;
      handlers.onStates(items, rejected);
      attempt = 0;
      handlers.onStatus('live');
    } catch (error) {
      lost(error);
    }
  }

  connect();
  return () => {
    controller.abort();
    clearTimeout(retry);
    unsubscribe?.();
  };
}
