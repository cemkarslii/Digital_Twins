import { useMemo } from 'react';
import type { WarehouseLayout } from '../../../types/warehouse';
import { Instanced } from '../interiorParts';
import { loadingParts } from './warehouseGeometry';

/** Loading area behind the R3 doors: levelers, staging lanes, block storage, walkways and forklifts. */
export function WarehouseLoadingArea({ layout }: { layout: WarehouseLayout }) {
  const parts = useMemo(() => loadingParts(layout), [layout]);
  return (
    <group>
      <Instanced items={parts.steel} color="#4a504d" metalness={0.5} roughness={0.5} />
      <Instanced items={parts.yellow} color="#e2c23a" roughness={0.7} />
      <Instanced items={parts.white} color="#eef0ea" roughness={0.7} />
      <Instanced items={parts.chargers} color="#5b6461" metalness={0.3} roughness={0.5} />
      <Instanced items={parts.pallets} color="#a9814f" roughness={0.9} />
      <Instanced items={parts.loads} color="#b98d5a" roughness={0.85} castShadow />
      <Instanced items={parts.forklift.body} color="#e8b21f" roughness={0.45} metalness={0.15} castShadow />
      <Instanced items={parts.forklift.dark} color="#2b3134" roughness={0.6} metalness={0.3} />
      <Instanced items={parts.forklift.forks} color="#8c9294" roughness={0.4} metalness={0.6} />
      <Instanced items={parts.forklift.wheels} shape="cylinder" color="#1d2021" roughness={0.9} />
    </group>
  );
}
