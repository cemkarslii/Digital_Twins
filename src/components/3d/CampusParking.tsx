import React from 'react';
import { Line } from '@react-three/drei';
import { useFactoryStore } from '../../store/useFactoryStore';

export const CampusParking: React.FC = () => {
  const parkingAreas = useFactoryStore((s) => s.parking);
  const openLogisticsArea = useFactoryStore((s) => s.openLogisticsArea);

  return (
    <group position={[0, 0, 0]}>
      {parkingAreas.map((park) => {
        if (!park.visible) return null;
        const [w, d] = park.dimensions;
        const slots = Math.max(2, park.slotCount || 4);
        const slotWidth = d / slots;

        return (
          <group
            key={park.id}
            position={park.position}
            rotation={[0, park.rotationY || 0, 0]}
            onClick={park.parkingType === 'truck' ? (event) => {
              if (event.delta > 4) return;
              event.stopPropagation();
              openLogisticsArea('truck_park');
            } : undefined}
          >
            {/* Paved Parking Lot Ground Pad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial color={park.parkingType === 'loading_bay' ? '#a5a99f' : '#65665f'} roughness={0.95} />
            </mesh>

            {/* Outer Perimeter Yellow Stripes */}
            <Line points={[[-w / 2, 0.04, -d / 2], [w / 2, 0.04, -d / 2], [w / 2, 0.04, d / 2], [-w / 2, 0.04, d / 2], [-w / 2, 0.04, -d / 2]]}
              color="#d5c89a" lineWidth={1} raycast={() => null} />

            {/* Painted Parking Slot Dividers */}
            {Array.from({ length: slots + 1 }).map((_, i) => {
              const zOffset = -d / 2 + i * slotWidth;
              return (
                <mesh
                  key={`line-${i}`}
                  position={[0, 0.045, zOffset]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <planeGeometry args={[w * 0.92, 0.2]} />
                  <meshBasicMaterial color="#d8d4bf" />
                </mesh>
              );
            })}

          </group>
        );
      })}
    </group>
  );
};
