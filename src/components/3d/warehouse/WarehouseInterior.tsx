import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useFactoryStore } from '../../../store/useFactoryStore';
import { rectCenter, WAREHOUSE_BUILDING, WAREHOUSE_LAYOUT } from '../../../data/warehouseLayout';
import { FILL_BAND_LABEL, useSectionFill, useWarehouseStock } from '../../../store/useWarehouseStock';
import { Instanced } from '../interiorParts';
import { sectionBand } from './warehouseGeometry';
import { stockHex } from './stockTint';
import type { WarehouseLayout, WarehouseSection } from '../../../types/warehouse';
import { WarehouseShell } from './WarehouseShell';
import { WarehouseRacks } from './WarehouseRacks';
import { WarehouseLoadingArea } from './WarehouseLoadingArea';
import { WarehouseOffice } from './WarehouseOffice';

const LID_THICKNESS = 0.12;

/** Live pallet fill of a section, over the lanes whose state is known. */
function SectionFill({ sectionId }: { sectionId: string }) {
  const stock = useWarehouseStock((s) => s.sections.get(sectionId));
  if (!stock?.capacity) return <small>veri bekleniyor</small>;
  return <small>%{Math.round(stock.pallets / stock.capacity * 100)} dolu</small>;
}

/** Section button above the walls, its swatch in the section's fill colour. */
function SectionLabel({ section, position, selected, onToggle }: {
  section: WarehouseSection; position: [number, number, number]; selected: boolean; onToggle: () => void;
}) {
  const { band, color, stale } = useSectionFill(section.id);
  return (
    <Html center position={position} zIndexRange={[11, 0]}>
      <button
        className="seed-depot-label warehouse-label"
        style={{ '--section-color': stockHex(color, stale) } as React.CSSProperties}
        aria-pressed={selected}
        onClick={onToggle}
        title={`${section.name}: ${FILL_BAND_LABEL[band].toLowerCase()} · ${selected ? 'bölümü kapat' : 'bölümü aç'}`}
      >
        <strong>{section.name}</strong>
        <SectionFill sectionId={section.id} />
      </button>
    </Html>
  );
}

/** Closed section: a roof in the section's fill colour on top of its walls; clicking it opens the section. */
function SectionLid({ section, y }: { section: WarehouseSection; y: number }) {
  const toggle = useFactoryStore((s) => s.toggleWarehouseSection);
  const { color, stale } = useSectionFill(section.id);
  const { minX, maxX, minZ, maxZ } = section.bounds;
  const onClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 4) return;
    event.stopPropagation();
    toggle(section.id);
  };
  return (
    <mesh position={[(minX + maxX) / 2, y + LID_THICKNESS / 2, (minZ + maxZ) / 2]} receiveShadow
      onClick={onClick} onDoubleClick={(event) => event.stopPropagation()}>
      <boxGeometry args={[maxX - minX, LID_THICKNESS, maxZ - minZ]} />
      <meshStandardMaterial color={stockHex(color, stale)} roughness={0.65} metalness={0.1} />
    </mesh>
  );
}

/** Painted band inside every section's walls, in its fill colour, so an open section still shows it. */
function SectionBand({ section, floorY }: { section: WarehouseSection; floorY: number }) {
  const items = useMemo(() => sectionBand(section, floorY), [section, floorY]);
  const { color, stale } = useSectionFill(section.id);
  return <Instanced items={items} color={stockHex(color, stale)} roughness={0.7} />;
}

/** Section buttons above the walls; zone and entrance tags are plain text and ignore the pointer. */
function WarehouseLabels({ layout }: { layout: WarehouseLayout }) {
  const selectedId = useFactoryStore((s) => s.selectedWarehouseSectionId);
  const toggle = useFactoryStore((s) => s.toggleWarehouseSection);
  const { floorY: F, ceilingY, corridor, loadingArea, office } = layout;
  const [corridorX, corridorZ] = rectCenter(corridor);
  const [loadingX] = rectCenter(loadingArea);

  return (
    <group>
      {layout.sections.map((section) => {
        const [x, z] = rectCenter(section.bounds);
        return (
          <group key={section.id}>
            <SectionLabel section={section} position={[x, ceilingY + 2, z]} selected={section.id === selectedId} onToggle={() => toggle(section.id)} />
            {section.entrances.map((entrance) => (
              // Inside the section, over the cross aisle, so the corridor itself stays clear.
              <Html key={entrance.id} center zIndexRange={[10, 0]}
                position={[entrance.center[0], F + 1, entrance.center[1] + (entrance.side === 'south' ? -1 : 1) * 2.2]}>
                <span className="warehouse-tag warehouse-tag-small" title={`${section.name} · giriş ${entrance.number}`}>GİRİŞ {entrance.number}</span>
              </Html>
            ))}
          </group>
        );
      })}
      <Html center position={[corridorX, F + 2.5, corridorZ]} zIndexRange={[10, 0]}>
        <span className="warehouse-tag">← ANA KORİDOR →</span>
      </Html>
      <Html center position={[loadingX, F + 3, loadingArea.minZ + 30]} zIndexRange={[10, 0]}>
        <span className="warehouse-tag">YÜKLEME NOKTASI</span>
      </Html>
      <Html center position={[(office.minX + office.maxX) / 2, F + office.height + 1.2, (office.minZ + office.maxZ) / 2]} zIndexRange={[10, 0]}>
        <span className="warehouse-tag warehouse-tag-office">ÇALIŞMA ODASI</span>
      </Html>
    </group>
  );
}

/**
 * GES-02 warehouse interior, mounted only while warehouse mode is open (roof turns see-through).
 * Every section starts closed under its coloured lid; only the selected one is opened and has its
 * racks built, so the scene never carries more than one section's racks.
 */
export function WarehouseInterior() {
  const open = useFactoryStore((s) => s.warehouseOpen);
  const selectedId = useFactoryStore((s) => s.selectedWarehouseSectionId);
  if (!open) return null;
  const [x, , z] = WAREHOUSE_BUILDING.position;
  const { sections, ceilingY, floorY } = WAREHOUSE_LAYOUT;
  const selected = sections.find((section) => section.id === selectedId);
  return (
    <group position={[x, 0, z]}>
      <WarehouseShell layout={WAREHOUSE_LAYOUT} />
      {sections.map((section) => <SectionBand key={section.id} section={section} floorY={floorY} />)}
      {sections.map((section) => section === selected
        ? <WarehouseRacks key={section.id} section={section} floorY={floorY} />
        : <SectionLid key={section.id} section={section} y={ceilingY} />)}
      <WarehouseLoadingArea layout={WAREHOUSE_LAYOUT} />
      <WarehouseOffice layout={WAREHOUSE_LAYOUT} />
      <WarehouseLabels layout={WAREHOUSE_LAYOUT} />
    </group>
  );
}
