import { create } from 'zustand';
import type { BinState, LaneStatus, WarehouseBin } from '../types/warehouse';
import { faceKey, getRackLanes, laneOfBin } from '../data/warehouseLanes';
import { WAREHOUSE_CONFIG } from '../data/warehouseConfig';
import { connectWarehouseStock, type StockFeedStatus } from '../services/warehouseStockService';

/** Changes are collected and applied together at most this often: one render per burst. */
const FLUSH_MS = 250;
const ISSUE_SAMPLES = 5;

const lanes = getRackLanes();

/**
 * Live content of every lane, indexed like getRackLanes(). Kept out of React state: a flush
 * mutates these arrays and bumps `version` once, so the scene repaints instances in place and
 * nothing re-renders per message. Read them together with a subscription to `version`.
 */
export const laneStock = {
  /** 0: no WMS bin for this lane. */
  capacity: new Uint8Array(lanes.length),
  count: new Uint8Array(lanes.length),
  /** WMS time of the last applied state; 0 until the first one arrives. */
  updatedAt: new Float64Array(lanes.length),
  bins: new Array<WarehouseBin | undefined>(lanes.length),
};

export function laneStatus(index: number): LaneStatus {
  const capacity = laneStock.capacity[index], count = laneStock.count[index];
  if (!capacity || !laneStock.updatedAt[index]) return 'unknown';
  return count === 0 ? 'empty' : count >= capacity ? 'full' : 'partial';
}

export const LANE_STATUSES: readonly LaneStatus[] = ['full', 'partial', 'empty', 'unknown'];

/** Lanes per status, and pallets against capacity over the lanes with a known state. */
export interface StockSummary {
  lanes: Record<LaneStatus, number>;
  pallets: number;
  capacity: number;
}

/** One section's totals, split by level (index 0 = level 1) and by aisle face (see faceKey). */
export interface SectionStock extends StockSummary {
  byLevel: StockSummary[];
  byFace: Map<string, StockSummary>;
}

const emptySummary = (): StockSummary => ({ lanes: { full: 0, partial: 0, empty: 0, unknown: 0 }, pallets: 0, capacity: 0 });

/** Every section's totals in one pass; a few thousand lanes, well under a millisecond. */
function summarize(): Map<string, SectionStock> {
  const sections = new Map<string, SectionStock>();
  for (const lane of lanes) {
    let section = sections.get(lane.sectionId);
    if (!section) {
      section = { ...emptySummary(), byLevel: Array.from({ length: WAREHOUSE_CONFIG.rackSystem.levels }, emptySummary), byFace: new Map() };
      sections.set(lane.sectionId, section);
    }
    let face = section.byFace.get(faceKey(lane));
    if (!face) section.byFace.set(faceKey(lane), face = emptySummary());
    const status = laneStatus(lane.index);
    for (const summary of [section, section.byLevel[lane.level - 1], face]) {
      summary.lanes[status]++;
      if (status === 'unknown') continue;
      summary.pallets += laneStock.count[lane.index];
      summary.capacity += laneStock.capacity[lane.index];
    }
  }
  return sections;
}

/** Section fill band: `low` has room, `high` is filling up, `full` is at or near capacity. */
export type FillBand = 'low' | 'high' | 'full' | 'unknown';

const { fillBands, stockColors } = WAREHOUSE_CONFIG;
export const FILL_BAND_COLOR: Record<FillBand, string> = {
  low: stockColors.empty, high: stockColors.partial, full: stockColors.full, unknown: stockColors.unknown,
};
export const FILL_BAND_LABEL: Record<FillBand, string> = { low: 'Yer var', high: 'Doluyor', full: 'Dolu', unknown: 'Veri yok' };

export function fillBand(summary: StockSummary | undefined): FillBand {
  if (!summary?.capacity) return 'unknown';
  const fill = summary.pallets / summary.capacity;
  return fill >= fillBands.full ? 'full' : fill >= fillBands.high ? 'high' : 'low';
}

/**
 * Fill band of one section, and whether the feed is down so its colour may be stale. Both are
 * primitives, so a caller re-renders when the band or the feed changes, not on every flush.
 */
export function useSectionFill(sectionId: string) {
  const band = useWarehouseStock((s) => fillBand(s.sections.get(sectionId)));
  const stale = useWarehouseStock((s) => s.feed !== 'live');
  return { band, color: FILL_BAND_COLOR[band], stale };
}

export interface StockIssues {
  /** Rows the WMS sent malformed. */
  invalid: number;
  /** Valid rows with no place in the layout, or a second bin for a lane already taken. */
  unmatched: number;
  samples: string[];
}

