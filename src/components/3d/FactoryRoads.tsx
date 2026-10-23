import React from 'react';

export const FactoryRoads: React.FC = () => {
  const roadElevation = 0.03; // Placed slightly above ground plane to prevent z-fighting

  return (
    <group position={[0, roadElevation, 0]}>
      {/* 1. Western Vertical Arterial Road (North to South) */}
      <mesh
        position={[-56, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[8.5, 190]} />
        <meshStandardMaterial color="#333942" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Western Road Centerline (dashed) */}
      {Array.from({ length: 18 }).map((_, i) => (
        <mesh
          key={`w-line-${i}`}
          position={[-56, 0.005, -85 + i * 10]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.2, 5]} />
          <meshBasicMaterial color="#e2e8f0" />
        </mesh>
      ))}

      {/* 2. Main Horizontal Facility Avenue (East-West across facility) */}
      <mesh
        position={[18, 0, -14]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[136, 7.5]} />
        <meshStandardMaterial color="#3a4049" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Main Avenue Centerline */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh
          key={`m-line-${i}`}
          position={[-44 + i * 9.5, 0.005, -14]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[5, 0.2]} />
          <meshBasicMaterial color="#e2e8f0" />
        </mesh>
      ))}

      {/* 3. Western Entrance Junction & Curve (linking Western Road to Main Avenue) */}
      <mesh
        position={[-53, 0, -12]}
        rotation={[-Math.PI / 2, 0, 0.25]}
        receiveShadow
      >
        <planeGeometry args={[12, 8.5]} />
        <meshStandardMaterial color="#383e47" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* 4. East Road Loop (curving around Eastern Solar Warehouse SOL-02) */}
      {/* North-East curve section */}
      <mesh
        position={[88, 0, -8]}
        rotation={[-Math.PI / 2, 0, -0.4]}
        receiveShadow
      >
        <planeGeometry args={[14, 7.5]} />
        <meshStandardMaterial color="#3a4049" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Eastern bypass vertical section */}
      <mesh
        position={[90, 0, 26]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[7.5, 62]} />
        <meshStandardMaterial color="#3a4049" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* South-East turnaround curve */}
      <mesh
        position={[86, 0, 60]}
        rotation={[-Math.PI / 2, 0, 0.4]}
        receiveShadow
      >
        <planeGeometry args={[16, 7.5]} />
        <meshStandardMaterial color="#3a4049" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* 5. Northern Service Spur (leading to Northern Solar Building SOL-07) */}
      <mesh
        position={[26, 0, -38]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[6.5, 42]} />
        <meshStandardMaterial color="#3f454f" roughness={0.75} metalness={0.1} />
      </mesh>

      {/* 6. Western Logistics Entrance Road (in front of Cold Storage STR-06) */}
      <mesh
        position={[-13, 0, 6]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[9, 32]} />
        <meshStandardMaterial color="#474e58" roughness={0.75} metalness={0.1} />
      </mesh>

      {/* Asphalt road curb borders (concrete edges) */}
      <mesh position={[18, 0.02, -18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[136, 0.35]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.8} />
      </mesh>
      <mesh position={[18, 0.02, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[136, 0.35]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.8} />
      </mesh>
    </group>
  );
};
