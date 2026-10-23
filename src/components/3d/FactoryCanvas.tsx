import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraController } from './CameraController';
import { FactoryGround } from './FactoryGround';
import { CampusRoads } from './CampusRoads';
import { CampusParking } from './CampusParking';
import { CampusVehicles } from './CampusVehicles';
import { WeighbridgeStation } from './WeighbridgeStation';
import { InboundApproach } from './InboundApproach';
import { LoadingDocks } from './LoadingDocks';
import { SeedStorageInteriors } from './SeedStorageInteriors';
import { CampusInfrastructure } from './CampusInfrastructure';
import { FactoryBuilding } from './FactoryBuilding';
import { CampusLandscape } from './CampusLandscape';
import { CampusAnnotations } from './CampusAnnotations';
import { useFactoryStore } from '../../store/useFactoryStore';
import { CAMPUS_CAMERA_POSITION } from '../../data/cameraPresets';
import { LoadingRamp } from './LoadingRamp';

export function FactoryCanvas() {
  const buildings = useFactoryStore((s) => s.buildings);
  return (
    <div className="relative h-full w-full select-none bg-[#b2b6ac]">
      <Canvas shadows dpr={[1, 1.75]}
        camera={{ position: CAMPUS_CAMERA_POSITION, fov: 45, near: 2, far: 2400 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, outputColorSpace: THREE.SRGBColorSpace }}>
        <Suspense fallback={null}>
          <color attach="background" args={['#b2b6ac']} />
          <fog attach="fog" args={['#b2b6ac', 1200, 2300]} />
          <CameraController />
          <ambientLight color="#fff4df" intensity={0.55} />
          <hemisphereLight color="#dce7ec" groundColor="#737456" intensity={0.75} />
          <directionalLight position={[-200, 290, -130]} intensity={2.3} color="#fff1d9" castShadow
            shadow-mapSize-width={4096} shadow-mapSize-height={4096}
            shadow-bias={-0.0004} shadow-normalBias={0.12}
            shadow-camera-near={10} shadow-camera-far={900}
            shadow-camera-left={-330} shadow-camera-right={330}
            shadow-camera-top={300} shadow-camera-bottom={-300} />
          <directionalLight position={[-80, 70, -70]} intensity={0.2} color="#cbd5e1" />
          <FactoryGround />
          <CampusLandscape />
          <CampusRoads />
          <LoadingRamp />
          <CampusParking />
          {buildings.map((building) => <FactoryBuilding key={building.id} building={building} />)}
          <SeedStorageInteriors />
          <CampusVehicles />
          <LoadingDocks />
          <CampusInfrastructure />
          <WeighbridgeStation />
          <InboundApproach />
          <CampusAnnotations />
        </Suspense>
      </Canvas>
    </div>
  );
}
