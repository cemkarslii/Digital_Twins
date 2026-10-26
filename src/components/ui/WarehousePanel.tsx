import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Boxes, Search, X } from 'lucide-react';
import { useFactoryStore } from '../../store/useFactoryStore';
import {
  FILL_BAND_COLOR, FILL_BAND_LABEL, LANE_STATUSES, laneOfBinCode, useSectionFill, laneStatus, laneStock, openWarehouseStock, useWarehouseStock,
  type SectionStock, type StockSummary,
} from '../../store/useWarehouseStock';
import { WAREHOUSE_BUILDING, WAREHOUSE_LAYOUT } from '../../data/warehouseLayout';
import { WAREHOUSE_CONFIG } from '../../data/warehouseConfig';
import { getRackLanes, sectionFaces, type AisleFace } from '../../data/warehouseLanes';
import type { LaneStatus, WarehouseSection } from '../../types/warehouse';
import type { FillBand } from '../../store/useWarehouseStock';

const integer = new Intl.NumberFormat('tr-TR');
const clock = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'medium' });
const { stockColors, fillBands } = WAREHOUSE_CONFIG;
const STATUS_LABEL: Record<LaneStatus, string> = { full: 'Dolu', partial: 'Kısmi', empty: 'Boş', unknown: 'Veri yok' };
const SIDE_LABEL = { west: 'batı', east: 'doğu' } as const;
const FEED_LABEL = { off: 'Bağlı değil', connecting: 'WMS verisi yükleniyor…', live: 'Canlı', reconnecting: 'Bağlantı koptu, yeniden deneniyor' } as const;

const faceLabel = (face: Pick<AisleFace, 'aisleId' | 'side'>) => `${face.aisleId.slice(-2)} ${SIDE_LABEL[face.side]}`;
const percent = ({ pallets, capacity }: StockSummary) => capacity ? `%${Math.round(pallets / capacity * 100)}` : '—';
/** Dark text on light fills (amber, pale grey), white on the rest, so status pills stay legible. */
function ink(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255) > 160 ? '#2b2205' : '#ffffff';
}
const pillStyle = (color: string) => ({ '--status-color': color, '--status-ink': ink(color) } as React.CSSProperties);
const statusStyle = (status: LaneStatus) => pillStyle(stockColors[status]);
const sectionStyle = (color: string) => ({ '--section-color': color } as React.CSSProperties);
const BANDS: readonly FillBand[] = ['low', 'high', 'full'];
const BAND_RANGE: Record<FillBand, string> = {
  low: `%${fillBands.high * 100} altı`, high: `%${fillBands.high * 100}–${fillBands.full * 100}`, full: `%${fillBands.full * 100}+`, unknown: '',
};

function ago(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 5) return 'az önce';
  if (seconds < 60) return `${seconds} sn önce`;
  return `${Math.floor(seconds / 60)} dk önce`;
}

