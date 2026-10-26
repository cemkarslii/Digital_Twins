import { useEffect, useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { LOADING_DOCK as dock, loadingFloorHeight } from '../../data/loadingDock';
import { createGroundPatch, createGroundTexture } from './groundMaterials';

/** A recessed loading court, connected to the boulevard at its level eastern end. */
export function LoadingRamp() {
  const resources = useMemo(() => {
    const stations = [dock.wallX, dock.flatEndX, dock.slopeEndX, dock.entryX];
    const vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
    stations.forEach((x, index) => {
      const y = loadingFloorHeight(x);
      vertices.push(x, y, dock.minZ, x, y, dock.maxZ);
      uvs.push(x / 12, dock.minZ / 12, x / 12, dock.maxZ / 12);
      if (index < stations.length - 1) {
        const v = index * 2;
        indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    });
    const floor = new THREE.BufferGeometry();
    floor.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    floor.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    floor.setIndex(indices);
    floor.computeVertexNormals();

    const section = new THREE.Shape();
    section.moveTo(dock.wallX, 0.16);
    section.lineTo(dock.slopeEndX, 0.16);
    section.lineTo(dock.slopeEndX, dock.streetY - 0.08);
    section.lineTo(dock.flatEndX, dock.floorY - 0.08);
    section.lineTo(dock.wallX, dock.floorY - 0.08);
    section.closePath();
    const retainingWall = new THREE.ExtrudeGeometry(section, { depth: 0.22, bevelEnabled: false });
    const approach = createGroundPatch(
      (dock.approach.minX + dock.approach.maxX) / 2,
      (dock.approach.minZ + dock.approach.maxZ) / 2,
      dock.approach.maxX - dock.approach.minX,
      dock.approach.maxZ - dock.approach.minZ,
      dock.streetY + 0.015,
      [dock.approachRoadCorner],
    );
    return { floor, retainingWall, approach, texture: createGroundTexture('concrete') };
  }, []);
  useEffect(() => () => {
    resources.floor.dispose(); resources.retainingWall.dispose();
    resources.approach.dispose(); resources.texture.dispose();
  }, [resources]);

  return (
    <group name="recessed-truck-loading-court">
      <mesh geometry={resources.floor} receiveShadow>
        <meshStandardMaterial color="#b8b8ad" map={resources.texture} roughness={0.95} />
      </mesh>
      <mesh geometry={resources.approach} receiveShadow>
        <meshStandardMaterial color="#b8b8ad" map={resources.texture} roughness={0.95} />
      </mesh>
      {[dock.minZ - 0.22, dock.maxZ].map((z) => (
        <group key={z}>
          <mesh position={[0, 0, z]} geometry={resources.retainingWall} receiveShadow castShadow>
            <meshStandardMaterial color="#94998e" roughness={0.95} />
          </mesh>
          <Line points={[[dock.wallX + 0.3, 0.19, z + 0.11], [dock.slopeEndX - 0.2, 0.19, z + 0.11]]}
            color="#d7b762" lineWidth={1.5} raycast={() => null} />
        </group>
      ))}
      {/* Below-grade foundation at the building prevents a gap behind the dock sill. */}
      <mesh position={[dock.wallX + 0.04, (dock.floorY + 0.16) / 2, (dock.minZ + dock.maxZ) / 2]} receiveShadow>
        <boxGeometry args={[0.22, 0.16 - dock.floorY, dock.maxZ - dock.minZ]} />
        <meshStandardMaterial color="#92988d" roughness={0.95} />
      </mesh>
      {/* A transverse drain separates the gentle descent from the level reversing apron. */}
      <mesh position={[dock.flatEndX - 0.3, dock.floorY + 0.015, (dock.minZ + dock.maxZ) / 2]}>
        <boxGeometry args={[0.22, 0.025, dock.maxZ - dock.minZ - 0.6]} />
        <meshStandardMaterial color="#555f59" metalness={0.45} roughness={0.65} />
      </mesh>
    </group>
  );
}
