import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFactoryStore } from '../../store/useFactoryStore';
import type { RoadEntity } from '../../types/factory';
import { createGroundTexture } from './groundMaterials';
import { createRoadDashes, createRoadRibbon } from './roadGeometry';

type RoadTextures = Record<RoadEntity['surfaceType'], THREE.Texture>;
function RoadSurface({ road, textures }: { road: RoadEntity; textures: RoadTextures }) {
  const geometry = useMemo(() => {
    const half = road.width / 2;
    return {
      pavement: createRoadRibbon(road.points, half, -half, 0.11),
      shoulders: createRoadRibbon(road.points, half + 0.34, -half - 0.34, 0.039),
      leftEdge: createRoadRibbon(road.points, half - 0.35, half - 0.49, 0.14),
      rightEdge: createRoadRibbon(road.points, -half + 0.49, -half + 0.35, 0.14),
      dashes: createRoadDashes(road.points, 0.145),
    };
  }, [road.points, road.width]);
  useEffect(() => () => Object.values(geometry).forEach((item) => item.dispose()), [geometry]);
  if (!road.visible || road.points.length < 2) return null;
  const color = road.surfaceType === 'concrete' ? '#b6b5aa' : road.surfaceType === 'gravel' ? '#a99f89' : '#626460';
  return (
    <group>
      <mesh geometry={geometry.shoulders} receiveShadow>
        <meshStandardMaterial color="#c9c7b9" map={textures.concrete} roughness={0.96} />
      </mesh>
      <mesh geometry={geometry.pavement} receiveShadow>
        <meshStandardMaterial color={color} map={textures[road.surfaceType]} roughness={0.96} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      {road.surfaceType === 'asphalt' && <group>
        <mesh geometry={geometry.leftEdge}><meshStandardMaterial color="#dddcc9" roughness={1} /></mesh>
        <mesh geometry={geometry.rightEdge}><meshStandardMaterial color="#dddcc9" roughness={1} /></mesh>
        {road.width >= 5.8 && <mesh geometry={geometry.dashes}><meshStandardMaterial color="#e2dfcf" roughness={1} /></mesh>}
      </group>}
    </group>
  );
}

export function CampusRoads() {
  const roads = useFactoryStore((s) => s.roads);
  const textures = useMemo(() => ({ asphalt: createGroundTexture('asphalt'), concrete: createGroundTexture('concrete'), gravel: createGroundTexture('gravel') }), []);
  useEffect(() => () => Object.values(textures).forEach((texture) => texture.dispose()), [textures]);
  return <group>{roads.map((road) => <RoadSurface key={road.id} road={road} textures={textures} />)}</group>;
}
