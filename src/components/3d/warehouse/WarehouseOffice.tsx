import type { WarehouseLayout } from '../../../types/warehouse';
import { CLEARANCE } from '../interiorParts';

/**
 * ÇALIŞMA ODASI: a closed, lightweight office volume against the east wall, mid-way along the
 * loading area. One door and window bands on the loading-area face; no modelled interior.
 */
export function WarehouseOffice({ layout }: { layout: WarehouseLayout }) {
  const { office, floorY: F } = layout;
  const width = office.maxX - office.minX - CLEARANCE, length = office.maxZ - office.minZ;
  const cx = office.minX + width / 2, cz = (office.minZ + office.maxZ) / 2;
  const face = office.minX - 0.03;
  const doorOffset = office.doorZ - cz;
  const windowLength = (length - 3) / 2 - 1;

  return (
    <group position={[cx, F, cz]}>
      <mesh position={[0, office.height / 2, 0]} castShadow receiveShadow raycast={() => null}>
        <boxGeometry args={[width, office.height, length]} />
        <meshStandardMaterial color="#e8eae4" roughness={0.7} />
      </mesh>
      {/* Flat roof with a low parapet, tinted so the office reads from the top-down view. */}
      <mesh position={[0, office.height + 0.08, 0]} receiveShadow raycast={() => null}>
        <boxGeometry args={[width + 0.2, 0.16, length + 0.2]} />
        <meshStandardMaterial color="#6d5ba3" roughness={0.65} />
      </mesh>
      <group position={[face - cx, 0, doorOffset]}>
        <mesh position={[0, 1.05, 0]} raycast={() => null}>
          <boxGeometry args={[0.06, 2.1, 1]} />
          <meshStandardMaterial color="#56625e" roughness={0.6} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[0, 1.65, side * (1.5 + windowLength / 2)]} raycast={() => null}>
            <boxGeometry args={[0.05, 1.1, windowLength]} />
            <meshStandardMaterial color="#4d6470" metalness={0.35} roughness={0.25} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