interface WarehouseStockState {
  feed: StockFeedStatus | 'off';
  error: string | null;
  /** Bumped by every flush; the lane arrays changed. */
  version: number;
  /** Wall time of the last flush that applied a change. */
  receivedAt: number | null;
  sections: Map<string, SectionStock>;
  issues: StockIssues;
}

const NO_ISSUES: StockIssues = { invalid: 0, unmatched: 0, samples: [] };

export const useWarehouseStock = create<WarehouseStockState>(() => ({
  feed: 'off', error: null, version: 0, receivedAt: null, sections: summarize(), issues: NO_ISSUES,
}));

const laneByBinId = new Map<string, number>();
const laneByCode = new Map<string, number>();
/** Newest pending state per bin; bounded by the bin count however long a flush waits. */
const pending = new Map<string, BinState>();
/** WMS ids of bins with no lane: unplaceable bin rows, and states for bins the bin data lacks. */
const unmatched = new Set<string>();
let invalidRows = 0, samples: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;

const note = (message: string) => { if (samples.length < ISSUE_SAMPLES) samples = [...samples, message]; };
const issues = (): StockIssues => ({ invalid: invalidRows, unmatched: unmatched.size, samples });

/** Lane of a WMS bin code such as `1-2-57`, once the bin data is loaded. */
export const laneOfBinCode = (code: string) => laneByCode.get(code.trim());

function reset() {
  for (const array of [laneStock.capacity, laneStock.count, laneStock.updatedAt]) array.fill(0);
  laneStock.bins.fill(undefined);
  laneByBinId.clear();
  laneByCode.clear();
  pending.clear();
  unmatched.clear();
  invalidRows = 0;
  samples = [];
  clearTimeout(flushTimer);
  flushTimer = undefined;
}

function bindBins(bins: WarehouseBin[], rejected: string[]) {
  invalidRows += rejected.length;
  rejected.forEach(note);
  for (const bin of bins) {
    const lane = laneOfBin(bin);
    if (!lane || laneStock.capacity[lane.index]) {
      unmatched.add(bin.id);
      note(lane ? `${bin.code}: ${lane.id} başka bir göze bağlı` : `${bin.code}: yerleşimde karşılığı yok`);
      continue;
    }
    laneStock.capacity[lane.index] = bin.capacity;
    laneStock.bins[lane.index] = bin;
    laneByBinId.set(bin.id, lane.index);
    laneByCode.set(bin.code, lane.index);
  }
  flush();
}

function flush() {
  flushTimer = undefined;
  let applied = 0;
  for (const state of pending.values()) {
    const index = laneByBinId.get(state.binId);
    if (index === undefined) {
      if (!unmatched.has(state.binId)) note(`ID ${state.binId}: göz verisinde yok`);
      unmatched.add(state.binId);
      continue;
    }
    if (state.updatedAt < laneStock.updatedAt[index]) continue;
    if (state.palletCount > laneStock.capacity[index]) {
      invalidRows++;
      note(`${laneStock.bins[index]!.code}: ${state.palletCount} palet, kapasite ${laneStock.capacity[index]}`);
      continue;
    }
    laneStock.count[index] = state.palletCount;
    laneStock.updatedAt[index] = state.updatedAt;
    applied++;
  }
  pending.clear();
  useWarehouseStock.setState((s) => ({
    version: s.version + 1,
    receivedAt: applied ? Date.now() : s.receivedAt,
    sections: summarize(),
    issues: issues(),
  }));
}

function queueStates(states: BinState[], rejected: string[]) {
  invalidRows += rejected.length;
  rejected.forEach(note);
  for (const state of states) {
    const queued = pending.get(state.binId);
    if (!queued || queued.updatedAt <= state.updatedAt) pending.set(state.binId, state);
  }
  flushTimer ??= setTimeout(flush, FLUSH_MS);
}

/**
 * Opens the WMS feed from a clean slate and returns the function that closes it. Lanes stay
 * `unknown` until their first state arrives, so missing data never reads as an empty lane.
 */
export function openWarehouseStock(): () => void {
  reset();
  useWarehouseStock.setState((s) => ({ feed: 'connecting', error: null, version: s.version + 1, receivedAt: null, sections: summarize(), issues: NO_ISSUES }));
  const close = connectWarehouseStock({
    onBins: bindBins,
    onStates: queueStates,
    onStatus: (feed, error) => useWarehouseStock.setState({ feed, error: error ?? null }),
  });
  return () => {
    close();
    clearTimeout(flushTimer);
    flushTimer = undefined;
    useWarehouseStock.setState({ feed: 'off', error: null });
  };
}
