import type { PlanRect, WarehouseLayout, WarehouseSection } from '../../../types/warehouse';
import { WAREHOUSE_CONFIG } from '../../../data/warehouseConfig';
import { rackLength } from '../../../data/warehouseLayout';
import { DOCK_HIGH } from '../../../data/dockBanks';
import { CLEARANCE, type InstanceItem } from '../interiorParts';
import { stableHash } from '../../../utils/stableHash';

/**
 * Instance lists for the GES-02 warehouse interior, building-local. Pure functions of the layout,
 * so the same configuration always produces the same scene.
 */
type Item = InstanceItem;
type Vec3 = [number, number, number];

const R = WAREHOUSE_CONFIG.rackSystem;
const P = WAREHOUSE_CONFIG.pallet;
/** Floor paint: a thin box kept clear of the slab top (see CLEARANCE). */
const PAINT = 0.02;
/** Thickness of a shelf beam across the row; rack labels sit on its aisle face. */
export const BEAM_DEPTH = 0.05;

const box = (rect: PlanRect, y0: number, y1: number, color?: string): Item => ({
  position: [(rect.minX + rect.maxX) / 2, (y0 + y1) / 2, (rect.minZ + rect.maxZ) / 2],
  scale: [rect.maxX - rect.minX, y1 - y0, rect.maxZ - rect.minZ],
  color,
});

/** Axis-aligned painted line between two plan points. */
function paint(floorY: number, x0: number, z0: number, x1: number, z1: number, width: number, color?: string): Item {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  return {
    position: [(x0 + x1) / 2, floorY + CLEARANCE / 2, (z0 + z1) / 2],
    scale: alongX ? [Math.abs(x1 - x0), PAINT, width] : [width, PAINT, Math.abs(z1 - z0)],
    color,
  };
}

/** Painted rectangle outline. */
const outline = (floorY: number, r: PlanRect, width: number, color?: string): Item[] => [
  paint(floorY, r.minX, r.minZ + width / 2, r.maxX, r.minZ + width / 2, width, color),
  paint(floorY, r.minX, r.maxZ - width / 2, r.maxX, r.maxZ - width / 2, width, color),
  paint(floorY, r.minX + width / 2, r.minZ + width, r.minX + width / 2, r.maxZ - width, width, color),
  paint(floorY, r.maxX - width / 2, r.minZ + width, r.maxX - width / 2, r.maxZ - width, width, color),
];

/** Line along X broken around the given openings. */
function brokenLine(floorY: number, from: number, to: number, z: number, width: number, gaps: { at: number; width: number }[], color?: string) {
  const items: Item[] = [];
  let cursor = from;
  for (const gap of [...gaps].sort((a, b) => a.at - b.at)) {
    const a = gap.at - gap.width / 2;
    if (a > cursor) items.push(paint(floorY, cursor, z, a, z, width, color));
    cursor = Math.max(cursor, gap.at + gap.width / 2);
  }
  if (to > cursor) items.push(paint(floorY, cursor, z, to, z, width, color));
  return items;
}

interface Opening { at: number; width: number; height: number }

/**
 * Wall running along X (`along: 'x'`, thickness range in Z) or along Z, with real openings:
 * full-height segments between them and a lintel above each.
 */
function wall(along: 'x' | 'z', thickness: [number, number], from: number, to: number, y0: number, y1: number, openings: Opening[] = []): Item[] {
  const rect = (a: number, b: number): PlanRect => along === 'x'
    ? { minX: a, maxX: b, minZ: thickness[0], maxZ: thickness[1] }
    : { minX: thickness[0], maxX: thickness[1], minZ: a, maxZ: b };
  const items: Item[] = [];
  let cursor = from;
  for (const o of [...openings].sort((a, b) => a.at - b.at)) {
    const a = o.at - o.width / 2, b = o.at + o.width / 2;
    if (a > cursor) items.push(box(rect(cursor, a), y0, y1));
    if (y0 + o.height < y1) items.push(box(rect(a, b), y0 + o.height, y1));
    cursor = b;
  }
  if (to > cursor) items.push(box(rect(cursor, to), y0, y1));
  return items;
}

