import { useMemo } from 'react';
import { ArrowLeft, Navigation } from 'lucide-react';
import { useFactoryStore, WAREHOUSE_STEPS, warehouseNavFace, warehouseNavStep } from '../../store/useFactoryStore';
import {
  FILL_BAND_COLOR, fillBand, laneColor, laneStatus, laneStock, useWarehouseStock, type StockSummary,
} from '../../store/useWarehouseStock';
import { WAREHOUSE_BUILDING, WAREHOUSE_LAYOUT } from '../../data/warehouseLayout';
import { getRackLanes, sectionFaces, type AisleFace } from '../../data/warehouseLanes';
import type { LaneStatus, WarehouseSection, WarehouseStep } from '../../types/warehouse';
import { CollapseToggle } from './WarehousePanel';

const SIDE_LABEL = { west: 'batı', east: 'doğu' } as const;
const STATUS_LABEL: Record<LaneStatus, string> = { full: 'Dolu', partial: 'Kısmi', empty: 'Boş', unknown: 'Veri yok' };
const STEP_LABEL: Record<WarehouseStep, string> = { section: 'Depo', face: 'Cephe', level: 'Kat', bin: 'Göz' };
/** What to do at each step, and once a bin is chosen. */
const PROMPT = ['Depo seçin', 'Raf cephesi seçin', 'Kat seçin', 'Göz seçin', 'Göz seçildi'];
const HINT = [
  'Renk depo doluluğunu gösterir. Seçince kamera depoya iner.',
  'Kuzey yukarıda. Bir cephe seçince kamera koridora girip cepheye bakar.',
  'Raf seçilen katta kesilir, kamera o kat hizasına çıkar.',
  'Soldan koridor ucu. Bir göz seçince kamera göze bakar.',
  'Ayrıntılar sağ panelde. Başka bir göz seçebilir ya da geri dönebilirsiniz.',
];
/** Bins per row of the bin picker, so a 53-bin level stays clickable in a narrow card. */
const BINS_PER_ROW = 18;

const faceLabel = (face: Pick<AisleFace, 'aisleId' | 'side'>) => `${face.aisleId.slice(-2)} ${SIDE_LABEL[face.side]}`;
const share = (summary: StockSummary | undefined) => summary?.capacity ? summary.pallets / summary.capacity : 0;
const percent = (summary: StockSummary | undefined) => summary?.capacity ? `%${Math.round(share(summary) * 100)}` : '—';
const fillStyle = (summary: StockSummary | undefined) => ({ '--fill': FILL_BAND_COLOR[fillBand(summary)] } as React.CSSProperties);

/** Totals over some lanes; read with a subscription to the stock `version`. */
function summarizeLanes(indices: readonly number[]): StockSummary {
  const summary: StockSummary = { lanes: { full: 0, partial: 0, empty: 0, unknown: 0 }, pallets: 0, capacity: 0 };
  for (const index of indices) {
    const status = laneStatus(index);
    summary.lanes[status]++;
    if (status === 'unknown') continue;
    summary.pallets += laneStock.count[index];
    summary.capacity += laneStock.capacity[index];
  }
  return summary;
}

/** Step 1: the four sections in plan, north up, around the central corridor, coloured by fill. */
function SectionPicker() {
  const sections = useWarehouseStock((s) => s.sections);
  const open = useFactoryStore((s) => s.openWarehouse);
  const cell = (section: WarehouseSection) => {
    const stock = sections.get(section.id);
    return (
      <button key={section.id} className="wnav-tile" style={{ ...fillStyle(stock), gridArea: `${section.row}-${section.column}` }}
        onClick={() => open(section.id)} title={`${section.name} deposuna gir`}>
        <strong>{section.name}</strong>
        <small>{percent(stock)} dolu</small>
      </button>
    );
  };
  return (
    <div className="wnav-site" role="group" aria-label="Depolar, kuzey yukarıda">
      {WAREHOUSE_LAYOUT.sections.map(cell)}
      <span className="wnav-corridor" style={{ gridArea: 'corridor' }}>Ana koridor</span>
      <span className="wnav-dock" style={{ gridArea: 'dock' }}>Yükleme</span>
    </div>
  );
}

