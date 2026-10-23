import React from 'react';
import { useFactoryStore } from '../../store/useFactoryStore';

export const CampusInfrastructure: React.FC = () => {
  const infrastructure = useFactoryStore((s) => s.infrastructure);

  return (
    <group position={[0, 0, 0]}>
      {infrastructure.map((inf) => {
        // The weighbridge has its own animated station (WeighbridgeStation).
        if (!inf.visible || inf.infraType === 'weighbridge_gate') return null;
        const [width, depth, height] = inf.dimensions ?? [10, 10, 3];

        return (
          <group
            key={inf.id}
            position={inf.position}
            rotation={[0, inf.rotationY || 0, 0]}
          >
            {inf.infraType === 'silo_tanks' && (
              // Pressurized Horizontal Liquid/Gas Vessels
              <group scale={[width / 10.6, height / 2.3, depth / 8.6]}>
                {[-3, 3].map((offsetZ, i) => (
                  <group key={`tank-${i}`} position={[0, 1.2, offsetZ]}>
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
                    {/* Concrete cradles */}
                    <mesh position={[-2.5, -0.8, 0]} castShadow>
                      <boxGeometry args={[1.2, 0.8, 2.6]} />
                      <meshStandardMaterial color="#64748b" roughness={0.9} />
                    </mesh>
                    <mesh position={[2.5, -0.8, 0]} castShadow>
                      <boxGeometry args={[1.2, 0.8, 2.6]} />
                      <meshStandardMaterial color="#64748b" roughness={0.9} />
                    </mesh>
                  </group>
                ))}
              </group>
            )}

            {inf.infraType === 'pallet_stacks' && (
              // Wooden Pallets & Raw Materials Crate Rows
              <group scale={[width / 8.2, height / 1.2, depth / 8]}>
                {[-3, 0, 3].map((px) =>
                  [-3, 0, 3].map((pz) => (
                    <mesh key={`p-${px}-${pz}`} position={[px, 0.6, pz]} castShadow receiveShadow>
                      <boxGeometry args={[2.2, 1.2, 2.0]} />
                      <meshStandardMaterial
                        color={(px + pz) % 2 === 0 ? '#b45309' : '#854d0e'}
                        roughness={0.85}
                      />
                    </mesh>
                  ))
                )}
              </group>
            )}

          </group>
        );
      })}
    </group>
  );
};