const FLOOR_COLORS = { section: '#c4c8c3', corridor: '#a6a9a2', loading: '#b5b7ae' };
const YELLOW = '#e0b52a';

export function shellParts(layout: WarehouseLayout) {
  const { floorY: F, ceilingY: C, interior: I, storage, corridor, loadingArea, sections } = layout;
  const p = WAREHOUSE_CONFIG.shell.partition;
  const midX = (storage.minX + storage.maxX) / 2;
  const midZ = (corridor.minZ + corridor.maxZ) / 2;
  const north = sections.filter((s) => s.row === 'north'), south = sections.filter((s) => s.row === 'south');

  // Slab below the zone finishes hides every seam under walls; finishes sit on top of it.
  const slab = [box(I, 0.5, F - CLEARANCE, '#9c9e97')];
  const floors = [
    ...sections.map((s) => box(s.bounds, F - 0.04, F, FLOOR_COLORS.section)),
    box({ ...corridor, maxX: loadingArea.minX }, F - 0.04, F, FLOOR_COLORS.corridor),
    box(loadingArea, F - 0.04, F, FLOOR_COLORS.loading),
  ];

  // Lining stays CLEARANCE inside the building shell so no face is shared with the outer walls.
  const outerX = I.maxX + WAREHOUSE_CONFIG.shell.lining - CLEARANCE, outerZ = I.maxZ + WAREHOUSE_CONFIG.shell.lining - CLEARANCE;
  const dockOpenings = layout.dockOpenings.map((d) => ({ at: d.x, width: d.width + 0.2, height: DOCK_HIGH.doorHeight }));
  const lining = [
    ...wall('x', [-outerZ, I.minZ], -outerX, outerX, F - CLEARANCE, C, dockOpenings),
    ...wall('x', [I.maxZ, outerZ], -outerX, outerX, F - CLEARANCE, C),
    ...wall('z', [-outerX, I.minX], I.minZ, I.maxZ, F - CLEARANCE, C),
    ...wall('z', [I.maxX, outerX], I.minZ, I.maxZ, F - CLEARANCE, C),
  ];

  const openingsOf = (list: typeof sections) => list.flatMap((s) => s.entrances.map((e) => ({ at: e.center[0], width: e.width, height: e.height })));
  const partitions = [
    // Corridor walls carry the eight entrances.
    ...wall('x', [corridor.minZ - p, corridor.minZ], I.minX, storage.maxX, F, C, openingsOf(north)),
    ...wall('x', [corridor.maxZ, corridor.maxZ + p], I.minX, storage.maxX, F, C, openingsOf(south)),
    // Single walls between the adjacent sections; no corridor between them.
    box({ minX: midX - p / 2, maxX: midX + p / 2, minZ: I.minZ, maxZ: corridor.minZ - p }, F, C),
    box({ minX: midX - p / 2, maxX: midX + p / 2, minZ: corridor.maxZ + p, maxZ: I.maxZ }, F, C),
    // Storage block against the loading area; the corridor stays open to it.
    box({ minX: storage.maxX, maxX: loadingArea.minX, minZ: I.minZ, maxZ: corridor.minZ }, F, C),
    box({ minX: storage.maxX, maxX: loadingArea.minX, minZ: corridor.maxZ, maxZ: I.maxZ }, F, C),
  ];

  const frames: Item[] = [], housings: Item[] = [], bollards: Item[] = [], yellowPaint: Item[] = [], whitePaint: Item[] = [];
  for (const section of sections) for (const e of section.entrances) {
    const [x, zFace] = e.center;
    const toCorridor = e.side === 'south' ? 1 : -1;
    const wallZ = zFace - toCorridor * p / 2;
    // Jambs and header stand 2 cm proud of the opening and 6 cm proud of both wall faces.
    for (const side of [-1, 1]) {
      frames.push({ position: [x + side * (e.width / 2 + 0.07), F + (e.height + 0.16) / 2, wallZ], scale: [0.18, e.height + 0.16, p + 0.12] });
      bollards.push({ position: [x + side * (e.width / 2 + 0.55), F + 0.55, zFace + toCorridor * 0.55], scale: [0.24, 1.1, 0.24] });
    }
    frames.push({ position: [x, F + e.height + 0.07, wallZ], scale: [e.width + 0.32, 0.18, p + 0.12] });
    // Coiled high-speed door above the opening, on the corridor side.
    housings.push({ position: [x, F + e.height + 0.45, zFace + toCorridor * 0.3], scale: [e.width + 0.3, 0.5, 0.45] });
    yellowPaint.push(paint(F, x - e.width / 2, zFace + toCorridor * 0.35, x + e.width / 2, zFace + toCorridor * 0.35, 0.25));
  }

  // Corridor: edge lines broken at the entrances, dashed centre line, direction chevrons (keep right).
  const gapsOf = (list: typeof sections) => list.flatMap((s) => s.entrances.map((e) => ({ at: e.center[0], width: e.width + 1.4 })));
  yellowPaint.push(
    ...brokenLine(F, I.minX + 0.4, loadingArea.minX, corridor.minZ + 0.45, 0.12, gapsOf(north)),
    ...brokenLine(F, I.minX + 0.4, loadingArea.minX, corridor.maxZ - 0.45, 0.12, gapsOf(south)),
  );
  for (let x = I.minX + 2; x + 2 < loadingArea.minX; x += 4) whitePaint.push(paint(F, x, midZ, x + 2, midZ, 0.12));
  const chevron = (x: number, z: number, dir: 1 | -1) => [-1, 1].map((side): Item => {
    const arm = 1.1, dx = -dir * Math.SQRT1_2, dz = side * Math.SQRT1_2;
    return {
      position: [x + dx * arm / 2, F + CLEARANCE / 2, z + dz * arm / 2],
      scale: [arm, PAINT, 0.16],
      rotation: [0, Math.atan2(-dz, dx), 0],
    };
  });
  for (let x = I.minX + 6; x < loadingArea.minX - 4; x += 14) {
    whitePaint.push(...chevron(x + 0.7, midZ - 2, -1), ...chevron(x, midZ - 2, -1));
    whitePaint.push(...chevron(x + 7, midZ + 2, 1), ...chevron(x + 7.7, midZ + 2, 1));
  }


  // Ceiling LED lines over aisles, cross aisles, corridor and loading area.
  const lightY = C - 0.35;
  const lights: Item[] = [];
  const length = rackLength();
  for (const s of sections) {
    for (const aisle of s.aisles) lights.push({ position: [aisle.centerX, lightY, (aisle.minZ + aisle.maxZ) / 2], scale: [0.16, 0.06, length - 1] });
    lights.push({ position: [(s.bounds.minX + s.bounds.maxX) / 2, lightY, (s.crossAisle.minZ + s.crossAisle.maxZ) / 2], scale: [s.bounds.maxX - s.bounds.minX - 2, 0.06, 0.16] });
  }
  for (const dz of [-2, 2]) lights.push({ position: [(I.minX + loadingArea.minX) / 2, lightY, midZ + dz], scale: [loadingArea.minX - I.minX - 2, 0.06, 0.16] });
  const loadingW = loadingArea.maxX - loadingArea.minX;
  for (const share of [0.2, 0.5, 0.8]) lights.push({ position: [loadingArea.minX + loadingW * share, lightY, (I.minZ + I.maxZ) / 2], scale: [0.16, 0.06, I.maxZ - I.minZ - 6] });

  // Connection door to the production hall at the corridor's west end.
  const westDoor = box({ minX: I.minX, maxX: I.minX + 0.12, minZ: midZ - 2.2, maxZ: midZ + 2.2 }, F, F + 4.4);

  return { slab, floors, lining, partitions, frames, housings, bollards, yellowPaint, whitePaint, lights, westDoor };
}