/** Step 2: the section's aisle faces west to east, each beside its aisle, on the corridor side of the plan. */
function FacePicker({ section }: { section: WarehouseSection }) {
  const stock = useWarehouseStock((s) => s.sections.get(section.id));
  const setFace = useFactoryStore((s) => s.setWarehouseFace);
  const faces = sectionFaces(section.id);
  return (
    <div className="wnav-section" data-corridor={section.entranceSide}>
      <span className="wnav-corridor">Ana koridor · giriş</span>
      <div className="wnav-faces" role="group" aria-label="Raf cepheleri, batıdan doğuya">
        {faces.map((face) => {
          const summary = stock?.byFace.get(face.key);
          return [
            face.side === 'east' && <span key={`${face.aisleId}-aisle`} className="wnav-aisle">{face.aisleId.slice(-2)}</span>,
            <button key={face.key} className="wnav-tile wnav-face" style={fillStyle(summary)} onClick={() => setFace(face.key, true)}
              title={`${faceLabel(face)} cephesi · göz ${face.firstSlot}–${face.lastSlot}`}>
              <strong>{face.aisleId.slice(-2)}</strong>
              <small>{SIDE_LABEL[face.side]}</small>
              <small>{percent(summary)}</small>
            </button>,
          ];
        })}
      </div>
    </div>
  );
}

