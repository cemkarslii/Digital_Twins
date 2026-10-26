import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useFactoryStore } from '../../store/useFactoryStore';
import { useSeedWarehouseRecords } from '../../hooks/useSeedWarehouseRecords';
import { COLD_ROOM, filledCrateCount, SEED_ROOM_LAYOUT } from '../../data/seedWarehouses';
import type { BuildingEntity } from '../../types/factory';
import type { SeedWarehouseRecord } from '../../types/seedStorage';
import { CLEARANCE, Instanced, type InstanceItem } from './interiorParts';
import { stableHash as hash } from '../../utils/stableHash';

type Item = InstanceItem;

const FLOOR_Y = COLD_ROOM.floorY + CLEARANCE; // plinth top sits just under floorY

const WOOD = ['#a9814f', '#b38b58', '#9d7647', '#b99560'];
const POTATO = ['#c9a56c', '#bf9a5f', '#d1ae76', '#b8935a'];

/** Static cold-room shell shared by every depot (same footprint). */
function useRoomShell(width: number, depth: number, height: number) {
  return useMemo(() => {
    const c = COLD_ROOM, { rackCentersX, frameZ, rackLength } = SEED_ROOM_LAYOUT;
    const innerW = width - 2 * c.wallPanel, innerD = depth - 2 * c.wallPanel;
    const panelH = height - c.floorY - 0.15;
    const panelY = c.floorY + panelH / 2;
    const half = c.flue / 2;

    // Insulated panels fill the wall band but stop short of the building shell, so no face is
    // shared with the outer walls; their room-side faces stay on the layout's inner bounds.
    const panel = c.wallPanel - CLEARANCE;
    const panelZ = depth / 2 - CLEARANCE - panel / 2;
    const panelX = width / 2 - CLEARANCE - panel / 2;
    const walls: Item[] = [
      { position: [0, panelY, -panelZ], scale: [width - 2 * CLEARANCE, panelH, panel] },
      { position: [0, panelY, panelZ], scale: [width - 2 * CLEARANCE, panelH, panel] },
      { position: [-panelX, panelY, 0], scale: [panel, panelH, innerD] },
      { position: [panelX, panelY, 0], scale: [panel, panelH, innerD] },
    ];

    const uprights: Item[] = [], beams: Item[] = [], safetyLines: Item[] = [], leds: Item[] = [];
    for (const x of rackCentersX) {
      for (const side of [-1, 1]) {
        for (const faceX of [x + side * (half + 0.04), x + side * (half + c.rackDepth - 0.04)]) {
          for (const z of frameZ) uprights.push({ position: [faceX, c.floorY + c.uprightHeight / 2, z], scale: [0.09, c.uprightHeight, 0.09] });
          for (const level of c.levels) beams.push({ position: [faceX, c.floorY + level - 0.07, 0], scale: [0.07, 0.13, rackLength] });
        }
        // Floor safety line along each rack front.
        safetyLines.push({ position: [x + side * (half + c.rackDepth + 0.3), FLOOR_Y + CLEARANCE / 2, 0], scale: [0.09, CLEARANCE / 2, rackLength + 0.6] });
      }
    }
    // LED strips over aisles: one each side of every double rack.
    const aisleOffset = half + c.rackDepth + c.aisle / 2;
    const aisleX = [...new Set(rackCentersX.flatMap((x) => [x - aisleOffset, x + aisleOffset]).map((x) => +x.toFixed(3)))];
    for (const x of aisleX) leds.push({ position: [x, height - 0.35, 0], scale: [0.14, 0.05, innerD - 1.5] });

    // Unit coolers on the north wall, three fans each.
    const coolers: Item[] = [], fans: Item[] = [];
    const coolerZ = -innerD / 2 + 0.5;
    for (const x of [-innerW / 3, 0, innerW / 3]) {
      coolers.push({ position: [x, height - 1.3, coolerZ], scale: [3.4, 0.95, 0.9] });
      for (const offset of [-1.05, 0, 1.05]) {
        fans.push({ position: [x + offset, height - 1.3, coolerZ + 0.45 + CLEARANCE], scale: [0.78, CLEARANCE, 0.78], rotation: [Math.PI / 2, 0, 0] });
      }
    }
    return { walls, uprights, beams, safetyLines, leds, coolers, fans, floor: [innerW, innerD] as [number, number] };
  }, [width, depth, height]);
}