/** Painted band just inside a section's walls; coloured by the section's fill. */
export const sectionBand = (section: WarehouseSection, floorY: number) => outline(floorY, {
  minX: section.bounds.minX + 0.1, maxX: section.bounds.maxX - 0.1, minZ: section.bounds.minZ + 0.1, maxZ: section.bounds.maxZ - 0.1,
}, 0.22);

/**
 * Contents of one open section: shared uprights and beams across each block (no gap between rows),
 * frame bracing per row, end guards at the cross aisle, safety lines along the two aisles and a
 * forklift in the first aisle. Built only for the section being inspected.
 */
export function sectionRackParts(section: WarehouseSection, floorY: number) {
  const F = floorY;
  const uprights: Item[] = [], beams: Item[] = [], bracing: Item[] = [], guards: Item[] = [], lines: Item[] = [];
  const forklift: ForkliftParts = { body: [], dark: [], forks: [], wheels: [] };
  const H = R.uprightHeight;
  const length = rackLength();
  const braceRise = (H - 0.5) / R.levels;

  const { startZ, stepZ } = section.rows[0];
  const frameZ = Array.from({ length: R.positionsPerLevel + 1 }, (_, k) => startZ + stepZ * k * R.positionPitch);
  for (const block of section.blocks) {
    const midZ = (block.minZ + block.maxZ) / 2;
    for (const x of block.uprightX) {
      for (const z of frameZ) uprights.push({ position: [x, F + H / 2, z], scale: [R.upright, H, R.upright] });
      for (let level = 0; level < R.levels; level++) {
        beams.push({ position: [x, F + R.firstLevel + level * R.levelPitch - R.beamHeight / 2, midZ], scale: [BEAM_DEPTH, R.beamHeight, length] });
      }
    }
    // Zig-zag diagonals in every row's frame, between the two upright lines it shares with its neighbours.
    for (let i = 0; i < block.uprightX.length - 1; i++) {
      const xa = block.uprightX[i], xb = block.uprightX[i + 1];
      for (const z of frameZ) for (let k = 0; k < R.levels; k++) {
        const dx = (k % 2 ? xa - xb : xb - xa);
        bracing.push({
          position: [(xa + xb) / 2, F + 0.25 + (k + 0.5) * braceRise, z],
          scale: [0.035, Math.hypot(dx, braceRise), 0.035],
          rotation: [0, 0, Math.atan2(-dx, braceRise)],
        });
      }
    }
    // Yellow end guard at the cross-aisle end, where forklifts turn into the aisle.
    const guardZ = section.row === 'north' ? block.maxZ + 0.12 : block.minZ - 0.12;
    guards.push({ position: [(block.minX + block.maxX) / 2, F + 0.225, guardZ], scale: [block.maxX - block.minX + 0.1, 0.45, 0.1] });
  }
  for (const aisle of section.aisles) for (const x of [aisle.minX + 0.3, aisle.maxX - 0.3]) {
    lines.push(paint(F, x, aisle.minZ, x, aisle.maxZ, 0.1));
  }
  const first = section.blocks[0];
  addForklift(forklift, [section.aisles[0].centerX, F, (first.minZ + first.maxZ) / 2 + (section.row === 'north' ? 8 : -8)], section.row === 'north' ? 0 : Math.PI);
  return { uprights, beams, bracing, guards, lines, forklift };
}

