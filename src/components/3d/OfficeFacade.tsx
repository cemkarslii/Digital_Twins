import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { brickTexture, glazingTexture, louvreTexture, panelTexture, signTexture, SIGN_ASPECT } from './officeFacadeTextures';

export type FacadeSide = 'north' | 'south' | 'east' | 'west';

/**
 * Two-storey administration front applied to one face of a building: brick cladding, ribbon
 * windows, red pilasters, a louvred entrance tower with canopy, and channel-letter signage.
 *
 * Local frame: x runs along the face (left → right seen from outside), y up from the ground,
 * z outward. Layers step outward by ≥ 4 cm so no two parallel faces share a plane.
 */
const BRAND = 'FINE FOOD';
const RED = '#d8262e';
const PARAPET = 1.4;    // false front above the eave hides the pitched roof
const COPING = 0.9;
const TOWER_W = 9;
const PILASTER_W = 0.9;

// Outward layer depths from the building wall (z = 0).
const Z = {
  brickBack: 0.06, brickFront: 0.36,
  frameFront: 0.42, glassFront: 0.47,
  towerFront: 0.66, louvre: 0.72, sign: 0.78,
  copingFront: 0.72, pilasterFront: 0.9,
};

const FLOORS = [{ bottom: 0.75, top: 2.85 }, { bottom: 3.9, top: 6.15 }];

