import React from 'react';
import { TRUCKS } from '../../data/factoryLayout';

export const IndustrialTrucks: React.FC = () => {
  return (
    <group position={[0, 0, 0]}>
      {TRUCKS.map((truck) => {
        const isSemi = ((truck as any).vehicleType || (truck as any).truckType) === 'semi_trailer';
        return (
          <group
            key={truck.id}
            position={truck.position}
            rotation={[0, truck.rotationY, 0]}
          >
            {isSemi ? (
              // 1. Semi-Trailer (Tractor + 48ft/53ft Refrig Box Trailer)
              <group position={[0, 0, 0]}>
                {/* Truck Cab */}
                <group position={[0, 1.4, -4.5]}>
                  {/* Main Cab body */}
                  <mesh position={[0, 0.4, 0]} castShadow>
                    <boxGeometry args={[2.5, 2.4, 3.2]} />
                    <meshStandardMaterial color={truck.cabColor} metalness={0.6} roughness={0.3} />
                  </mesh>
                  {/* Windshield */}
                  <mesh position={[0, 0.7, -1.61]}>
                    <planeGeometry args={[2.1, 1.0]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
                  </mesh>
                  {/* Cab bumper */}
                  <mesh position={[0, -0.6, -1.65]} castShadow>
                    <boxGeometry args={[2.5, 0.6, 0.3]} />
                    <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
                  </mesh>
                  {/* Chrome exhaust stacks */}
                  <mesh position={[-1.1, 1.2, 1.2]} castShadow>
                    <cylinderGeometry args={[0.08, 0.08, 1.6, 8]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
                  </mesh>
                  <mesh position={[1.1, 1.2, 1.2]} castShadow>
                    <cylinderGeometry args={[0.08, 0.08, 1.6, 8]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
                  </mesh>
                  {/* Front Wheels */}
                  <mesh position={[-1.25, -0.8, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.5, 0.5, 0.4, 12]} />
                    <meshStandardMaterial color="#1e293b" roughness={0.8} />
                  </mesh>
                  <mesh position={[1.25, -0.8, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.5, 0.5, 0.4, 12]} />
                    <meshStandardMaterial color="#1e293b" roughness={0.8} />
                  </mesh>
                </group>

                {/* Cargo Trailer */}
                <group position={[0, 2.0, 1.8]}>
                  {/* Trailer box */}
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[2.6, 2.9, 10.5]} />
                    <meshStandardMaterial color={truck.trailerColor} roughness={0.4} metalness={0.2} />
                  </mesh>
                  {/* Refrigeration cooling unit on front nose */}
                  <mesh position={[0, 0.5, -5.4]} castShadow>
                    <boxGeometry args={[1.8, 1.4, 0.5]} />
                    <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
                  </mesh>
                  {/* Undercarriage chassis frame */}
                  <mesh position={[0, -1.6, 0]} castShadow>
                    <boxGeometry args={[2.2, 0.3, 10.2]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.5} />
                  </mesh>
                  {/* Rear Dual Wheels */}
                  {[-1.3, 1.3].map((wx, wi) =>
                    [2.6, 4.0].map((wz, wzi) => (
                      <mesh
                        key={`wheel-${wi}-${wzi}`}
                        position={[wx, -1.5, wz]}
                        rotation={[0, 0, Math.PI / 2]}
                        castShadow
                      >
                        <cylinderGeometry args={[0.52, 0.52, 0.4, 12]} />
                        <meshStandardMaterial color="#0f172a" roughness={0.8} />
                      </mesh>
                    ))
                  )}
                </group>
              </group>
            ) : (
              // 2. Rigid Distribution Box Truck / Flatbed
              <group position={[0, 1.5, 0]}>
                {/* Cab */}
                <mesh position={[0, 0.2, -2.8]} castShadow>
                  <boxGeometry args={[2.3, 2.0, 2.2]} />
                  <meshStandardMaterial color={truck.cabColor} metalness={0.5} roughness={0.4} />
                </mesh>
                {/* Windshield */}
                <mesh position={[0, 0.5, -3.91]}>
                  <planeGeometry args={[1.9, 0.9]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
                </mesh>
                {/* Body / Cargo box */}
                <mesh position={[0, 0.4, 0.8]} castShadow receiveShadow>
                  <boxGeometry args={[2.4, 2.4, 5.2]} />
                  <meshStandardMaterial color={truck.trailerColor} roughness={0.5} />
                </mesh>
                {/* Chassis Wheels */}
                {[-1.2, 1.2].map((wx, wi) =>
                  [-2.4, 2.0].map((wz, wzi) => (
                    <mesh
                      key={`rigid-w-${wi}-${wzi}`}
                      position={[wx, -1.0, wz]}
                      rotation={[0, 0, Math.PI / 2]}
                      castShadow
                    >
                      <cylinderGeometry args={[0.48, 0.48, 0.35, 12]} />
                      <meshStandardMaterial color="#0f172a" roughness={0.8} />
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
