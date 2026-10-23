import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SITE_BOUNDARY } from '../../data/sitePlan';
import { MAP_BOUNDS, referencePoint, SITE_PLAN_SCALE } from '../../data/siteCoordinates';
import { isLoadingAccess, LOADING_DOCK, LOADING_PIT } from '../../data/loadingDock';
import { isDockApron } from '../../data/dockBanks';
import { useFactoryStore } from '../../store/useFactoryStore';
import { createGroundPatch, createGroundTexture } from './groundMaterials';

type Vector3Tuple = [number, number, number];
interface Instance {
  position: Vector3Tuple;
  scale: Vector3Tuple;
  rotation?: Vector3Tuple;
  color?: string;
}

/** Repeated landscape elements stay in a handful of draw calls. */
const Instances: React.FC<{
  items: Instance[]; shape?: 'box' | 'foliage' | 'cylinder'; color: string;
  castShadow?: boolean; roughness?: number;
}> = ({ items, shape = 'box', color, castShadow = false, roughness = 0.95 }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const object = new THREE.Object3D();
    const instanceColor = new THREE.Color();
    items.forEach((item, index) => {
      object.position.set(...item.position);
      object.scale.set(...item.scale);
      object.rotation.set(...(item.rotation ?? [0, 0, 0]));
      object.updateMatrix();
      ref.current!.setMatrixAt(index, object.matrix);
      ref.current!.setColorAt(index, instanceColor.set(item.color ?? color));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items, color]);
  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={castShadow} receiveShadow raycast={() => {}}>
    {shape === 'foliage' ? <icosahedronGeometry args={[1, 1]} /> : shape === 'cylinder' ? <cylinderGeometry args={[0.5, 0.5, 1, 7]} /> : <boxGeometry args={[1, 1, 1]} />}
    <meshStandardMaterial color="white" roughness={roughness} />
  </instancedMesh>;
};

const LAWN_PATCHES: [number, number, number, number][] = [
  [-75.6, -53, 4.4, 45], [-38, -76, 40, 4], [-8, -31.5, 35, 3],
  [43, -9, 104, 3.5], [1, 83.5, 222, 4], [113.6, 35, 3, 94],
  [-115, 43, 3.7, 75],
];

