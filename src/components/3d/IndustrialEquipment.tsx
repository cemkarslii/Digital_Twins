import React from 'react';

export const IndustrialEquipment: React.FC = () => {
  return (
    <group position={[0, 0, 0]}>
      {/* 1. Industrial Storage Silos & Horizontal Pressure Vessels near Western Gate */}
      <group position={[-70, 0, 2]}>
        {/* Horizontal gas/ammonia storage tank 1 */}
        <group position={[0, 1.2, -6]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[1.1, 1.1, 8.5, 16]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[-4.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <sphereGeometry args={[1.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[4.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
            <sphereGeometry args={[1.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Concrete saddles */}
          <mesh position={[-2.5, -0.8, 0]} castShadow>
            <boxGeometry args={[1.2, 0.8, 2.6]} />
            <meshStandardMaterial color="#64748b" roughness={0.9} />
          </mesh>
          <mesh position={[2.5, -0.8, 0]} castShadow>
            <boxGeometry args={[1.2, 0.8, 2.6]} />
            <meshStandardMaterial color="#64748b" roughness={0.9} />
          </mesh>
        </group>

        {/* Horizontal gas/ammonia storage tank 2 */}
        <group position={[0, 1.2, -10]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[1.1, 1.1, 8.5, 16]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[-4.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <sphereGeometry args={[1.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[4.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
            <sphereGeometry args={[1.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[-2.5, -0.8, 0]} castShadow>
            <boxGeometry args={[1.2, 0.8, 2.6]} />
            <meshStandardMaterial color="#64748b" roughness={0.9} />
          </mesh>
          <mesh position={[2.5, -0.8, 0]} castShadow>
            <boxGeometry args={[1.2, 0.8, 2.6]} />
            <meshStandardMaterial color="#64748b" roughness={0.9} />
          </mesh>
        </group>
      </group>

      {/* 2. Pallet Stacks & Raw Material Staging Yard (North-East, north of Eastern Solar Warehouse) */}
      <group position={[68, 0, -4]}>
        {[-3, 0, 3, 6].map((px) =>
          [-2, 1, 4].map((pz) => (
            <group key={`pallet-${px}-${pz}`} position={[px, 0.6, pz]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[2.2, 1.2, 2.0]} />
                <meshStandardMaterial
                  color={(px + pz) % 2 === 0 ? '#b45309' : '#854d0e'} // Wooden & terra pallet stacks
                  roughness={0.85}
                />
              </mesh>
            </group>
          ))
        )}
      </group>

      {/* 3. South Perimeter Material / Crate Rows (visible at the bottom of the satellite image) */}
      <group position={[-12, 0, 74]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={`crate-row-${i}`} position={[i * 3.5, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.8, 1.0, 1.8]} />
            <meshStandardMaterial color="#78716c" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* 4. Weighbridge Ramp & Security Boom Barrier at Gatehouse (SEC-09) */}
      <group position={[-46, 0.1, 28]}>
        {/* Scale Platform */}
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[3.8, 0.2, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Yellow security edge lines */}
        <mesh position={[-1.85, 0.22, 0]}>
          <boxGeometry args={[0.15, 0.05, 16]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
        <mesh position={[1.85, 0.22, 0]}>
          <boxGeometry args={[0.15, 0.05, 16]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
        {/* Boom Barrier Pedestal */}
        <mesh position={[-2.4, 0.6, -2]} castShadow>
          <boxGeometry args={[0.4, 1.2, 0.4]} />
          <meshStandardMaterial color="#e11d48" roughness={0.4} />
        </mesh>
        {/* Barrier arm */}
        <mesh position={[-0.4, 1.1, -2]} rotation={[0, 0, 0.08]} castShadow>
          <boxGeometry args={[3.6, 0.12, 0.12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
};
