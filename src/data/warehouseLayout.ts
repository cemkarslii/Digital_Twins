import type { BuildingEntity } from '../types/factory';
import type { DockBank } from '../types/docks';
import type {
  DockOpening, PlanRect, RackBlock, RackRow, WarehouseAisle, WarehouseEntrance, WarehouseLayout, WarehouseSection, WarehouseSectionSpec,
} from '../types/warehouse';
import { DEFAULT_BUILDINGS } from './factoryLayout';
import { DOCK_BANKS, DOCK_HIGH } from './dockBanks';
import { WAREHOUSE_CONFIG, type WarehouseConfig } from './warehouseConfig';

const pad2 = (value: number) => String(value).padStart(2, '0');

function fail(message: string): never {
  throw new Error(`Depo yerleşimi: ${message}`);
}

/** Length of one rack row: one pitch per compartment plus the closing upright. */
export const rackLength = (config: WarehouseConfig = WAREHOUSE_CONFIG) =>
  config.rackSystem.positionsPerLevel * config.rackSystem.positionPitch + config.rackSystem.upright;

/** Rows of every block across a section, west to east: a wall block, inner blocks, a wall block. */
function blockRowCounts(spec: WarehouseSectionSpec, config: WarehouseConfig) {
  const lane = config.rackSystem.laneCapacity;
  return Array.from({ length: spec.entranceCount + 1 }, (_, b) => (b === 0 || b === spec.entranceCount ? lane : 2 * lane));
}

/** Narrowest aisle: wide enough for the forklifts and for the entrance in line with it. */
const minAisleWidth = (config: WarehouseConfig) => Math.max(config.rackSystem.minAisle, config.entrance.width);

/** Width a section needs: wall gaps, every aisle at its minimum and the rack blocks between them. */
export function requiredSectionWidth(spec: WarehouseSectionSpec, config: WarehouseConfig = WAREHOUSE_CONFIG) {
  const r = config.rackSystem;
  const rows = blockRowCounts(spec, config);
  return 2 * r.wallGap + spec.entranceCount * minAisleWidth(config) + rows.reduce((sum, n) => sum + n * r.rowPitch + r.upright, 0);
}

/**
 * Rack blocks across a section, following the reference pattern RAF | KORİDOR | RAF RAF | KORİDOR | RAF:
 * aisles exist only in line with the entrances, and racks everywhere else stand shoulder to shoulder.
 * Every lane holds `laneCapacity` pallets: a wall block is one lane deep, an inner block two (one
 * loaded from each aisle). The aisles share whatever width the blocks leave.
 */