export const CampusLandscape: React.FC = () => {
  const buildings = useFactoryStore((s) => s.buildings);
  const roads = useFactoryStore((s) => s.roads);
  const landscape = useMemo(() => {
    let seed = 8914;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const foliage: Instance[] = [], trunks: Instance[] = [], posts: Instance[] = [], rails: Instance[] = [];
    const furrows: Instance[] = [], lampPosts: Instance[] = [], lampArms: Instance[] = [], lampHeads: Instance[] = [];
    const palette = ['#50633c', '#617044', '#465b36', '#738052', '#59683d'];
    const addTree = (referenceX: number, referenceZ: number, slender = false) => {
      const point = referencePoint([referenceX, referenceZ]);
      // The existing field-edge trees remain inside the unchanged terrain.
      const x = THREE.MathUtils.clamp(point[0], MAP_BOUNDS.minX + 6, MAP_BOUNDS.maxX - 6);
      const z = THREE.MathUtils.clamp(point[1], MAP_BOUNDS.minZ + 6, MAP_BOUNDS.maxZ - 6);
      if (isLoadingAccess(x, z, 2) || isDockApron(x, z, 2)) return;
      // Keep edited buildings and roads usable as the campus is rearranged.
      if (buildings.some((building) => {
        if (!building.visible) return false;
        const dx = x - building.position[0], dz = z - building.position[2];
        const localX = dx * Math.cos(building.rotationY) - dz * Math.sin(building.rotationY);
        const localZ = dx * Math.sin(building.rotationY) + dz * Math.cos(building.rotationY);
        return Math.abs(localX) < building.dimensions.width / 2 + 1.4 * SITE_PLAN_SCALE && Math.abs(localZ) < building.dimensions.depth / 2 + 1.4 * SITE_PLAN_SCALE;
      })) return;
      if (roads.some((road) => road.visible && road.points.slice(0, -1).some((a, index) => {
        const b = road.points[index + 1];
        const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
        const t = lengthSq > 0 ? THREE.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq, 0, 1) : 0;
        return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < road.width / 2 + 1.05 * SITE_PLAN_SCALE;
      }))) return;
      const height = slender ? 5.3 + random() * 2.1 : 3.9 + random() * 2.4;
      const radius = slender ? 0.95 + random() * 0.35 : 1.5 + random() * 0.75;
      const shade = palette[Math.floor(random() * palette.length)];
      trunks.push({ position: [x, height * 0.3, z], scale: [0.23, height * 0.6, 0.23], color: '#6c6048' });
      foliage.push({ position: [x, height * 0.68, z], scale: [radius, height * (slender ? 0.48 : 0.34), radius * 0.9], rotation: [0, random() * Math.PI, 0], color: shade });
      if (!slender) {
        foliage.push({ position: [x - radius * 0.58, height * 0.58, z + radius * 0.22], scale: [radius * 0.75, radius * 0.78, radius * 0.8], color: shade });
        foliage.push({ position: [x + radius * 0.48, height * 0.62, z - radius * 0.4], scale: [radius * 0.8, radius * 0.88, radius * 0.74], color: palette[Math.floor(random() * palette.length)] });
      }
    };
    const treeRow = (start: [number, number], end: [number, number], spacing: number, slender = false) => {
      const distance = Math.hypot(end[0] - start[0], end[1] - start[1]);
      const count = Math.max(1, Math.floor(distance / spacing));
      for (let i = 0; i <= count; i++) {
        addTree(start[0] + (end[0] - start[0]) * i / count + (random() - 0.5) * 0.55,
          start[1] + (end[1] - start[1]) * i / count + (random() - 0.5) * 0.55, slender);
      }
    };
    treeRow([-114, 83], [109, 83], 6.1);
    treeRow([-116, 13], [-116, 74], 6.2);
    treeRow([-117, -65], [-117, -10], 7.3, true);
    treeRow([113, -8], [113, 75], 6);
    treeRow([71, -72], [77, -30], 6.7);
    treeRow([-76, -75], [-76, -34], 6.5, true);
    treeRow([-52, -76], [-14, -69], 8);
    treeRow([-22, -32], [9, -32], 5.6);
    treeRow([-14, -9], [85, -9], 9.3, true);
    treeRow([-80, 5], [-113, 5], 6);
    // Redistribute the same orchard into the remaining eastern map margin.
    for (let row = 0; row < 8; row++) for (let col = 0; col < 4; col++) {
      addTree(122 + col * 3 + random() * 0.7, -83 + row * 17 + random() * 6);
    }
    treeRow([-127, -90], [-122, -15], 13);
    treeRow([-97, -96], [-144, -118], 12);

    const skipGate = (x: number, z: number, fenceDx: number, fenceDz: number) => roads.some((road) =>
      road.visible && road.points.slice(0, -1).some((a, index) => {
        const b = road.points[index + 1], dx = b[0] - a[0], dz = b[1] - a[1];
        const lengthSq = dx * dx + dz * dz;
        if (lengthSq < 0.001) return false;
        // Open crossings, while retaining fences beside parallel service roads.
        const crossingAngle = Math.abs(dx * fenceDz - dz * fenceDx) / Math.sqrt(lengthSq * (fenceDx * fenceDx + fenceDz * fenceDz));
        if (crossingAngle < 0.35) return false;
        const t = THREE.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq, 0, 1);
        return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < road.width / 2 + 1.4 * SITE_PLAN_SCALE;
      }),
    );
    SITE_BOUNDARY.forEach((a, index) => {
      const b = SITE_BOUNDARY[(index + 1) % SITE_BOUNDARY.length];
      const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      const count = Math.ceil(length / (3.4 * SITE_PLAN_SCALE)), angle = Math.atan2(dx, dz);
      for (let part = 0; part < count; part++) {
        const x0 = a[0] + dx * part / count, z0 = a[1] + dz * part / count;
        const x1 = a[0] + dx * (part + 1) / count, z1 = a[1] + dz * (part + 1) / count;
        const x = (x0 + x1) / 2, z = (z0 + z1) / 2;
        if (skipGate(x, z, dx, dz)) continue;
        posts.push({ position: [x0, 1.05, z0], scale: [0.13, 2.1, 0.13] });
        for (const y of [0.34, 1.8]) rails.push({ position: [x, y, z], scale: [0.065, 0.065, length / count], rotation: [0, angle, 0] });
        for (let wire = 1; wire < 6; wire++) {
          rails.push({ position: [x0 + (x1 - x0) * wire / 6, 1.05, z0 + (z1 - z0) * wire / 6], scale: [0.025, 1.5, 0.025] });
        }
      }
    });

    for (let row = 0; row < 61; row++) furrows.push({ position: [-255, -0.056, -176 + row * 5.8], scale: [22, 0.018, 0.22], color: row % 3 === 0 ? '#827d60' : '#95896d' });
    for (let row = 0; row < 24; row++) furrows.push({ position: [0, -0.055, -216 + row * 1.55], scale: [474, 0.018, 0.24], color: '#978260' });
    for (let row = 0; row < 17; row++) furrows.push({ position: [0, -0.055, 181 + row * 2.15], scale: [474, 0.018, 0.2], color: '#9e8c6e' });

    const addLamp = (referenceX: number, referenceZ: number, angle = 0) => {
      const [x, z] = referencePoint([referenceX, referenceZ]);
      if (isLoadingAccess(x, z, 1) || isDockApron(x, z, 1)) return;
      lampPosts.push({ position: [x, 3.3, z], scale: [0.11, 6.6, 0.11] });
      lampArms.push({ position: [x + Math.sin(angle) * 0.55, 6.54, z + Math.cos(angle) * 0.55], scale: [0.09, 0.09, 1.2], rotation: [0, angle, 0] });
      lampHeads.push({ position: [x + Math.sin(angle) * 1.04, 6.49, z + Math.cos(angle) * 1.04], scale: [0.38, 0.14, 0.7], rotation: [0, angle, 0] });
    };
    for (let z = 13; z < 75; z += 21) addLamp(-59.1, z, -Math.PI / 2);
    for (let x = -9; x < 99; x += 24) addLamp(x, -10.8, Math.PI);
    for (let z = 10; z < 69; z += 22) addLamp(102.4, z, Math.PI / 2);
    for (let x = -32; x < 96; x += 31) addLamp(x, 81, Math.PI);
    addLamp(17, -55, -Math.PI / 2);
    addLamp(17, -31, -Math.PI / 2);
    return { foliage, trunks, posts, rails, furrows, lampPosts, lampArms, lampHeads };
  }, [buildings, roads]);
  const lawn = useMemo(() => ({
    texture: createGroundTexture('grass'),
    patches: LAWN_PATCHES.map(([x, z, width, depth]) => {
      const [mappedX, mappedZ] = referencePoint([x, z]);
      return createGroundPatch(mappedX, mappedZ, width * SITE_PLAN_SCALE, depth * SITE_PLAN_SCALE, 0.023, [LOADING_PIT, LOADING_DOCK.approach]);
    }),
  }), []);
  useEffect(() => () => { lawn.texture.dispose(); lawn.patches.forEach((geometry) => geometry.dispose()); }, [lawn]);

  return <group>
    {lawn.patches.map((geometry, index) => <mesh key={index} geometry={geometry} receiveShadow raycast={() => {}}>
      <meshStandardMaterial map={lawn.texture} color="#7e905a" roughness={1} />
    </mesh>)}
    <Instances items={landscape.furrows} color="#96846b" />
    <Instances items={landscape.trunks} shape="cylinder" color="#6c6048" castShadow />
    <Instances items={landscape.foliage} shape="foliage" color="#596b3c" castShadow />
    <Instances items={landscape.posts} color="#697367" castShadow />
    <Instances items={landscape.rails} color="#788073" />
    <Instances items={landscape.lampPosts} shape="cylinder" color="#798080" castShadow />
    <Instances items={landscape.lampArms} color="#798080" castShadow />
    <Instances items={landscape.lampHeads} color="#d1d3c9" castShadow />
  </group>;
};