/** Step 3: the face's levels, top level on top, with how full each one is. */
function LevelPicker({ face }: { face: AisleFace }) {
  useWarehouseStock((s) => s.version); // the lane arrays change on every flush
  const level = useFactoryStore((s) => s.warehouseLevel);
  const setLevel = useFactoryStore((s) => s.setWarehouseLevel);
  const levels = face.lanes.map((lanes, i) => ({ level: i + 1, summary: summarizeLanes(lanes) })).reverse();
  return (
    <ol className="wnav-levels" aria-label={`${faceLabel(face)} cephesinin katları`}>
      {levels.map((row) => (
        <li key={row.level}>
          <button className="wnav-level" aria-pressed={row.level === level} style={fillStyle(row.summary)} onClick={() => setLevel(row.level, true)}>
            <strong>Kat {row.level}</strong>
            <span className="wnav-meter"><i style={{ width: `${share(row.summary) * 100}%` }} /></span>
            <small>{percent(row.summary)} · {row.summary.lanes.empty} boş</small>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Step 4: the bins of one level of the face, from the corridor end, live coloured; plus the chosen one. */
function BinPicker({ face, level }: { face: AisleFace; level: number }) {
  useWarehouseStock((s) => s.version); // the lane arrays change on every flush
  const selected = useFactoryStore((s) => s.selectedWarehouseLane);
  const select = useFactoryStore((s) => s.selectWarehouseLane);
  const rows = useMemo(() => {
    const lanes = face.lanes[level - 1];
    return Array.from({ length: Math.ceil(lanes.length / BINS_PER_ROW) }, (_, i) => lanes.slice(i * BINS_PER_ROW, (i + 1) * BINS_PER_ROW));
  }, [face, level]);
  const lane = selected === null ? undefined : getRackLanes()[selected];
  const status = selected === null ? undefined : laneStatus(selected);
  return (
    <>
      <div className="wnav-bins" style={{ '--bins': BINS_PER_ROW } as React.CSSProperties} role="group" aria-label={`Kat ${level} gözleri`}>
        {rows.map((row) => (
          <div key={row[0]} className="wnav-bin-row">
            <span>R{getRackLanes()[row[0]].slot}</span>
            <div>
              {row.map((index) => {
                const label = `${laneStock.bins[index]?.code ?? getRackLanes()[index].id} · ${STATUS_LABEL[laneStatus(index)]}`;
                return <button key={index} aria-label={label} title={label} aria-pressed={selected === index}
                  style={{ background: laneColor(index) }} onClick={() => select(index, true)} />;
              })}
            </div>
          </div>
        ))}
      </div>
      {lane && status && (
        <div className="wnav-pick" style={{ '--fill': laneColor(lane.index) } as React.CSSProperties} role="status">
          <i />
          <strong>{laneStock.bins[lane.index]?.code ?? lane.id}</strong>
          <span>{STATUS_LABEL[status]}{status !== 'unknown' && ` · ${laneStock.count[lane.index]}/${laneStock.capacity[lane.index]} palet`}</span>
        </div>
      )}
    </>
  );
}

/**
 * Warehouse navigation, bottom left while warehouse mode is open: section, aisle face, level, bin, one
 * choice at a time. It reads and writes the same selection as the scene and the side panel, so all
 * three always agree; a finished step goes back to it, as does Escape.
 */
export function WarehouseNavigator() {
  const open = useFactoryStore((s) => s.warehouseOpen);
  const sectionId = useFactoryStore((s) => s.selectedWarehouseSectionId);
  const faceId = useFactoryStore(warehouseNavFace);
  const level = useFactoryStore((s) => s.warehouseLevel);
  const laneIndex = useFactoryStore((s) => s.selectedWarehouseLane);
  const step = useFactoryStore(warehouseNavStep);
  const rewind = useFactoryStore((s) => s.rewindWarehouse);
  const feed = useWarehouseStock((s) => s.feed);
  const collapsed = useFactoryStore((s) => s.warehouseCollapsed.nav);
  if (!open) return null;

  const section = WAREHOUSE_LAYOUT.sections.find((item) => item.id === sectionId);
  const face = section && sectionFaces(section.id).find((item) => item.key === faceId);
  const lane = laneIndex === null ? undefined : getRackLanes()[laneIndex];
  const values: Record<WarehouseStep, string | undefined> = {
    section: section?.name,
    face: face && faceLabel(face),
    level: level === null ? undefined : `Kat ${level}`,
    bin: lane && `R${lane.slot}`,
  };

  return (
    <nav className="wnav" data-collapsed={collapsed || undefined} aria-label="Depo navigasyonu">
      <header>
        <button onClick={() => rewind(WAREHOUSE_STEPS[step - 1])} disabled={step === 0} aria-label="Bir adım geri" title="Bir adım geri (Esc)">
          <ArrowLeft size={15} />
        </button>
        <div>
          <small><Navigation size={9} /> {WAREHOUSE_BUILDING.code} · ADIM {Math.min(step + 1, WAREHOUSE_STEPS.length)}/{WAREHOUSE_STEPS.length}</small>
          <h2>{PROMPT[step]}</h2>
        </div>
        <i className={`wnav-feed wnav-feed-${feed}`} title={feed === 'live' ? 'WMS canlı' : 'WMS verisi yok; renkler güncel olmayabilir'} />
        <CollapseToggle card="nav" />
      </header>
      <ol className="wnav-steps">
        {WAREHOUSE_STEPS.map((item, i) => (
          <li key={item}>
            <button disabled={i >= step} aria-current={i === step ? 'step' : undefined} data-done={i < step || undefined}
              onClick={() => rewind(item)} title={i < step ? `${STEP_LABEL[item]} seçimine dön` : undefined}>
              <small>{STEP_LABEL[item]}</small>
              <strong>{values[item] ?? '—'}</strong>
            </button>
          </li>
        ))}
      </ol>
      <div className="wnav-body">
        {step === 0 && <SectionPicker />}
        {step === 1 && section && <FacePicker section={section} />}
        {step === 2 && face && <LevelPicker face={face} />}
        {step >= 3 && face && level !== null && <BinPicker face={face} level={level} />}
        <p className="wnav-hint">{HINT[step]}</p>
      </div>
    </nav>
  );
}