export function OfficeFacade({ side, width, depth, height }: { side: FacadeSide; width: number; depth: number; height: number }) {
  const length = side === 'east' || side === 'west' ? depth : width;
  const top = height + PARAPET;

  // Bays from left to right: edge pilaster, entrance tower, pilaster, wing, pilaster, wing, pilaster.
  const layout = useMemo(() => {
    const left = -length / 2;
    const towerStart = left + PILASTER_W;
    const towerEnd = towerStart + TOWER_W;
    const usable = length - TOWER_W - 4 * PILASTER_W;
    const wingA = [towerEnd + PILASTER_W, towerEnd + PILASTER_W + usable / 2] as const;
    const wingB = [wingA[1] + PILASTER_W, length / 2 - PILASTER_W] as const;
    const pilasters = [left + PILASTER_W / 2, towerEnd + PILASTER_W / 2, wingA[1] + PILASTER_W / 2, length / 2 - PILASTER_W / 2];
    return { towerCenter: (towerStart + towerEnd) / 2, wings: [wingA, wingB], pilasters };
  }, [length]);

  const louvreH = height + PARAPET - COPING - 3.3;
  const textures = useMemo(() => ({
    brick: brickTexture(length, top),
    coping: panelTexture(length),
    louvre: louvreTexture(TOWER_W / louvreH),
    sign: signTexture(BRAND),
    glazing: layout.wings.map(([a, b]) => glazingTexture(b - a - 1.2)),
    entrance: glazingTexture(TOWER_W - 2, 1.75),
  }), [length, top, louvreH, layout]);
  useEffect(() => () => {
    const { glazing, ...single } = textures;
    [...Object.values(single), ...glazing].forEach((texture) => texture.dispose());
  }, [textures]);

  const placement: Record<FacadeSide, { position: [number, number, number]; rotation: number }> = {
    west: { position: [-width / 2, 0, 0], rotation: -Math.PI / 2 },
    east: { position: [width / 2, 0, 0], rotation: Math.PI / 2 },
    north: { position: [0, 0, -depth / 2], rotation: Math.PI },
    south: { position: [0, 0, depth / 2], rotation: 0 },
  };
  const { position, rotation } = placement[side];
  const signW = TOWER_W * 0.8;
  const wingSignW = 7.2;
  const wingB = layout.wings[1];

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Slab x={0} y={top / 2} w={length} h={top} back={Z.brickBack} front={Z.brickFront} shadow>
        <meshStandardMaterial map={textures.brick} roughness={0.92} />
      </Slab>
      <Slab x={0} y={top - COPING / 2} w={length + 0.1} h={COPING} back={Z.brickFront - 0.02} front={Z.copingFront} shadow>
        <meshStandardMaterial map={textures.coping} roughness={0.55} metalness={0.25} />
      </Slab>

      {/* Ribbon windows: frame, glazing, and a dark sill band between the floors. */}
      {layout.wings.map(([a, b], wing) => {
        const span = b - a - 1.2, x = (a + b) / 2;
        return (
          <group key={wing}>
            {FLOORS.map(({ bottom, top: head }) => (
              <group key={bottom}>
                <Slab x={x} y={(bottom + head) / 2} w={span + 0.16} h={head - bottom + 0.16} back={Z.brickFront - 0.02} front={Z.frameFront}>
                  <meshStandardMaterial color="#3a3f43" roughness={0.5} metalness={0.4} />
                </Slab>
                <Slab x={x} y={(bottom + head) / 2} w={span} h={head - bottom} back={Z.frameFront - 0.02} front={Z.glassFront}>
                  <meshStandardMaterial map={textures.glazing[wing]} roughness={0.12} metalness={0.55} />
                </Slab>
              </group>
            ))}
            <Slab x={x} y={3.4} w={b - a} h={0.3} back={Z.brickFront - 0.02} front={Z.frameFront}>
              <meshStandardMaterial color="#4a4f54" roughness={0.6} />
            </Slab>
          </group>
        );
      })}

      {/* Entrance tower: dark panel with the louvred X, sign, canopy and glazed doors. */}
      <Slab x={layout.towerCenter} y={(top - COPING) / 2} w={TOWER_W} h={top - COPING} back={Z.brickFront - 0.02} front={Z.towerFront} shadow>
        <meshStandardMaterial color="#4a4f54" roughness={0.6} metalness={0.2} />
      </Slab>
      <mesh position={[layout.towerCenter, 3.3 + louvreH / 2, Z.louvre]}>
        <planeGeometry args={[TOWER_W - 0.2, louvreH]} />
        <meshStandardMaterial map={textures.louvre} roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[layout.towerCenter, 4.55, Z.sign]}>
        <planeGeometry args={[signW, signW / SIGN_ASPECT]} />
        <meshStandardMaterial map={textures.sign} alphaTest={0.5} roughness={0.4} />
      </mesh>
      <Slab x={layout.towerCenter} y={3.05} w={TOWER_W + 0.8} h={0.45} back={Z.towerFront - 0.02} front={2.6} shadow>
        <meshStandardMaterial color={RED} roughness={0.45} />
      </Slab>
      <Slab x={layout.towerCenter} y={1.55} w={TOWER_W - 2} h={2.1} back={Z.towerFront - 0.02} front={Z.towerFront + 0.05}>
        <meshStandardMaterial map={textures.entrance} roughness={0.12} metalness={0.55} />
      </Slab>

      {/* Full-height red pilasters, proud of everything else. */}
      {layout.pilasters.map((x) => (
        <Slab key={x} x={x} y={(top + 0.05) / 2} w={PILASTER_W} h={top + 0.05} back={Z.brickBack} front={Z.pilasterFront} shadow>
          <meshStandardMaterial color={RED} roughness={0.45} />
        </Slab>
      ))}

      {/* Second sign at the head of the far wing, under the coping. */}
      <mesh position={[wingB[1] - wingSignW / 2 - 0.6, (FLOORS[1].top + top - COPING) / 2, Z.frameFront + 0.04]}>
        <planeGeometry args={[wingSignW, wingSignW / SIGN_ASPECT]} />
        <meshStandardMaterial map={textures.sign} alphaTest={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Axis-aligned slab spanning [back, front] outward from the wall. */
function Slab({ x, y, w, h, back, front, shadow = false, children }: {
  x: number; y: number; w: number; h: number; back: number; front: number; shadow?: boolean; children: React.ReactNode;
}) {
  return (
    <mesh position={[x, y, (back + front) / 2]} castShadow={shadow} receiveShadow>
      <boxGeometry args={[w, h, front - back]} />
      {children}
    </mesh>
  );
}
