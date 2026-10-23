import { useFactoryStore } from '../../store/useFactoryStore';

// Deck and approach, in meters (scaled plan).
const ROAD_Y = 0.12;
const DECK_TOP = 0.34;
const RAMP = 1.6;
const ROAD_HALF = 6;
const BARRIER_OFFSET = 1.2; // past the exit ramp

/** Entry weighbridge opposite the security booth. Static structure; clicking it opens the gate panel. */
export function WeighbridgeStation() {
  const infrastructure = useFactoryStore((s) => s.infrastructure);
  const openLogisticsArea = useFactoryStore((s) => s.openLogisticsArea);
  const entity = infrastructure.find((item) => item.infraType === 'weighbridge_gate' && item.visible);

  if (!entity) return null;
  const [width, length] = entity.dimensions ?? [5, 20, 2];
  const sideX = ROAD_HALF + 0.7; // booth side of the road (local +X faces north)
  const moduleLength = length / 3;

  return (
    <group
      position={[entity.position[0], 0, entity.position[2]]}
      rotation={[0, entity.rotationY, 0]}
      onClick={(event) => {
        if (event.delta > 4) return;
        event.stopPropagation();
        openLogisticsArea('gate_security');
      }}
    >
      {/* Concrete pit frame and three steel deck modules on load cells. */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[width + 0.9, 0.24, length + 0.6]} />
        <meshStandardMaterial color="#a9aaa2" roughness={0.95} />
      </mesh>
      {[-1, 0, 1].map((k) => (
        <mesh key={k} position={[0, DECK_TOP - 0.05, k * moduleLength]} receiveShadow>
          <boxGeometry args={[width, 0.1, moduleLength - 0.08]} />
          <meshStandardMaterial color="#5f676c" metalness={0.55} roughness={0.45} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* Guide kerbs keep wheels on the deck. */}
          <mesh position={[side * (width / 2 + 0.12), 0.38, 0]} castShadow>
            <boxGeometry args={[0.18, 0.28, length]} />
            <meshStandardMaterial color="#d9a92b" roughness={0.6} />
          </mesh>
          {/* Entry and exit ramps. */}
          <mesh
            position={[0, (ROAD_Y + DECK_TOP) / 2, side * (length / 2 + 0.3 + RAMP / 2)]}
            rotation={[side * Math.atan2(DECK_TOP - ROAD_Y, RAMP), 0, 0]}
            receiveShadow
          >
            <boxGeometry args={[width, 0.06, RAMP + 0.1]} />
            <meshStandardMaterial color="#6b7276" metalness={0.45} roughness={0.55} />
          </mesh>
          {/* Load cell junction boxes. */}
          {[-length / 2, -moduleLength / 2, moduleLength / 2, length / 2].map((z) => (
            <mesh key={z} position={[side * (width / 2 + 0.6), 0.39, z]} castShadow>
              <boxGeometry args={[0.28, 0.3, 0.38]} />
              <meshStandardMaterial color="#8d969a" metalness={0.4} roughness={0.5} />
            </mesh>
          ))}
          {/* Corner bollards. */}
          {[-1, 1].map((end) => (
            <mesh key={end} position={[side * (width / 2 + 0.8), 0.55, end * (length / 2 + 0.4)]} castShadow>
              <cylinderGeometry args={[0.14, 0.14, 1.1, 12]} />
              <meshStandardMaterial color="#e0b52a" roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Traffic light facing incoming trucks: green, the deck is free. */}
      <group position={[sideX, 0, -(length / 2 + RAMP + 1.5)]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 3, 8]} />
          <meshStandardMaterial color="#5b6366" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, 3, 0]} castShadow>
          <boxGeometry args={[0.38, 0.85, 0.3]} />
          <meshStandardMaterial color="#22282b" roughness={0.6} />
        </mesh>
        {[{ y: 3.2, color: '#e5483a', on: false }, { y: 2.8, color: '#3ccf6e', on: true }].map(({ y, color, on }) => (
          <mesh key={color} position={[0, y, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={on ? 2.2 : 0} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* Exit barrier, closed; the arm reaches across from the booth side. */}
      <group position={[sideX, 0, length / 2 + RAMP + BARRIER_OFFSET]}>
        <mesh position={[0, 0.58, 0]} castShadow>
          <boxGeometry args={[0.45, 1.15, 0.45]} />
          <meshStandardMaterial color="#d8dad3" roughness={0.5} />
        </mesh>
        <group position={[0, 1.05, 0]}>
          <mesh position={[-ROAD_HALF, 0, 0]} castShadow>
            <boxGeometry args={[2 * ROAD_HALF, 0.12, 0.12]} />
            <meshStandardMaterial color="#f4f4ef" roughness={0.4} />
          </mesh>
          {[1.5, 4.5, 7.5, 10.5].map((x) => (
            <mesh key={x} position={[-x, 0, 0]}>
              <boxGeometry args={[1, 0.125, 0.125]} />
              <meshStandardMaterial color="#c8352b" roughness={0.45} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Weight display board past the exit, across from the booth. */}
      <group position={[-(sideX + 0.5), 0, length / 2 + RAMP + BARRIER_OFFSET + 3]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[0, 1.2, side * 1.1]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 2.4, 8]} />
            <meshStandardMaterial color="#5b6366" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 2.55, 0]} castShadow>
          <boxGeometry args={[0.14, 1.1, 2.6]} />
          <meshStandardMaterial color="#1d2326" emissive="#0d3b26" emissiveIntensity={0.6} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}