/** Crates and potato heaps for the occupied slots; empty rack slots stay visible. */
function useStock(buildingId: string, occupancyPct: number) {
  return useMemo(() => {
    const c = COLD_ROOM, { slots } = SEED_ROOM_LAYOUT;
    const count = filledCrateCount(occupancyPct);
    const ranked = slots.map((slot, index) => ({ slot, index, rank: hash(buildingId, index) }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, count);
    const crates: Item[] = [], heaps: Item[] = [];
    for (const { slot: [x, y, z], index } of ranked) {
      const r = hash(buildingId, index + 7919);
      crates.push({ position: [x, y + c.crate.height / 2, z], scale: [c.crate.width, c.crate.height, c.crate.length], color: WOOD[Math.floor(r * WOOD.length)] });
      heaps.push({
        position: [x, y + c.crate.height + 0.02, z],
        scale: [c.crate.width * 0.44, 0.13 + r * 0.06, c.crate.length * 0.46],
        rotation: [0, r * Math.PI, 0],
        color: POTATO[Math.floor(r * 97) % POTATO.length],
      });
    }
    return { crates, heaps };
  }, [buildingId, occupancyPct]);
}

const STATUS_LABEL: Record<SeedWarehouseRecord['status'], string> = {
  normal: 'Normal',
  temperature_alert: 'Sıcaklık uyarısı',
  maintenance: 'Bakımda',
};

function ColdRoom({ building, record, selected, onSelect }: {
  building: BuildingEntity; record?: SeedWarehouseRecord; selected: boolean; onSelect: () => void;
}) {
  const { width, depth, height } = building.dimensions;
  const shell = useRoomShell(width, depth, height);
  const stock = useStock(building.id, record?.occupancyPct ?? 0);
  const [x, , z] = building.position;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}>
        <planeGeometry args={shell.floor} />
        <meshStandardMaterial color="#c3ccd0" roughness={0.38} metalness={0.05} />
      </mesh>
      <Instanced items={shell.walls} color="#eef2f2" roughness={0.55} />
      <Instanced items={shell.uprights} color="#2c5d8c" metalness={0.4} roughness={0.5} castShadow />
      <Instanced items={shell.beams} color="#e2772e" metalness={0.3} roughness={0.5} />
      <Instanced items={shell.safetyLines} color="#e2c23a" roughness={0.7} />
      <Instanced items={shell.leds} color="#f7fbff" emissive="#eaf4ff" />
      <Instanced items={shell.coolers} color="#e6ebee" metalness={0.3} roughness={0.45} />
      <Instanced items={shell.fans} shape="cylinder" color="#2b3236" roughness={0.6} />
      <Instanced items={stock.crates} color={WOOD[0]} roughness={0.9} castShadow />
      <Instanced items={stock.heaps} shape="heap" color={POTATO[0]} roughness={1} />

      {record && (
        <Html center position={[0, height + 3.2, 0]} zIndexRange={[11, 0]}>
          <button
            className={`seed-depot-label seed-depot-label-${record.status}`}
            aria-pressed={selected}
            onClick={onSelect}
            title={`${building.code} · ${STATUS_LABEL[record.status]}`}
          >
            <strong>{building.code}</strong>
            <span>{record.temperatureC.toLocaleString('tr-TR', { minimumFractionDigits: 1 })} °C</span>
            <small>%{record.occupancyPct}</small>
          </button>
        </Html>
      )}
    </group>
  );
}

/** Cold-room interiors of the seed depots, mounted only while seed storage mode is open. */
export function SeedStorageInteriors() {
  const open = useFactoryStore((s) => s.seedStorageOpen);
  const buildings = useFactoryStore((s) => s.buildings);
  const selectedId = useFactoryStore((s) => s.selectedSeedWarehouseId);
  const openSeedStorage = useFactoryStore((s) => s.openSeedStorage);
  const state = useSeedWarehouseRecords(open);
  const depots = useMemo(() => buildings.filter((b) => b.visible && b.category === 'agri_storage'), [buildings]);
  if (!open) return null;

  return (
    <group>
      {depots.map((building) => (
        <ColdRoom
          key={building.id}
          building={building}
          record={state.phase === 'ready' ? state.byBuilding.get(building.id) : undefined}
          selected={building.id === selectedId}
          onSelect={() => openSeedStorage(building.id)}
        />
      ))}
    </group>
  );
}