const CARTON = ['#b98d5a', '#c39a66', '#a97f4f', '#caa673', '#b48a57'];

/** Pallet and load boxes for one seat; `seat` is the pallet centre on its beam top. */
function palletAt([x, y, z]: Vec3, key: string, alongX: boolean, pallets: Item[], loads: Item[], maxLoad: number = P.maxLoadHeight) {
  const r = stableHash(key, 1);
  const h = 0.7 + r * (maxLoad - 0.7);
  // 6 cm short of full length so pallets in neighbouring rows (1.2 m pitch) never share a face.
  const length = P.length - CLEARANCE;
  pallets.push({ position: [x, y + P.height / 2, z], scale: alongX ? [length, P.height, P.width] : [P.width, P.height, length] });
  const color = r > 0.93 ? '#2f5f9e' : r > 0.8 ? '#dfe3e2' : CARTON[Math.floor(r * 97) % CARTON.length];
  loads.push({
    position: [x, y + P.height + h / 2, z],
    scale: alongX ? [P.length - 0.08, h, P.width - 0.04] : [P.width - 0.04, h, P.length - 0.08],
    color,
  });
}

type ForkliftParts = { body: Item[]; dark: Item[]; forks: Item[]; wheels: Item[] };

/** Counterbalance forklift from boxes and four wheels; +Z local is the fork side. */
function addForklift(parts: ForkliftParts, [ox, oy, oz]: Vec3, yaw: number) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const place = (list: Item[], [x, y, z]: Vec3, scale: Vec3, roll = 0) => list.push({
    position: [ox + x * c + z * s, oy + y, oz - x * s + z * c], scale, rotation: [0, yaw, roll],
  });
  place(parts.body, [0, 0.75, -0.2], [1.1, 0.9, 1.9]);
  place(parts.dark, [0, 0.62, -1.1], [1.12, 0.62, 0.36]);
  place(parts.dark, [0, 2.1, -0.15], [1, 0.06, 1.1]);
  for (const x of [-0.47, 0.47]) for (const z of [0.35, -0.65]) place(parts.dark, [x, 1.5, z], [0.06, 1.2, 0.06]);
  for (const x of [-0.3, 0.3]) place(parts.dark, [x, 1.25, 0.85], [0.1, 2.3, 0.12]);
  place(parts.dark, [0, 2.35, 0.85], [0.7, 0.1, 0.1]);
  place(parts.dark, [0, 0.45, 0.95], [0.9, 0.5, 0.06]);
  for (const x of [-0.25, 0.25]) place(parts.forks, [x, 0.08, 1.5], [0.12, 0.05, 1.1]);
  for (const x of [-0.5, 0.5]) {
    place(parts.wheels, [x, 0.3, 0.55], [0.6, 0.25, 0.6], Math.PI / 2);
    place(parts.wheels, [x, 0.25, -0.75], [0.5, 0.22, 0.5], Math.PI / 2);
  }
}