function fitRacks(spec: WarehouseSectionSpec, bounds: PlanRect, config: WarehouseConfig) {
  const r = config.rackSystem;
  const lane = r.laneCapacity;
  const counts = blockRowCounts(spec, config);
  const usable = bounds.maxX - bounds.minX - 2 * r.wallGap;
  const blocksWidth = counts.reduce((sum, n) => sum + n * r.rowPitch + r.upright, 0);
  const aisleWidth = (usable - blocksWidth) / spec.entranceCount;
  const minAisle = minAisleWidth(config);
  if (aisleWidth < minAisle - 1e-6) fail(`${spec.name} ${usable.toFixed(1)} m genişliğinde; ${lane} paletlik hatlarla ${aisleWidth.toFixed(2)} m koridor kalıyor (en az ${minAisle} m).`);

  const length = rackLength(config);
  const north = spec.row === 'north';
  // The rack ends keep `rearClearance` from the outer wall; the rest is the cross aisle at the entrances.
  const minZ = north ? bounds.minZ + r.rearClearance : bounds.maxZ - r.rearClearance - length;
  const maxZ = minZ + length;
  const crossAisle: PlanRect = north
    ? { minX: bounds.minX, maxX: bounds.maxX, minZ: maxZ, maxZ: bounds.maxZ }
    : { minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: minZ };
  const crossDepth = crossAisle.maxZ - crossAisle.minZ;
  if (crossDepth < r.minCrossAisle - 1e-6) {
    fail(`${spec.name}: ${r.positionsPerLevel} pozisyonlu raf (${length.toFixed(2)} m) sığıyor ama giriş önünde yalnızca ${crossDepth.toFixed(2)} m dönüş alanı kalıyor (en az ${r.minCrossAisle} m).`);
  }
  // Position 1 is the compartment next to the cross aisle.
  const startZ = north ? maxZ - r.upright / 2 : minZ + r.upright / 2;
  const stepZ: 1 | -1 = north ? -1 : 1;

  const blocks: RackBlock[] = [], rows: RackRow[] = [], aisles: WarehouseAisle[] = [];
  const aisleId = (index: number) => `${spec.code}-A${index + 1}`;
  const last = counts.length - 1;
  let x = bounds.minX + r.wallGap;
  counts.forEach((count, b) => {
    const minX = x, maxX = x + count * r.rowPitch + r.upright;
    const blockRows = Array.from({ length: count }, (_, i): RackRow => {
      // Wall blocks face their only aisle; an inner block's west lane faces west, its east lane east.
      const facing: 1 | -1 = b === 0 ? 1 : b === last ? -1 : i < lane ? -1 : 1;
      const number = rows.length + i + 1;
      return {
        id: `${spec.code}-R${pad2(number)}`, sectionId: spec.id, number,
        centerX: minX + r.upright / 2 + (i + 0.5) * r.rowPitch,
        facing, aisleId: aisleId(facing === 1 ? b : b - 1),
        laneDepth: facing === 1 ? count - i : i + 1,
        laneLength: lane,
        startZ, stepZ,
      };
    });
    rows.push(...blockRows);
    blocks.push({
      id: `${spec.code}-B${b + 1}`, sectionId: spec.id, minX, maxX,
      uprightX: Array.from({ length: count + 1 }, (_, i) => minX + r.upright / 2 + i * r.rowPitch),
      rows: blockRows, minZ, maxZ,
    });
    x = maxX;
    if (b < last) {
      aisles.push({ id: aisleId(b), sectionId: spec.id, minX: x, maxX: x + aisleWidth, minZ, maxZ, centerX: x + aisleWidth / 2, width: aisleWidth });
      x += aisleWidth;
    }
  });
  return { blocks, rows, aisles, crossAisle };
}

/** One entrance per aisle, centred on it, so forklifts drive straight from the corridor into the aisle. */
function placeEntrances(spec: WarehouseSectionSpec, wallZ: number, aisles: WarehouseAisle[], config: WarehouseConfig) {
  const { width, height } = config.entrance;
  return aisles.map((aisle, index): WarehouseEntrance => {
    if (aisle.width < width - 1e-6) fail(`${spec.name}: ${aisle.width.toFixed(2)} m koridor ${width} m girişten dar.`);
    return {
      id: `${spec.code}-G${index + 1}`, sectionId: spec.id, number: index + 1,
      center: [aisle.centerX, wallZ], side: spec.entranceSide, width, height,
    };
  });
}

