import React from 'react';
import { useFactoryStore } from '../../store/useFactoryStore';
import type { VehicleEntity } from '../../types/factory';

export type TruckLook = Pick<VehicleEntity, 'vehicleType' | 'cabColor' | 'trailerColor'>;

/** Distance from a semi's origin to the rear face of its trailer (local +Z), per TruckModel. */
export const SEMI_REAR_OFFSET = 1.8 + 10.5 / 2;

/** Truck mesh only; the caller positions and orients it. The cab faces local -Z. */
export const TruckModel: React.FC<{ truck: TruckLook }> = ({ truck }) => {
  const isSemi = truck.vehicleType === 'semi_trailer';
  return (
    <>
            {isSemi ? (
              // Semi-Trailer Truck (Tractor Cab + 53ft Refrigerated Cargo Trailer)
              <group position={[0, 0, 0]}>
                {/* Truck Cab */}
                <group position={[0, 1.3, -4.5]}>
                  <mesh position={[0, 0.4, 0]} castShadow>
                    <boxGeometry args={[2.5, 2.4, 3.2]} />
                    <meshStandardMaterial color={truck.cabColor} metalness={0.6} roughness={0.3} />
                  </mesh>
                  {/* Windshield */}
                  <mesh position={[0, 0.7, -1.61]} rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[2.1, 1.0]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
                  </mesh>
                  {/* Bumper */}
                  <mesh position={[0, -0.6, -1.65]} castShadow>
                    <boxGeometry args={[2.5, 0.6, 0.3]} />
                    <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
                  </mesh>
                  {/* Exhaust Stacks */}
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
                <group position={[0, 2.6, 1.8]}>
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[2.6, 2.9, 10.5]} />
                    <meshStandardMaterial color={truck.trailerColor} roughness={0.4} metalness={0.2} />
                  </mesh>
                  <mesh position={[0, 0.5, -5.4]} castShadow>
                    <boxGeometry args={[1.8, 1.4, 0.5]} />
                    <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
                  </mesh>
                  <mesh position={[0, -1.65, 0]} castShadow>
                    <boxGeometry args={[2.2, 0.3, 10.2]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.5} />
                  </mesh>
                  {/* Rear Wheels */}
                  {[-1.3, 1.3].map((wx, wi) =>
                    [2.6, 4.0].map((wz, wzi) => (
                      <mesh
                        key={`wheel-${wi}-${wzi}`}
                        position={[wx, -2.08, wz]}
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
              // Rigid Distribution Truck
              <group position={[0, 1.5, 0]}>
                <mesh position={[0, 0.2, -2.8]} castShadow>
                  <boxGeometry args={[2.3, 2.0, 2.2]} />
                  <meshStandardMaterial color={truck.cabColor} metalness={0.5} roughness={0.4} />
                </mesh>
                <mesh position={[0, 0.5, -3.91]}>
                  <planeGeometry args={[1.9, 0.9]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
                </mesh>
                <mesh position={[0, 0.4, 0.8]} castShadow receiveShadow>
                  <boxGeometry args={[2.4, 2.4, 5.2]} />
                  <meshStandardMaterial color={truck.trailerColor} roughness={0.5} />
                </mesh>
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

    </>
  );
};

export const CampusVehicles: React.FC = () => {
  const vehicles = useFactoryStore((s) => s.vehicles);

  return (
    <group position={[0, 0, 0]}>
      {vehicles.map((truck) => {
        if (!truck.visible) return null;
        return (
          <group
            key={truck.id}
            position={truck.position}
            rotation={[0, truck.rotationY || 0, 0]}
          >
            <TruckModel truck={truck} />
          </group>
        );
      })}
    </group>
  );
};
