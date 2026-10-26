import { useMemo } from 'react';
import type { WarehouseLayout } from '../../../types/warehouse';
import { Instanced } from '../interiorParts';
import { shellParts } from './warehouseGeometry';

/** Floors, walls with their real openings, entrance frames, corridor markings and ceiling lights. */
export function WarehouseShell({ layout }: { layout: WarehouseLayout }) {
  const parts = useMemo(() => shellParts(layout), [layout]);
  return (
    <group>
      <Instanced items={parts.slab} color="#9c9e97" roughness={0.95} />
      <Instanced items={parts.floors} color="#c4c8c3" roughness={0.42} metalness={0.04} />
      <Instanced items={parts.lining} color="#dfe2dc" roughness={0.75} />
      <Instanced items={parts.partitions} color="#e9ebe6" roughness={0.7} castShadow />
      <Instanced items={parts.frames} color="#e0b52a" roughness={0.55} metalness={0.2} />
      <Instanced items={parts.housings} color="#5b6461" roughness={0.6} metalness={0.3} />
      <Instanced items={parts.bollards} shape="cylinder" color="#e0b52a" roughness={0.5} />
      <Instanced items={parts.yellowPaint} color="#e2c23a" roughness={0.7} />
      <Instanced items={parts.whitePaint} color="#eef0ea" roughness={0.7} />
      <Instanced items={parts.lights} color="#f7fbff" emissive="#eaf4ff" />
      <Instanced items={[parts.westDoor]} color="#9aa3a0" roughness={0.6} metalness={0.25} />
    </group>
  );
}