export function calculateWarehouseLayout(
  building: BuildingEntity, dockBank: DockBank, config: WarehouseConfig = WAREHOUSE_CONFIG,
): WarehouseLayout {
  if (building.rotationY !== 0) fail('döndürülmüş binalar desteklenmez.');
  if (dockBank.buildingId !== building.id || dockBank.face !== 'north') {
    fail(`${dockBank.code} rampası ${building.code} kuzey cephesinde olmalı.`);
  }
  const { width, depth, height } = building.dimensions;
  const { lining, partition, ceilingGap } = config.shell;
  const interior: PlanRect = { minX: -width / 2 + lining, maxX: width / 2 - lining, minZ: -depth / 2 + lining, maxZ: depth / 2 - lining };

  // The racks set the section width; two sections side by side, the loading area takes the rest
  // and must receive every dock door, so no storage section gets a truck door of its own.
  const sectionWidth = Math.max(...config.sections.map((spec) => requiredSectionWidth(spec, config)));
  const storage: PlanRect = { minX: interior.minX, maxX: interior.minX + 2 * sectionWidth + partition, minZ: interior.minZ, maxZ: interior.maxZ };
  const loadingArea: PlanRect = { minX: storage.maxX + partition, maxX: interior.maxX, minZ: interior.minZ, maxZ: interior.maxZ };
  const dockOpenings: DockOpening[] = dockBank.doors.map((door) => ({
    id: door.id, x: door.position[0] - building.position[0], width: DOCK_HIGH.doorWidth,
  }));
  for (const door of dockOpenings) {
    if (door.x - door.width / 2 < loadingArea.minX + config.loadingArea.dockClearance || door.x + door.width / 2 > loadingArea.maxX) {
      fail(`${door.id} kapısı yükleme alanının dışında (yükleme alanı x ${loadingArea.minX.toFixed(2)} … ${loadingArea.maxX.toFixed(2)}).`);
    }
  }

  // Horizontal corridor across the storage block, open to the loading area at its east end.
  const midZ = (interior.minZ + interior.maxZ) / 2;
  const corridor: PlanRect = {
    minX: interior.minX, maxX: loadingArea.minX,
    minZ: midZ - config.corridor.width / 2, maxZ: midZ + config.corridor.width / 2,
  };
  const midX = (storage.minX + storage.maxX) / 2;

  const sections = config.sections.map((spec): WarehouseSection => {
    const facesCorridor = spec.row === 'north' ? 'south' : 'north';
    if (spec.entranceSide !== facesCorridor) fail(`${spec.name} girişleri ana koridora (${facesCorridor}) bakmalı.`);
    const bounds: PlanRect = {
      minX: spec.column === 'west' ? storage.minX : midX + partition / 2,
      maxX: spec.column === 'west' ? midX - partition / 2 : storage.maxX,
      minZ: spec.row === 'north' ? interior.minZ : corridor.maxZ + partition,
      maxZ: spec.row === 'north' ? corridor.minZ - partition : interior.maxZ,
    };
    const racks = fitRacks(spec, bounds, config);
    const wallZ = spec.row === 'north' ? corridor.minZ : corridor.maxZ;
    return {
      ...spec, bounds, ...racks,
      entrances: placeEntrances(spec, wallZ, racks.aisles, config),
    };
  });

  const { office: o, rackSystem: r, pallet } = config;
  const officeCenterZ = loadingArea.minZ + o.centerShare * (loadingArea.maxZ - loadingArea.minZ);
  const office = {
    minX: interior.maxX - o.width, maxX: interior.maxX,
    minZ: officeCenterZ - o.length / 2, maxZ: officeCenterZ + o.length / 2,
    height: o.height, doorZ: officeCenterZ,
  };
  if (office.minX < loadingArea.minX) fail('çalışma odası yükleme alanına sığmıyor.');

  const ceilingY = height - ceilingGap;
  const topLoad = config.floorY + r.firstLevel + (r.levels - 1) * r.levelPitch + pallet.height + pallet.maxLoadHeight;
  if (topLoad > config.floorY + r.uprightHeight || config.floorY + r.uprightHeight > ceilingY - 0.4) {
    fail(`${r.levels} raf seviyesi ${(ceilingY - config.floorY).toFixed(1)} m iç yüksekliğe sığmıyor.`);
  }

  return { buildingId: building.id, floorY: config.floorY, ceilingY, interior, storage, corridor, loadingArea, office, dockOpenings, sections };
}

const building = DEFAULT_BUILDINGS.find((item) => item.id === WAREHOUSE_CONFIG.buildingId);
const dockBank = DOCK_BANKS.find((item) => item.id === WAREHOUSE_CONFIG.dockBankId);
if (!building || !dockBank) fail(`${WAREHOUSE_CONFIG.buildingId} binası veya ${WAREHOUSE_CONFIG.dockBankId} rampası bulunamadı.`);

export const WAREHOUSE_BUILDING: BuildingEntity = building;
export const WAREHOUSE_LAYOUT: WarehouseLayout = calculateWarehouseLayout(building, dockBank);

/** Building-local plan point to world [x, y, z]. */
export function warehouseWorld([x, z]: readonly [number, number], y = 0): [number, number, number] {
  return [WAREHOUSE_BUILDING.position[0] + x, y, WAREHOUSE_BUILDING.position[2] + z];
}

export const rectCenter = (rect: PlanRect): [number, number] => [(rect.minX + rect.maxX) / 2, (rect.minZ + rect.maxZ) / 2];
