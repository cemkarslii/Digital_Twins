import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { BuildingEntity } from '../../types/factory';
import { SolarPanelRoof } from './SolarPanelRoof';
import { useFactoryStore } from '../../store/useFactoryStore';
import { createBuildingTexture } from './buildingMaterials';
import { LOADING_DOCK } from '../../data/loadingDock';
import { OfficeFacade } from './OfficeFacade';

interface FactoryBuildingProps {
  building: BuildingEntity;
}

interface GableProps {
  span: number;
  length: number;
  rise: number;
  roofColor: string;
  wallColor: string;
  roofMap: THREE.Texture;
  wallMap: THREE.Texture;
  skylights: boolean;
  /** See-through roof for interior inspection; also stops it shadowing the interior. */
  xray?: boolean;
}

const XRAY_OPACITY = 0.14;

/** A closed gable in local space, with its ridge along Z. */
function GableRoof({ span, length, rise, roofColor, wallColor, roofMap, wallMap, skylights, xray = false }: GableProps) {
  const overhang = Math.min(0.24, span * 0.04);
  const halfRun = span / 2 + overhang;
  const fullRise = rise * halfRun / (span / 2);
  const pitch = Math.atan2(rise, span / 2);
  const slopeLength = Math.hypot(halfRun, fullRise);
  const endShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-span / 2, 0);
    shape.lineTo(span / 2, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    return shape;
  }, [span, rise]);
  // Keyed so the material is rebuilt when blending changes instead of mutated in place.
  const seeKey = xray ? 'xray' : 'solid';
  const see = { transparent: xray, opacity: xray ? XRAY_OPACITY : 1, depthWrite: !xray };

  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * halfRun / 2, rise - fullRise / 2, 0]}
            rotation={[0, 0, -side * pitch]}
            castShadow={!xray} receiveShadow
          >
            <boxGeometry args={[slopeLength, 0.1, length + overhang * 2]} />
            <meshStandardMaterial key={seeKey} {...see} color={roofColor} map={roofMap} bumpMap={roofMap} bumpScale={0.025} roughness={0.7} metalness={0.18} />
          </mesh>
          {/* The triangular facade closes the roof volume at both ridge ends. */}
          <mesh position={[0, 0, side * (length / 2 + 0.008)]} castShadow={!xray} receiveShadow>
            <shapeGeometry args={[endShape]} />
            <meshStandardMaterial key={seeKey} {...see} color={wallColor} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
          <mesh position={[side * (span / 2 + 0.14), -0.03, 0]} castShadow>
            <boxGeometry args={[0.18, 0.17, length + 0.2]} />
            <meshStandardMaterial color="#b4bbb8" metalness={0.5} roughness={0.5} />
          </mesh>
          {skylights && length > 12 && (
            <mesh
              position={[side * span * 0.24, rise * 0.52 + 0.065, 0]}
              rotation={[0, 0, -side * pitch]}
              receiveShadow
            >
              <boxGeometry args={[Math.min(0.75, span * 0.09), 0.025, length * 0.76]} />
              <meshStandardMaterial color="#d1d8d3" metalness={0.18} roughness={0.55} />
            </mesh>
          )}
        </group>
      ))}
      <mesh position={[0, rise + 0.045, 0]} castShadow={!xray}>
        <boxGeometry args={[Math.min(0.34, span * 0.08), 0.12, length + overhang * 2]} />
        <meshStandardMaterial key={seeKey} {...see} color="#c8ccc7" map={wallMap} metalness={0.45} roughness={0.5} />
      </mesh>
    </group>
  );
}

interface DockProps {
  span: number;
  wallHeight: number;
  shutterMap: THREE.Texture;
  coldStorage?: boolean;
}