/** Re-renders its caller once a second; keep it in the smallest component that shows a relative time. */
function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Lanes by status as one segmented bar: full, partial, empty, no data. */
function StatusBar({ summary }: { summary: StockSummary }) {
  const label = LANE_STATUSES.filter((s) => summary.lanes[s]).map((s) => `${integer.format(summary.lanes[s])} ${STATUS_LABEL[s].toLowerCase()}`).join(', ');
  return (
    <div className="warehouse-bar" role="img" aria-label={label} title={label}>
      {LANE_STATUSES.map((status) => summary.lanes[status] > 0 && (
        <span key={status} style={{ flexGrow: summary.lanes[status], background: stockColors[status] }} />
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="warehouse-legend-row">
      {LANE_STATUSES.map((status) => <span key={status}><i style={statusStyle(status)} />{STATUS_LABEL[status]}</span>)}
    </div>
  );
}

/** How section colours read: fill bands with their thresholds. */
function FillLegend() {
  return (
    <div className="warehouse-legend-row warehouse-fill-legend">
      <b>Depo rengi</b>
      {BANDS.map((band) => <span key={band}><i style={{ '--status-color': FILL_BAND_COLOR[band] } as React.CSSProperties} />{FILL_BAND_LABEL[band]} <small>{BAND_RANGE[band]}</small></span>)}
    </div>
  );
}

/** One section in the overview, coloured by its fill band; choosing it opens the section. */
function SectionCard({ section, stock }: { section: WarehouseSection; stock: SectionStock }) {
  const toggle = useFactoryStore((s) => s.toggleWarehouseSection);
  const { band, color } = useSectionFill(section.id);
  return (
    <button className="logistics-card seed-card warehouse-section-card" style={sectionStyle(color)} onClick={() => toggle(section.id)}
      title={`${section.name} deposunu aç`}>
      <div className="logistics-card-head">
        <strong className="logistics-plate warehouse-card-name">{section.name}<small>{section.code} · WMS {section.wmsCode}</small></strong>
        <span className="warehouse-status" style={pillStyle(color)}>{FILL_BAND_LABEL[band]} · {percent(stock)}</span>
      </div>
      <StatusBar summary={stock} />
      <div className="seed-foot">
        <span>{integer.format(stock.lanes.empty)} boş · {integer.format(stock.lanes.partial)} kısmi · {integer.format(stock.lanes.full)} dolu göz</span>
        <span>{integer.format(stock.pallets)} / {integer.format(stock.capacity)} palet</span>
      </div>
    </button>
  );
}

/** Feed state and freshness, plus rows that could not be shown. */
function FeedLine() {
  const feed = useWarehouseStock((s) => s.feed);
  const receivedAt = useWarehouseStock((s) => s.receivedAt);
  const error = useWarehouseStock((s) => s.error);
  const issues = useWarehouseStock((s) => s.issues);
  const now = useNow();
  const hidden = issues.invalid + issues.unmatched;
  return (
    <div className={`warehouse-feed warehouse-feed-${feed}`} role="status" title={error ?? undefined}>
      <i />
      <span>{FEED_LABEL[feed]}{feed === 'live' && receivedAt !== null && ` · son değişiklik ${ago(now - receivedAt)}`}</span>
      {hidden > 0 && (
        <em title={[`${issues.invalid} hatalı satır, ${issues.unmatched} eşleşmeyen göz`, ...issues.samples].join('\n')}>
          {integer.format(hidden)} kayıt gösterilemiyor
        </em>
      )}
    </div>
  );
}

function Totals({ summary }: { summary: StockSummary }) {
  return (
    <dl className="seed-summary warehouse-summary">
      <div><dt>Doluluk</dt><dd>{percent(summary)}</dd></div>
      <div><dt>Boş göz</dt><dd>{integer.format(summary.lanes.empty)}</dd></div>
      <div><dt>Kısmi</dt><dd>{integer.format(summary.lanes.partial)}</dd></div>
      <div><dt>Dolu</dt><dd>{integer.format(summary.lanes.full)}</dd></div>
    </dl>
  );
}

/**
 * WMS bin code from what a user types: the code itself (`1-2-57`, also `1 2 57`) or the beam label
 * read off the rack (`D1 R57 K2`: depot, bin, level). Anything else is returned as typed.
 */
function binCodeOf(query: string) {
  const text = query.trim().toUpperCase();
  const label = text.match(/^D\s*(\d+)[\s-]*R\s*(\d+)[\s-]*K\s*(\d+)$/);
  if (label) return `${Number(label[1])}-${Number(label[3])}-${Number(label[2])}`;
  const parts = text.split(/[\s\-./]+/).filter(Boolean);
  return parts.length === 3 && parts.every((part) => /^\d+$/.test(part)) ? parts.map(Number).join('-') : text;
}

/** Finds a bin and takes the camera into its aisle, facing it. */
function BinSearch() {
  const select = useFactoryStore((s) => s.selectWarehouseLane);
  const [query, setQuery] = useState('');
  const [missing, setMissing] = useState(false);
  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const index = laneOfBinCode(binCodeOf(query));
    setMissing(index === undefined);
    if (index !== undefined) select(index, true);
  };
  return (
    <form className="warehouse-search" role="search" onSubmit={onSubmit}>
      <Search size={14} />
      <input value={query} placeholder="Göz ara: 1-2-57 veya D1 R57 K2" aria-label="Göz kodu ara"
        onChange={(event) => { setQuery(event.target.value); setMissing(false); }} />
      {missing && <small>Bulunamadı</small>}
    </form>
  );
}

/**
 * Shows one rack level alone (from above, all levels together show only the top one), and the
 * aisle face filter when one is set.
 */
function LevelFilter({ sectionId }: { sectionId: string }) {
  const level = useFactoryStore((s) => s.warehouseLevel);
  const setLevel = useFactoryStore((s) => s.setWarehouseLevel);
  const faceId = useFactoryStore((s) => s.warehouseFace);
  const setFace = useFactoryStore((s) => s.setWarehouseFace);
  const face = sectionFaces(sectionId).find((item) => item.key === faceId);
  const options = [null, ...Array.from({ length: WAREHOUSE_CONFIG.rackSystem.levels }, (_, i) => i + 1)];
  return (
    <div className="inbound-filters warehouse-levels" role="group" aria-label="Gösterilen kat ve koridor yüzü">
      {options.map((option) => (
        <button key={option ?? 'all'} aria-pressed={level === option} onClick={() => setLevel(option)}>
          {option === null ? 'Tüm katlar' : `Kat ${option}`}
        </button>
      ))}
      {face && (
        <button className="warehouse-chip" onClick={() => setFace(null)} title="Tüm koridor yüzlerini göster">
          {faceLabel(face)} <X size={11} />
        </button>
      )}
    </div>
  );
}

interface BreakdownRowProps {
  label: string;
  detail?: string;
  summary: StockSummary;
  /** Whether the scene shows this row alone. */
  pressed: boolean;
  onSelect: () => void;
}

function BreakdownRow({ label, detail, summary, pressed, onSelect }: BreakdownRowProps) {
  return (
    <li>
      <button className="warehouse-breakdown-row" aria-pressed={pressed} onClick={onSelect}>
        <span>{label}{detail && <small>{detail}</small>}</span>
        <StatusBar summary={summary} />
        <em>{percent(summary)} · {integer.format(summary.lanes.empty)} boş</em>
      </button>
    </li>
  );
}

/**
 * One aisle face as seen from its aisle: a cell per lane, levels bottom to top and positions from
 * the corridor end, live coloured. A cell selects its lane.
 */
function FaceElevation({ face }: { face: AisleFace }) {
  useWarehouseStock((s) => s.version); // the lane arrays change on every flush
  const selected = useFactoryStore((s) => s.selectedWarehouseLane);
  const select = useFactoryStore((s) => s.selectWarehouseLane);
  const positions = face.lanes[0].length;
  return (
    <section className="logistics-card">
      <h3 className="warehouse-breakdown-title">{faceLabel(face)} yüzü · raf cephesi</h3>
      <div className="warehouse-elevation" style={{ '--positions': positions } as React.CSSProperties}>
        {face.lanes.map((row, i) => ({ level: i + 1, row })).reverse().map(({ level, row }) => (
          <div key={level} className="warehouse-elevation-row">
            <span>K{level}</span>
            <div>
              {row.map((index) => {
                const status = laneStatus(index);
                const lane = getRackLanes()[index];
                const label = `${laneStock.bins[index]?.code ?? lane.id} · ${STATUS_LABEL[status]}${status === 'unknown' ? '' : ` · ${laneStock.count[index]}/${laneStock.capacity[index]}`}`;
                return (
                  <button key={index} tabIndex={-1} aria-label={label} title={label} aria-pressed={selected === index}
                    style={{ background: stockColors[status] }} onClick={() => select(index)} />
                );
              })}
            </div>
          </div>
        ))}
        <div className="warehouse-elevation-axis"><span>R{face.firstSlot} · koridor ucu</span><span>R{face.lastSlot}</span></div>
      </div>
    </section>
  );
}

/** Overview: every section with its lanes by status; choosing one opens it. */
function SectionList({ sections }: { sections: Map<string, SectionStock> }) {
  const toggle = useFactoryStore((s) => s.toggleWarehouseSection);
  const close = useFactoryStore((s) => s.closeWarehouse);
  const totals = useMemo(() => {
    const sum: StockSummary = { lanes: { full: 0, partial: 0, empty: 0, unknown: 0 }, pallets: 0, capacity: 0 };
    for (const section of sections.values()) {
      for (const status of LANE_STATUSES) sum.lanes[status] += section.lanes[status];
      sum.pallets += section.pallets;
      sum.capacity += section.capacity;
    }
    return sum;
  }, [sections]);

  return (
    <>
      <header>
        <Boxes size={20} strokeWidth={1.5} />
        <div><small>{WAREHOUSE_BUILDING.code} · DEPO İÇİ</small><h2>Depo seçin</h2></div>
        <span className="logistics-count">{integer.format(getRackLanes().length)} göz</span>
        <button onClick={close} aria-label="Paneli kapat"><X size={16} /></button>
      </header>
      <FeedLine />
      <Totals summary={totals} />
      <BinSearch />
      <FillLegend />
      <Legend />
      <div className="logistics-body">
        {WAREHOUSE_LAYOUT.sections.map((section) => {
          const stock = sections.get(section.id);
          return stock && <SectionCard key={section.id} section={section} stock={stock} />;
        })}
        <p className="logistics-note">
          Depo rengi palet doluluğunu gösterir; sahnedeki çatı, zemin bandı ve etiket aynı rengi alır.
          Her renkli şerit bir WMS gözüdür: koridordan arkaya uzanan, paletlerin arka arkaya dizildiği hat.
          Şeridin üstündeki blok, gözün dolu kısmını arkadan öne doğru gösterir. Göz kapasitesi WMS'teki
          Max Pallet Count değeridir. Bir depoyu açın veya bir göz kodu arayın.
        </p>
      </div>
    </>
  );
}

/** The selected lane: its WMS bin, place in the rack and pallets back to back from the aisle. */
function LaneDetail({ index }: { index: number }) {
  useWarehouseStock((s) => s.version); // the lane arrays change on every flush
  const select = useFactoryStore((s) => s.selectWarehouseLane);
  const lane = getRackLanes()[index];
  const bin = laneStock.bins[index];
  const status = laneStatus(index);
  const count = laneStock.count[index], capacity = laneStock.capacity[index], updatedAt = laneStock.updatedAt[index];
  return (
    <section className="logistics-card warehouse-lane" style={statusStyle(status)} aria-label="Seçili göz">
      <div className="logistics-card-head">
        <strong className="logistics-plate">{bin ? `Göz ${bin.code}` : 'WMS gözü yok'}</strong>
        <span className="warehouse-status">{STATUS_LABEL[status]}</span>
        <button onClick={() => select(null)} aria-label="Göz seçimini kaldır"><X size={14} /></button>
      </div>
      <dl>
        <div><dt>Kat</dt><dd>{lane.level}{bin?.tierName && ` · ${bin.tierName}`}</dd></div>
        <div><dt>Palet</dt><dd>{status === 'unknown' ? '—' : `${count} / ${capacity}`}</dd></div>
        <div><dt>Konum</dt><dd>{lane.aisleId.slice(-2)} {SIDE_LABEL[lane.side]} yüzü · {lane.position}. sıra</dd></div>
        <div><dt>Son değişiklik</dt><dd>{updatedAt ? clock.format(updatedAt) : '—'}</dd></div>
      </dl>
      {capacity > 0 && (
        <>
          <div className="warehouse-lane-cells" aria-hidden>
            {/* Aisle on the left; lanes fill from the back, so the filled cells sit on the right. */}
            {Array.from({ length: capacity }, (_, i) => <span key={i} data-filled={status !== 'unknown' && i >= capacity - count || undefined} />)}
          </div>
          <div className="warehouse-lane-ends"><span>koridor</span><span>arka</span></div>
        </>
      )}
      <small className="warehouse-lane-id">{lane.id}{bin && ` · WMS ID ${bin.id}`}</small>
    </section>
  );
}

/** Open section: its lanes by level and by aisle face, and the selected lane. */
function SectionDetail({ section, stock }: { section: WarehouseSection; stock: SectionStock }) {
  const back = useFactoryStore((s) => s.openWarehouse);
  const close = useFactoryStore((s) => s.closeWarehouse);
  const selectedLane = useFactoryStore((s) => s.selectedWarehouseLane);
  const level = useFactoryStore((s) => s.warehouseLevel);
  const setLevel = useFactoryStore((s) => s.setWarehouseLevel);
  const faceId = useFactoryStore((s) => s.warehouseFace);
  const setFace = useFactoryStore((s) => s.setWarehouseFace);
  const levels = stock.byLevel.map((summary, index) => ({ level: index + 1, summary })).reverse();
  const faces = sectionFaces(section.id);
  const face = faces.find((item) => item.key === faceId);
  const fill = useSectionFill(section.id);

  return (
    <>
      <header>
        <button onClick={() => back()} aria-label="Depo listesine dön" title="Depo listesine dön"><ArrowLeft size={16} /></button>
        <div>
          <small>{section.code} · WMS DEPO {section.wmsCode}</small>
          <h2 className="warehouse-card-name" style={sectionStyle(fill.color)} title={FILL_BAND_LABEL[fill.band]}>{section.name}</h2>
        </div>
        <span className="logistics-count">{integer.format(stock.pallets)} / {integer.format(stock.capacity)} palet</span>
        <button onClick={close} aria-label="Paneli kapat"><X size={16} /></button>
      </header>
      <FeedLine />
      <Totals summary={stock} />
      <BinSearch />
      <LevelFilter sectionId={section.id} />
      <Legend />
      <div className="logistics-body">
        {selectedLane !== null && <LaneDetail index={selectedLane} />}
        {face && <FaceElevation face={face} />}
        <section className="logistics-card">
          <h3 className="warehouse-breakdown-title">Koridor yüzlerine göre</h3>
          <ul className="warehouse-breakdown">
            {faces.map((item) => {
              const summary = stock.byFace.get(item.key);
              return summary && (
                <BreakdownRow key={item.key} label={faceLabel(item)} detail={`göz ${item.firstSlot}–${item.lastSlot}`} summary={summary}
                  pressed={item.key === faceId} onSelect={() => setFace(item.key === faceId ? null : item.key, item.key !== faceId)} />
              );
            })}
          </ul>
        </section>
        <section className="logistics-card">
          <h3 className="warehouse-breakdown-title">Katlara göre</h3>
          <ul className="warehouse-breakdown">
            {levels.map((row) => (
              <BreakdownRow key={row.level} label={`Kat ${row.level}`} summary={row.summary}
                pressed={row.level === level} onSelect={() => setLevel(row.level === level ? null : row.level)} />
            ))}
          </ul>
        </section>
        <p className="logistics-note">
          Bir koridor yüzü seçin: sahnede yalnız o yüz kalır, kamera koridorun içinden ona bakar ve raf cephesi burada
          açılır. Alt katlar için kat seçin. Göz numaraları her katta A1 batı yüzünden başlar, koridor ucundan arkaya 53'er artar. Bağlantı koptuğunda renkler soluklaşır; veri gelmeyen göz boş değil, "veri yok" görünür.
        </p>
      </div>
    </>
  );
}

/**
 * Warehouse mode panel. While open it keeps the WMS feed connected. With no section open it lists
 * the sections; with one open it shows that section's lanes and the selected lane. Escape clears
 * the lane, then the aisle face, then steps back, then closes.
 */
export function WarehousePanel() {
  const open = useFactoryStore((s) => s.warehouseOpen);
  const selectedId = useFactoryStore((s) => s.selectedWarehouseSectionId);
  const selectedLane = useFactoryStore((s) => s.selectedWarehouseLane);
  const selectLane = useFactoryStore((s) => s.selectWarehouseLane);
  const face = useFactoryStore((s) => s.warehouseFace);
  const setFace = useFactoryStore((s) => s.setWarehouseFace);
  const back = useFactoryStore((s) => s.openWarehouse);
  const close = useFactoryStore((s) => s.closeWarehouse);
  const sections = useWarehouseStock((s) => s.sections);

  useEffect(() => open ? openWarehouseStock() : undefined, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedLane !== null) selectLane(null);
      else if (face !== null) setFace(null);
      else if (selectedId) back();
      else close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, selectedId, selectedLane, selectLane, face, setFace, back, close]);

  if (!open) return null;
  const section = WAREHOUSE_LAYOUT.sections.find((item) => item.id === selectedId);
  const stock = section && sections.get(section.id);
  return (
    <aside className="logistics-panel seed-panel" aria-label="Depo iç görünümü">
      {section && stock
        ? <SectionDetail key={section.id} section={section} stock={stock} />
        : <SectionList sections={sections} />}
    </aside>
  );
}
