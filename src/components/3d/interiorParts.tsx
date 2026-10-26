import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

type Vec3 = [number, number, number];
export interface InstanceItem { position: Vec3; scale: Vec3; rotation?: Vec3; color?: string }

/**
 * Minimum gap between parallel surfaces. Coplanar faces z-fight (blocky flicker on walls)
 * at campus distances; depth error there is ~2 mm (near 2, 24-bit), so 6 cm is a safe margin.
 */
export const CLEARANCE = 0.06;

/** Repeated interior parts in one draw call each. Parts are decorative and ignore pointer events. */
export const Instanced: React.FC<{
  items: InstanceItem[]; shape?: 'box' | 'cylinder' | 'heap'; color: string;
  roughness?: number; metalness?: number; emissive?: string; castShadow?: boolean;
}> = ({ items, shape = 'box', color, roughness = 0.8, metalness = 0, emissive, castShadow = false }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = new THREE.Object3D();
    const tint = new THREE.Color();
    items.forEach((item, index) => {
      object.position.set(...item.position);
      object.scale.set(...item.scale);
      object.rotation.set(...(item.rotation ?? [0, 0, 0]));
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
      mesh.setColorAt(index, tint.set(item.color ?? color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, color]);
  if (!items.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={castShadow} receiveShadow raycast={() => null}>
      {shape === 'cylinder' ? <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        : shape === 'heap' ? <icosahedronGeometry args={[1, 1]} />
          : <boxGeometry args={[1, 1, 1]} />}
      <meshStandardMaterial color="white" roughness={roughness} metalness={metalness}
        emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 1.1 : 0} flatShading={shape === 'heap'} />
    </instancedMesh>
  );
};