function LoadingFacade({ span, wallHeight, shutterMap, coldStorage = false }: DockProps) {
  if (span < 8 || wallHeight < 3) return null;
  const doorWidth = Math.min(3.2, span * 0.2);
  const doorHeight = Math.min(3.6, wallHeight * 0.68);
  const count = LOADING_DOCK.doorCentersZ.length;
  const spacing = LOADING_DOCK.doorCentersZ[1] - LOADING_DOCK.doorCentersZ[0];
  const canopyWidth = Math.min(span - 1.5, (count - 1) * spacing + doorWidth + 1.4);
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <group key={index} position={[(index - (count - 1) / 2) * spacing, 0, 0]}>
          <mesh position={[0, doorHeight / 2 + 0.2, 0.06]} receiveShadow>
            <boxGeometry args={[doorWidth + 0.34, doorHeight + 0.3, 0.16]} />
            <meshStandardMaterial color="#414744" roughness={0.9} />
          </mesh>
          <mesh position={[0, doorHeight / 2 + 0.2, 0.15]} receiveShadow>
            <boxGeometry args={[doorWidth, doorHeight, 0.035]} />
            <meshStandardMaterial color={coldStorage ? '#b9bfba' : '#aeb5b1'} map={shutterMap} roughness={0.65} metalness={0.26} />
          </mesh>
          <mesh position={[0, 0.06, 0.6]} receiveShadow>
            <boxGeometry args={[doorWidth + 0.45, 0.12, 1.2]} />
            <meshStandardMaterial color="#9e9f95" roughness={0.95} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[side * (doorWidth / 2 + 0.12), 0.61, 0.22]}>
                <boxGeometry args={[0.18, 0.8, 0.2]} />
                <meshStandardMaterial color="#363b38" roughness={0.95} />
              </mesh>
              <mesh position={[side * (doorWidth / 2 + 0.58), LOADING_DOCK.floorY + 0.6, 0.75]} castShadow>
                <cylinderGeometry args={[0.065, 0.065, 1.2, 6]} />
                <meshStandardMaterial color="#d1a957" roughness={0.65} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, doorHeight + 0.62, 0.1]}>
            <boxGeometry args={[0.45, 0.2, 0.09]} />
            <meshStandardMaterial color="#d8d8cc" emissive="#fff4cd" emissiveIntensity={0.15} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, doorHeight + 0.85, 0.55]} rotation={[0.025, 0, 0]} castShadow>
        <boxGeometry args={[canopyWidth, 0.13, 1.4]} />
        <meshStandardMaterial color="#b8c0ba" metalness={0.3} roughness={0.65} />
      </mesh>
    </group>
  );
}

