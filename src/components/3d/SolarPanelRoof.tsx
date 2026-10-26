import React, { useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { createBuildingTexture } from './buildingMaterials';

interface SolarPanelRoofProps {
  roofWidth: number;
  roofDepth: number;
  height: number;
  pattern: 'dense' | 'striped';
  position?: [number, number, number];
  /** Ghosted array for interior inspection; it also stops shadowing the interior. */
  xray?: boolean;
}

const PANEL_WIDTH = 1.08;
const PANEL_DEPTH = 2.1;
const PANEL_GAP = 0.045;
const PANEL_TILT = 0.025;
const XRAY_OPACITY = 0.1;

export const SolarPanelRoof: React.FC<SolarPanelRoofProps> = ({
  roofWidth,
  roofDepth,
  height,
  pattern,
  position = [0, 0, 0],
  xray = false,
}) => {
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const glassRef = useRef<THREE.InstancedMesh>(null);
  const railRef = useRef<THREE.InstancedMesh>(null);
  const panelTexture = useMemo(() => createBuildingTexture('photovoltaic'), []);
  useEffect(() => () => panelTexture.dispose(), [panelTexture]);

  const layout = useMemo(() => {
    const frames: THREE.Matrix4[] = [];
    const glass: THREE.Matrix4[] = [];
    const rails: THREE.Matrix4[] = [];
    const margin = Math.min(1.1, roofWidth * 0.08, roofDepth * 0.08);
    const northHeader = pattern === 'striped' ? Math.min(6, roofDepth * 0.15) : 0;
    const availableWidth = roofWidth - margin * 2;
    const availableDepth = roofDepth - margin * 2 - northHeader;
    if (availableWidth < PANEL_WIDTH || availableDepth < PANEL_DEPTH) {
      return { frames, glass, rails };
    }

    const aisle = pattern === 'striped' ? 1.15 : 0.65;
    const bankCount = Math.min(
      pattern === 'striped' ? 3 : 5,
      Math.max(1, Math.floor((availableWidth + aisle) / (PANEL_WIDTH * 2 + aisle))),
    );
    const bankWidth = (availableWidth - (bankCount - 1) * aisle) / bankCount;
    const columns = Math.floor((bankWidth + PANEL_GAP) / (PANEL_WIDTH + PANEL_GAP));
    const rows = Math.floor((availableDepth + PANEL_GAP) / (PANEL_DEPTH + PANEL_GAP));
    const occupiedWidth = columns * PANEL_WIDTH + (columns - 1) * PANEL_GAP;
    const occupiedDepth = rows * PANEL_DEPTH + (rows - 1) * PANEL_GAP;
    const frameRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(PANEL_TILT, 0, 0));
    const glassRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + PANEL_TILT, 0, 0));
    const unit = new THREE.Vector3(1, 1, 1);
    const point = new THREE.Vector3();

    for (let bank = 0; bank < bankCount; bank++) {
      const centerX = -availableWidth / 2 + bankWidth / 2 + bank * (bankWidth + aisle);
      for (let column = 0; column < columns; column++) {
        for (let row = 0; row < rows; row++) {
          const x = centerX - occupiedWidth / 2 + PANEL_WIDTH / 2 + column * (PANEL_WIDTH + PANEL_GAP);
          const z = northHeader / 2 - occupiedDepth / 2 + PANEL_DEPTH / 2 + row * (PANEL_DEPTH + PANEL_GAP);
          point.set(x, height + 0.36, z);
          frames.push(new THREE.Matrix4().compose(point, frameRotation, unit));
          point.y += Math.cos(PANEL_TILT) * 0.031;
          point.z += Math.sin(PANEL_TILT) * 0.031;
          glass.push(new THREE.Matrix4().compose(point, glassRotation, unit));
        }
      }
      // The pale roof stays visible between banks; these are narrow support rails.
      for (const side of [-1, 1]) {
        rails.push(new THREE.Matrix4().compose(
          new THREE.Vector3(centerX + side * occupiedWidth * 0.34, height + 0.27, northHeader / 2),
          new THREE.Quaternion(),
          new THREE.Vector3(0.08, 0.065, occupiedDepth),
        ));
      }
    }
    return { frames, glass, rails };
  }, [roofWidth, roofDepth, height, pattern]);

  useLayoutEffect(() => {
    const entries = [
      [frameRef.current, layout.frames],
      [glassRef.current, layout.glass],
      [railRef.current, layout.rails],
    ] as const;
    entries.forEach(([mesh, matrices]) => {
      if (!mesh) return;
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
    if (glassRef.current) {
      layout.glass.forEach((_, index) => {
        const shade = 0.91 + ((index * 17) % 11) / 110;
        glassRef.current!.setColorAt(index, new THREE.Color(shade, shade, shade));
      });
      if (glassRef.current.instanceColor) glassRef.current.instanceColor.needsUpdate = true;
    }
  }, [layout]);

  if (layout.frames.length === 0) return null;
  // Keyed so the material is rebuilt when blending changes instead of mutated in place.
  const seeKey = xray ? 'xray' : 'solid';
  const see = { transparent: xray, opacity: xray ? XRAY_OPACITY : 1, depthWrite: !xray };

  return (
    <group position={position}>
      <instancedMesh ref={railRef} args={[undefined, undefined, layout.rails.length]} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial key={seeKey} {...see} color="#9b9f9c" metalness={0.6} roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={frameRef} args={[undefined, undefined, layout.frames.length]} castShadow={!xray} receiveShadow>
        <boxGeometry args={[PANEL_WIDTH, 0.055, PANEL_DEPTH]} />
        <meshStandardMaterial key={seeKey} {...see} color="#929b9c" metalness={0.68} roughness={0.44} />
      </instancedMesh>
      <instancedMesh ref={glassRef} args={[undefined, undefined, layout.glass.length]} receiveShadow>
        <planeGeometry args={[PANEL_WIDTH - 0.032, PANEL_DEPTH - 0.032]} />
        <meshStandardMaterial
          key={seeKey}
          {...see}
          map={panelTexture}
          color="#ffffff"
          metalness={0.32}
          roughness={0.43}
        />
      </instancedMesh>
    </group>
  );
};