/**
 * Loading area along the east wall: dock levelers and a staging lane behind every R3 door, a
 * pedestrian crossing to the office, forklift charging bays and block-stacked floor storage.
 */
export function loadingParts(layout: WarehouseLayout) {
  const { floorY: F, interior: I, loadingArea: L, office, corridor } = layout;
  const yellow: Item[] = [], white: Item[] = [], steel: Item[] = [], chargers: Item[] = [];
  const pallets: Item[] = [], loads: Item[] = [];
  const forklift: ForkliftParts = { body: [], dark: [], forks: [], wheels: [] };

  // Dock leveler plates inside each R3 door, then a painted staging lane per door.
  for (const d of layout.dockOpenings) {
    steel.push(box({ minX: d.x - 1.2, maxX: d.x + 1.2, minZ: I.minZ, maxZ: I.minZ + 2.6 }, F + CLEARANCE / 4, F + CLEARANCE / 2));
    for (const side of [-1, 1]) yellow.push(paint(F, d.x + side * 1.35, I.minZ, d.x + side * 1.35, I.minZ + 2.6, 0.15));
    const lane: PlanRect = { minX: d.x - 1.8, maxX: d.x + 1.8, minZ: I.minZ + 3.4, maxZ: I.minZ + 17.4 };
    white.push(...outline(F, lane, 0.1));
    const staged = Math.floor(stableHash(d.id, 3) * 11);
    for (let i = 0; i < staged; i++) {
      const seat: Vec3 = [d.x + (i % 2 ? 0.7 : -0.7), F, lane.minZ + 1 + Math.floor(i / 2) * 1.45];
      palletAt(seat, `${d.id}-${i}`, false, pallets, loads, 1.4);
    }
  }

  // Loading area edge along the storage wall, open at the corridor mouth.
  const edgeX = L.minX + 0.45;
  yellow.push(paint(F, edgeX, I.minZ + 0.4, edgeX, corridor.minZ - 0.6, 0.12), paint(F, edgeX, corridor.maxZ + 0.6, edgeX, I.maxZ - 0.4, 0.12));

  // Pedestrian crossing from the corridor mouth to the office door, and a keep-clear line around the office.
  for (let x = L.minX + 1.2; x < office.minX - 1.4; x += 0.9) {
    white.push({ position: [x + 0.225, F + CLEARANCE / 2, office.doorZ], scale: [0.45, PAINT, 1.8] });
  }
  const keep = office.minX - 1;
  yellow.push(
    paint(F, keep, office.minZ - 1, keep, office.doorZ - 1.2, 0.12),
    paint(F, keep, office.doorZ + 1.2, keep, office.maxZ + 1, 0.12),
    paint(F, keep, office.minZ - 1, I.maxX, office.minZ - 1, 0.12),
    paint(F, keep, office.maxZ + 1, I.maxX, office.maxZ + 1, 0.12),
  );

  // Forklift charging bays south of the office, chargers on the east wall.
  const bayX = I.maxX - 3.8;
  for (let i = 0; i < 3; i++) {
    const z0 = office.maxZ + 2.5 + i * 3.2;
    yellow.push(...outline(F, { minX: bayX, maxX: I.maxX - 0.3, minZ: z0, maxZ: z0 + 3 }, 0.1));
    chargers.push(box({ minX: I.maxX - 0.4, maxX: I.maxX - CLEARANCE, minZ: z0 + 1.2, maxZ: z0 + 1.8 }, F + 0.4, F + 1.6));
    addForklift(forklift, [bayX + 1.9, F, z0 + 1.5], -Math.PI / 2);
  }

  // Block-stacked floor storage in the southern loading area, clear of the charging bays.
  const BLOCK = { columns: 6, rows: 12, fill: 0.62 };
  const blockZ = corridor.maxZ + 22;
  for (const [block, x0] of [L.minX + 2.5, L.minX + 10.2].entries()) {
    if (x0 + BLOCK.columns + 0.3 > bayX - 0.5) continue;
    white.push(...outline(F, { minX: x0 - 0.3, maxX: x0 + BLOCK.columns + 0.3, minZ: blockZ - 0.3, maxZ: blockZ + BLOCK.rows * 1.4 + 0.3 }, 0.1));
    for (let col = 0; col < BLOCK.columns; col++) for (let row = 0; row < BLOCK.rows; row++) {
      const key = `bulk-${block}-${col}-${row}`;
      if (stableHash(key, 0) > BLOCK.fill) continue;
      palletAt([x0 + 0.5 + col, F, blockZ + 0.7 + row * 1.4], key, false, pallets, loads, 1.35);
    }
  }

  // Trucks never enter; forklifts move pallets between docks, corridor and racks.
  addForklift(forklift, [layout.dockOpenings[Math.min(1, layout.dockOpenings.length - 1)].x, F, I.minZ + 21], Math.PI);
  addForklift(forklift, [(I.minX + L.minX) / 2, F, (corridor.minZ + corridor.maxZ) / 2 + 2], Math.PI / 2);

  return { yellow, white, steel, chargers, pallets, loads, forklift };
}