export const FactoryBuilding: React.FC<FactoryBuildingProps> = ({
  building,
}) => {
  const focusOnBuilding = useFactoryStore((s) => s.focusOnBuilding);
  const openLogisticsArea = useFactoryStore((s) => s.openLogisticsArea);
  const openSeedStorage = useFactoryStore((s) => s.openSeedStorage);
  const seedStorageOpen = useFactoryStore((s) => s.seedStorageOpen);
  const { width, depth, height } = building.dimensions;
  const effectiveWallColor = building.wallColor;
  const multiBay = building.roofType === 'gable_multi_bay' || building.roofType === 'skeletal_truss';
  const seedWarehouse = building.category === 'agri_storage';
  const xray = seedWarehouse && seedStorageOpen;
  const northSouthRidge = multiBay ? seedWarehouse : depth > width;
  const roofSpan = northSouthRidge ? width : depth;
  const roofLength = northSouthRidge ? depth : width;
  const bayCount = multiBay ? Math.max(1, Math.min(seedWarehouse ? 3 : 4, Math.floor(roofSpan / 5))) : 1;
  const baySpan = roofSpan / bayCount;
  const ridgeRise = Math.min(1.35, baySpan * 0.085);
  const pitched = multiBay || building.roofType === 'ridged_single_bay';
  const textures = useMemo(() => ({
    front: createBuildingTexture('cladding', Math.max(1, width / 1.5), Math.max(1, height / 4)),
    side: createBuildingTexture('cladding', Math.max(1, depth / 1.5), Math.max(1, height / 4)),
    roof: createBuildingTexture('roof', Math.max(1, baySpan / 12), Math.max(1, roofLength / 0.88)),
    flat: createBuildingTexture('roof', Math.max(1, width / 12), Math.max(1, depth / 0.88)),
    shutter: createBuildingTexture('shutter', 1, 2),
  }), [width, depth, height, baySpan, roofLength]);
  useEffect(() => () => Object.values(textures).forEach((texture) => texture.dispose()), [textures]);

  const groundY = -height / 2;
  const isSmallOffice = building.category === 'security_admin';
  const utility = building.category === 'utility_energy';
  const hasDocks = building.id === LOADING_DOCK.buildingId;
  const roofEquipmentScale = Math.min(1, width / 9, depth / 9, height / 5);

  if (!building.visible) return null;

  return (
    <group
      position={building.position}
      rotation={[0, building.rotationY ?? 0, 0]}
      onClick={building.id === 'bldg-09' || seedWarehouse ? (event) => {
        if (event.delta > 4) return;
        event.stopPropagation();
        if (seedWarehouse) openSeedStorage(building.id);
        else openLogisticsArea('gate_security');
      } : undefined}
      onDoubleClick={(e) => { e.stopPropagation(); focusOnBuilding(building.id); }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        {[0, 1, 2, 3, 4, 5].map((face) => (
          <meshStandardMaterial
            key={face}
            attach={`material-${face}`}
            visible={!(xray && face === 2)}
            color={face === 2 ? building.roofColor : effectiveWallColor}
            map={face === 2 || face === 3 ? null : face < 2 ? textures.side : textures.front}
            bumpMap={face === 2 || face === 3 ? null : face < 2 ? textures.side : textures.front}
            bumpScale={0.018}
            roughness={0.79}
            metalness={0.1}
          />
        ))}
      </mesh>
      <mesh position={[0, groundY + 0.24, 0]} receiveShadow>
        <boxGeometry args={[width + 0.16, Math.min(0.48, height * 0.2), depth + 0.16]} />
        <meshStandardMaterial color="#a5a69b" roughness={0.95} />
      </mesh>

      {/* Galvanized corner flashings and downpipes run from the eaves to the plinth. */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <group key={`${sx}-${sz}`}>
          <mesh position={[sx * (width / 2 + 0.035), 0, sz * (depth / 2 - 0.08)]}>
            <boxGeometry args={[0.09, height, 0.2]} />
            <meshStandardMaterial color="#bfc6bf" roughness={0.65} metalness={0.2} />
          </mesh>
          <mesh position={[sx * (width / 2 + 0.1), 0.12, sz * (depth / 2 - Math.min(0.65, depth * 0.12))]} castShadow>
            <cylinderGeometry args={[0.062, 0.062, Math.max(0.1, height - 0.4), 6]} />
            <meshStandardMaterial color="#a7b0aa" metalness={0.45} roughness={0.6} />
          </mesh>
        </group>
      )))}

      {pitched ? (
        <group position={[0, height / 2, 0]} rotation={[0, northSouthRidge ? 0 : Math.PI / 2, 0]}>
          {Array.from({ length: bayCount }, (_, index) => (
            <group key={index} position={[-roofSpan / 2 + baySpan * (index + 0.5), 0, 0]}>
              <GableRoof
                span={baySpan} length={roofLength} rise={ridgeRise}
                roofColor={building.roofColor} wallColor={effectiveWallColor}
                roofMap={textures.roof} wallMap={textures.front}
                skylights={multiBay && !seedWarehouse}
                xray={xray}
              />
            </group>
          ))}
        </group>
      ) : (
        <group position={[0, height / 2, 0]}>
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <boxGeometry args={[width + 0.1, 0.16, depth + 0.1]} />
            <meshStandardMaterial color={building.roofColor} map={textures.flat} bumpMap={textures.flat} bumpScale={0.02} roughness={0.75} metalness={0.15} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[0, 0.18, side * depth / 2]} castShadow>
                <boxGeometry args={[width + 0.16, 0.28, 0.16]} />
                <meshStandardMaterial color="#ccd0c7" roughness={0.65} metalness={0.15} />
              </mesh>
              <mesh position={[side * width / 2, 0.18, 0]} castShadow>
                <boxGeometry args={[0.16, 0.28, depth]} />
                <meshStandardMaterial color="#ccd0c7" roughness={0.65} metalness={0.15} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {building.roofType === 'solar_dense' && (
        <SolarPanelRoof roofWidth={width} roofDepth={depth} height={height / 2} pattern="dense" />
      )}
      {building.roofType === 'solar_striped' && (
        <SolarPanelRoof roofWidth={width} roofDepth={depth} height={height / 2} pattern="striped" />
      )}

      {hasDocks && (
        <group name="loading-dock-doors" position={[width / 2 + 0.025, groundY,
          (LOADING_DOCK.doorCentersZ[0] + LOADING_DOCK.doorCentersZ[1]) / 2 - building.position[2]]}
          rotation={[0, Math.PI / 2, 0]}>
          <LoadingFacade span={LOADING_DOCK.maxZ - LOADING_DOCK.minZ} wallHeight={height} shutterMap={textures.shutter} />
        </group>
      )}

      {building.officeFacade && (
        <group position={[0, groundY, 0]}>
          <OfficeFacade side={building.officeFacade} width={width} depth={depth} height={height} />
        </group>
      )}

      {/* A pedestrian door and glazed office windows stay within resized facades. */}
      {(isSmallOffice || utility) && width > 3 && height > 2.2 && (
        <group position={[-width / 2 + Math.min(1.8, width * 0.2), groundY, depth / 2 + 0.04]}>
          <mesh position={[0, 1.05, 0]}>
            <boxGeometry args={[0.95, 2.1, 0.08]} />
            <meshStandardMaterial color="#667570" roughness={0.7} />
          </mesh>
          <mesh position={[0.3, 1.02, 0.06]}>
            <boxGeometry args={[0.05, 0.15, 0.05]} />
            <meshStandardMaterial color="#c0c6bf" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      )}
      {isSmallOffice && width > 3 && depth > 3 && (
        <group>
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[side * (width / 2 + 0.035), height * 0.13, 0]}>
                <boxGeometry args={[0.08, height * 0.32, depth * 0.65]} />
                <meshStandardMaterial color="#526864" metalness={0.25} roughness={0.4} />
              </mesh>
              <mesh position={[0, height * 0.13, side * (depth / 2 + 0.04)]}>
                <boxGeometry args={[width * 0.5, height * 0.32, 0.08]} />
                <meshStandardMaterial color="#526864" metalness={0.25} roughness={0.4} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {utility && (
        <group position={[0, height / 2 + 0.2, 0]} scale={roofEquipmentScale}>
          {building.id === 'bldg-04' ? (
            <group>
              {[-1.8, 1.8].map((x) => (
                <group key={x} position={[x, 0, -1]}>
                  <mesh position={[0, 1.8, 0]} castShadow>
                    <cylinderGeometry args={[0.24, 0.29, 3.6, 12]} />
                    <meshStandardMaterial color="#aeb9b5" metalness={0.65} roughness={0.4} />
                  </mesh>
                  <mesh position={[0, 3.62, 0]} castShadow>
                    <cylinderGeometry args={[0.36, 0.36, 0.1, 12]} />
                    <meshStandardMaterial color="#6f7b76" metalness={0.6} roughness={0.4} />
                  </mesh>
                </group>
              ))}
            </group>
          ) : (
            <group>
              {[-2, 2].map((x) => (
                <group key={x} position={[x, 0, 0]}>
                  <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.8, 1.45, 4]} />
                    <meshStandardMaterial color="#a5afa8" map={textures.front} roughness={0.62} metalness={0.3} />
                  </mesh>
                  {[-1, 1].map((z) => (
                    <group key={z} position={[0, 1.48, z]}>
                      <mesh castShadow>
                        <cylinderGeometry args={[0.69, 0.69, 0.18, 16]} />
                        <meshStandardMaterial color="#66746c" metalness={0.45} roughness={0.6} />
                      </mesh>
                      <mesh position={[0, 0.1, 0]}>
                        <cylinderGeometry args={[0.55, 0.55, 0.025, 16]} />
                        <meshStandardMaterial color="#303e38" roughness={0.8} />
                      </mesh>
                    </group>
                  ))}
                </group>
              ))}
            </group>
          )}
        </group>
      )}

    </group>
  );
};
