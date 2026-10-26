import { WAREHOUSE_LAYOUT } from '../src/data/warehouseLayout';
import { getStorageLocations } from '../src/data/storageLocations';
import { validateWarehouseLayout } from '../src/data/warehouseValidation';
import { getRackLanes, laneOfBin } from '../src/data/warehouseLanes';
import { parseBin, parseBinState } from '../src/services/warehouseStockService';

/** A bin row exactly as the WMS export sends it. */
const WMS_BIN_SAMPLE = {
  'ID': '39', 'Code': '1-1-1', 'Name': '1-1-1', 'Facility ID': '3', 'Max Height': '300', 'Max Length': '820',
  'Max Pallet Count': '8', 'Max Volume': null, 'Max Weight': null, 'Max Width': '100',
  'Warehouse Bin - Bin → ID': '3', 'Warehouse Bin - Bin → Code': '1', 'Warehouse Bin - Bin → Name': '1',
  'Warehouse Tier - Tier → ID': '3', 'Warehouse Tier - Tier → Code': '1', 'Warehouse Tier - Tier → Name': '1.Raf',
  'Warehouse Row - Row → ID': '4', 'Warehouse Row - Row → Code': '*', 'Warehouse Row - Row → Name': '*',
  'Warehouse Bay - Bay → ID': '4', 'Warehouse Bay - Bay → Code': '*', 'Warehouse Bay - Bay → Name': '*',
  'Warehouse → ID': '4', 'Warehouse → Code': '1', 'Warehouse → Name': 'SOĞUK HAVA DEPO - 1',
};

/** Prints the warehouse layout summary and its checks; exits non-zero if any check fails. */
const layout = WAREHOUSE_LAYOUT;
const locations = getStorageLocations();
const lanes = getRackLanes();
const f = (value: number) => value.toFixed(2);
const rect = ({ minX, maxX, minZ, maxZ }: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
  `x ${f(minX)} … ${f(maxX)}, z ${f(minZ)} … ${f(maxZ)}`;

console.log(`Bina ${layout.buildingId} · zemin y=${layout.floorY} · tavan y=${layout.ceilingY}`);
console.log(`İç alan     ${rect(layout.interior)}`);
console.log(`Depo bloğu  ${rect(layout.storage)}`);
console.log(`Ana koridor ${rect(layout.corridor)}`);
console.log(`Yükleme     ${rect(layout.loadingArea)}`);
console.log(`Çalışma od. ${rect(layout.office)}`);
console.log(`Rampa       ${layout.dockOpenings.map((d) => `${d.id}@x=${f(d.x)}`).join(', ')}`);
for (const s of layout.sections) {
  console.log(`${s.name} (${s.code}) ${rect(s.bounds)} · ${s.blocks.map((b) => b.rows.length).join(' + ')} sıra, koridor ${s.aisles.map((a) => f(a.width)).join(' / ')} m, dönüş ${f(s.crossAisle.maxZ - s.crossAisle.minZ)} m`);
  console.log(`  koridorlar: ${s.aisles.map((a) => `${a.id} x ${f(a.minX)} … ${f(a.maxX)}`).join('; ')}`);
  console.log(`  girişler: ${s.entrances.map((e) => `${e.id} ${e.side} @ (${f(e.center[0])}, ${f(e.center[1])})`).join('; ')}`);
}
console.log(`Toplam pozisyon: ${locations.length} · WMS gözü (hat): ${lanes.length}\n`);

const checks = validateWarehouseLayout(layout, locations, lanes);
const throws = (run: () => unknown) => { try { run(); return false; } catch { return true; } };
const sample = parseBin(WMS_BIN_SAMPLE);
const sampleLane = laneOfBin(sample);
checks.push(
  { name: 'WMS göz satırı okunuyor', ok: sample.capacity === 8 && sample.code === '1-1-1', detail: `${sample.code} · ${sample.warehouseName} · ${sample.tierName} · ${sample.capacity} palet` },
  { name: 'WMS gözü 1-1-1 → DEPO 1, kat 1, A1 batı, pozisyon 1', ok: sampleLane?.id === 'W01-A1W-L01-P01', detail: sampleLane?.id ?? 'eşleşmedi' },
  { name: 'Yerleşimde olmayan göz eşleşmiyor', ok: !laneOfBin({ ...sample, binCode: '9999' }) && !laneOfBin({ ...sample, warehouseCode: '9' }), detail: '1-1-9999, 9-1-1' },
  { name: 'Bozuk WMS satırları reddediliyor', ok: throws(() => parseBin({ ...WMS_BIN_SAMPLE, 'Max Pallet Count': null }))
    && throws(() => parseBinState({ binId: '39', palletCount: '-1', updatedAt: '2026-10-26T09:00:00Z' }))
    && !throws(() => parseBinState({ binId: '39', palletCount: '3', updatedAt: '2026-10-26T09:00:00Z' })),
  detail: 'kapasitesiz göz, negatif palet' },
);
for (const c of checks) console.log(`${c.ok ? 'OK  ' : 'FAIL'} ${c.name} — ${c.detail}`);
const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} kontrol geçti.`);
process.exit(failed ? 1 : 0);
