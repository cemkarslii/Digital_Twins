import type { PlanRect, RackLane, StorageLocation, WarehouseLayout } from '../types/warehouse';
import { WAREHOUSE_CONFIG, type WarehouseConfig } from './warehouseConfig';
import { POSITIONS_PER_ROW } from './storageLocations';
import { binsPerLevel } from './warehouseLanes';

export interface WarehouseCheck {
  name: string;
  ok: boolean;
  detail: string;
}

const EPS = 1e-6;
const inside = (inner: PlanRect, outer: PlanRect) =>
  inner.minX >= outer.minX - EPS && inner.maxX <= outer.maxX + EPS && inner.minZ >= outer.minZ - EPS && inner.maxZ <= outer.maxZ + EPS;
const overlaps = (a: PlanRect, b: PlanRect) =>
  a.minX < b.maxX - EPS && b.minX < a.maxX - EPS && a.minZ < b.maxZ - EPS && b.minZ < a.maxZ - EPS;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/**
 * Deterministic checks of the layout against the annotated floor plan and the rack specification.
 * Pure; the same layout always yields the same result.
 */
export function validateWarehouseLayout(
  layout: WarehouseLayout, locations: StorageLocation[], lanes: RackLane[], config: WarehouseConfig = WAREHOUSE_CONFIG,
): WarehouseCheck[] {
  const checks: WarehouseCheck[] = [];
  const check = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });
  const { sections, corridor, loadingArea, office, interior, storage } = layout;
  const byName = new Map(sections.map((section) => [section.name, section]));
  const [d1, d2, d3, d4] = ['DEPO 1', 'DEPO 2', 'DEPO 3', 'DEPO 4'].map((name) => byName.get(name));
  const { partition } = config.shell;

  check('Dört depo bölümü', sections.length === 4 && !!(d1 && d2 && d3 && d4), `${sections.length} bölüm`);
  if (d1 && d2 && d3 && d4) {
    check('DEPO 1 sol üst, DEPO 2 sağ üst', d1.bounds.maxX <= d2.bounds.minX && near(d1.bounds.minZ, d2.bounds.minZ) && d1.bounds.maxZ <= corridor.minZ, 'kuzey sıra, batı → doğu');
    check('DEPO 3 sol alt, DEPO 4 sağ alt', d3.bounds.maxX <= d4.bounds.minX && near(d3.bounds.maxZ, d4.bounds.maxZ) && d3.bounds.minZ >= corridor.maxZ, 'güney sıra, batı → doğu');
    check('DEPO 3, DEPO 1 karşısında; DEPO 4, DEPO 2 karşısında', near(d1.bounds.minX, d3.bounds.minX) && near(d2.bounds.maxX, d4.bounds.maxX), 'aynı sütun sınırları');
    const gap12 = d2.bounds.minX - d1.bounds.maxX, gap34 = d4.bounds.minX - d3.bounds.maxX;
    check('DEPO 1–2 ve DEPO 3–4 bitişik', near(gap12, partition) && near(gap34, partition), `aradaki tek bölme duvarı ${gap12.toFixed(2)} m / ${gap34.toFixed(2)} m`);
  }

  const corridorLength = corridor.maxX - corridor.minX, corridorWidth = corridor.maxZ - corridor.minZ;
  check('Ana koridor yatay', corridorLength > corridorWidth * 4, `${corridorLength.toFixed(1)} m × ${corridorWidth.toFixed(1)} m`);
  const north = sections.filter((s) => s.row === 'north'), south = sections.filter((s) => s.row === 'south');
  check('Koridor üst ve alt depoları ayırıyor',
    north.every((s) => s.bounds.maxZ <= corridor.minZ) && south.every((s) => s.bounds.minZ >= corridor.maxZ)
    && near(corridor.minX, storage.minX) && corridor.maxX >= storage.maxX,
    'tüm depo genişliği boyunca, doğu ucu yükleme alanına açık');
  check('Koridorda raf yok', sections.every((s) => s.blocks.every((block) => !overlaps(block, corridor))), 'raf blokları koridor dışında');

  const entrances = sections.flatMap((s) => s.entrances);
  check('Her depoda tam iki giriş', sections.every((s) => s.entrances.length === 2), sections.map((s) => `${s.name}: ${s.entrances.length}`).join(', '));
  check('Toplam sekiz giriş', entrances.length === 8, `${entrances.length} giriş`);
  check('Tüm girişler ana koridora bakıyor', sections.every((s) => s.entrances.every((e) =>
    s.row === 'north' ? e.side === 'south' && near(e.center[1], corridor.minZ) : e.side === 'north' && near(e.center[1], corridor.maxZ))),
  'üst depolar güneye, alt depolar kuzeye açılıyor');
  check('DEPO 3 ve 4 dış güney duvarında giriş yok', south.every((s) => s.entrances.every((e) => !near(e.center[1], interior.maxZ))), 'girişler koridor duvarında');
  // The doorway plus a turning zone behind it, inside the section, must be free of racks.
  const doorway = (s: (typeof sections)[number], e: (typeof entrances)[number]): PlanRect => {
    const into = s.row === 'north' ? -1 : 1, wall = e.center[1] + into * partition;
    const reach = wall + into * config.rackSystem.minCrossAisle;
    return { minX: e.center[0] - e.width / 2, maxX: e.center[0] + e.width / 2, minZ: Math.min(wall, reach), maxZ: Math.max(wall, reach) };
  };
  check('Girişlerin önü açık', sections.every((s) => s.entrances.every((e) => {
    const zone = doorway(s, e);
    return zone.minX >= s.bounds.minX && zone.maxX <= s.bounds.maxX && s.blocks.every((block) => !overlaps(block, zone));
  })), `giriş + ${config.rackSystem.minCrossAisle} m dönüş alanı rafsız; girişler raf koridorlarına hizalı`);
  const crossDepths = sections.map((s) => s.crossAisle.maxZ - s.crossAisle.minZ);
  check('Giriş önü dönüş alanı', crossDepths.every((d) => d >= config.rackSystem.minCrossAisle - EPS), `${Math.min(...crossDepths).toFixed(2)} m (en az ${config.rackSystem.minCrossAisle} m)`);
  const r = config.rackSystem;
  check('Raf koridorları yalnız girişlerin hizasında', sections.every((s) => s.aisles.length === s.entrances.length
    && s.entrances.every((e, i) => near(e.center[0], s.aisles[i].centerX))),
  sections.map((s) => `${s.name}: ${s.aisles.length} koridor`).join(', '));
  check('Raf koridorları forklift için yeterli', sections.every((s) => s.aisles.every((a) => a.width >= r.minAisle - EPS && a.width >= config.entrance.width)),
    sections.map((s) => `${s.name}: ${s.aisles.map((a) => a.width.toFixed(2)).join(' / ')} m`).join(', '));
  // Wall gap, blocks and aisles must add up to the section width: nothing else is left between racks.
  check('Koridorlar dışında raflar arasında boşluk yok', sections.every((s) => {
    const spans = [...s.blocks, ...s.aisles].sort((a, b) => a.minX - b.minX);
    const contiguous = spans.every((span, i) => i === 0 || near(span.minX, spans[i - 1].maxX));
    const packed = s.blocks.every((block) => block.uprightX.every((x, i) => i === 0 || near(x - block.uprightX[i - 1], r.rowPitch)));
    return contiguous && packed && near(spans[0].minX - s.bounds.minX, r.wallGap) && near(s.bounds.maxX - spans[spans.length - 1].maxX, r.wallGap);
  }), `sıralar ${r.rowPitch} m aralıkla ortak dikmelerde; bloklar koridora bitişik`);

  const rows = sections.flatMap((s) => s.rows);
  const perRow = new Map<string, StorageLocation[]>();
  for (const location of locations) {
    const list = perRow.get(location.rowId) ?? [];
    list.push(location);
    perRow.set(location.rowId, list);
  }
  const { levels, positionsPerLevel } = r;
  check('Her raf sırasında 5 seviye', rows.every((row) => new Set(perRow.get(row.id)?.map((l) => l.level)).size === levels), `${rows.length} sıra`);
  check('Her seviyede 53 pozisyon', rows.every((row) => {
    const list = perRow.get(row.id) ?? [];
    return Array.from({ length: levels }, (_, i) => list.filter((l) => l.level === i + 1).length).every((n) => n === positionsPerLevel);
  }), `${POSITIONS_PER_ROW} pozisyon / sıra`);
  check('Pozisyon sayısı', locations.length === rows.length * POSITIONS_PER_ROW, `${locations.length} = ${rows.length} sıra × ${POSITIONS_PER_ROW}`);
  check('Pozisyon kimlikleri benzersiz', new Set(locations.map((l) => l.id)).size === locations.length, locations[0] ? `${locations[0].id} … ${locations[locations.length - 1].id}` : '—');
  // Each row reaches its aisle through the rows in front of it, never across another aisle or a wall.
  check('Her raf sırasına koridordan erişim', sections.every((s) => s.blocks.every((block) => block.rows.every((row) => {
    const aisle = s.aisles.find((a) => a.id === row.aisleId);
    if (!aisle || row.laneDepth < 1 || row.laneDepth > row.laneLength || row.laneLength > r.laneCapacity) return false;
    const edge = row.facing === 1 ? block.maxX : block.minX;
    const between = Math.round(Math.abs(edge - row.centerX) / r.rowPitch - 0.5) + 1;
    return near(row.facing === 1 ? aisle.minX : aisle.maxX, edge) && between === row.laneDepth;
  }))), `en derin hat ${Math.max(...rows.map((row) => row.laneLength))} palet (sınır ${r.laneCapacity})`);

  const byLane = new Map<string, StorageLocation[]>();
  for (const location of locations) {
    const lane = byLane.get(location.laneId) ?? [];
    lane.push(location);
    byLane.set(location.laneId, lane);
  }
  const laneList = [...byLane.values()];
  check(`Bir hat en fazla ${r.laneCapacity} sıra derin`, laneList.every((lane) => lane.length <= r.laneCapacity
    && lane.every((l) => l.laneLength === lane.length)), `${laneList.length} hat`);

  // WMS bins are lanes: one per palette lane, numbered 1 … N without gaps in every section and tier.
  check('Her hat bir WMS gözü', lanes.length === byLane.size && lanes.every((lane, i) => lane.index === i && byLane.has(lane.id)),
    `${lanes.length} göz = ${byLane.size} hat`);
  check('Göz numaraları her katta kesintisiz', sections.every((s) => Array.from({ length: r.levels }, (_, l) => {
    const slots = lanes.filter((lane) => lane.sectionId === s.id && lane.level === l + 1).map((lane) => lane.slot).sort((a, b) => a - b);
    return slots.length === binsPerLevel(s) && slots.every((slot, i) => slot === i + 1);
  }).every(Boolean)), sections.map((s) => `${s.name}: kat başına ${binsPerLevel(s)}`).join(', '));
  check('Her göz kendi koridoruna açılıyor', lanes.every((lane) => {
    const aisle = sections.find((s) => s.id === lane.sectionId)?.aisles.find((a) => a.id === lane.aisleId);
    return !!aisle && near(lane.frontX, lane.side === 'west' ? aisle.minX - r.upright / 2 : aisle.maxX + r.upright / 2)
      && Math.abs(lane.frontX - lane.backX) <= r.laneCapacity * r.rowPitch + EPS;
  }), 'ön ucu koridorda, arka ucu bloğun içinde');

  check('Raflar depo sınırları içinde', sections.every((s) => s.blocks.every((block) => inside(block, s.bounds))), 'tüm raf blokları');
  check('Depolar çakışmıyor', sections.every((a, i) => sections.every((b, j) => i === j || !overlaps(a.bounds, b.bounds))), 'bölümler ayrık');
  check('Depolar bina içinde, yükleme alanından ayrı', sections.every((s) => inside(s.bounds, storage) && !overlaps(s.bounds, loadingArea)), 'depo bloğu batıda');
  check('Yükleme alanı sağ (doğu) tarafta', near(loadingArea.maxX, interior.maxX) && loadingArea.minX > storage.maxX, `${(loadingArea.maxX - loadingArea.minX).toFixed(1)} m genişlik`);
  check('Rampa kapıları yükleme alanına açılıyor', layout.dockOpenings.length > 0 && layout.dockOpenings.every((d) =>
    d.x - d.width / 2 >= loadingArea.minX + config.loadingArea.dockClearance - EPS && d.x + d.width / 2 <= loadingArea.maxX),
  layout.dockOpenings.map((d) => d.id).join(', '));
  check('Çalışma odası yükleme alanında, doğu duvarında', inside(office, loadingArea) && near(office.maxX, interior.maxX), 'doğu duvarına bitişik');
  const length = loadingArea.maxZ - loadingArea.minZ;
  const officeShare = ((office.minZ + office.maxZ) / 2 - loadingArea.minZ) / length;
  check('Çalışma odası yükleme alanının ortasında', officeShare > 0.35 && officeShare < 0.65 && loadingArea.maxZ - office.maxZ > length * 0.25,
    `kuzeyden %${Math.round(officeShare * 100)}; güneydoğu köşesine ${(loadingArea.maxZ - office.maxZ).toFixed(1)} m`);
  check('İç mekânda tır yok', !config.loadingArea.allowTrucksInside, 'tırlar dıştaki R3 rampasında kalır');
  return checks;
}
