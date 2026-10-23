import { useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { bankCenter, DOCK_BANKS, DOCK_HIGH, faceRotation } from '../../data/dockBanks';
import { useFactoryStore } from '../../store/useFactoryStore';
import { useDockDoors } from '../../hooks/useDockDoors';
import type { DockBank, DockDoorState } from '../../types/docks';
import { createBuildingTexture } from './buildingMaterials';
import { SEMI_REAR_OFFSET, TruckModel } from './CampusVehicles';

// Gap between wall and trailer rear: bumper face on dock-high doors, the court sill when recessed.
const TRUCK_GAP = { dock_high: 0.45, recessed: 0.65 } as const;
const CAB_COLORS = ['#e1e3dc', '#ae3b30', '#35536b', '#e5e5df', '#a83b31', '#d9ded9', '#4f6b52'];
const { sill: SILL, doorWidth: DOOR_W, doorHeight: DOOR_H, spacing: SPACING } = DOCK_HIGH;

type Signal = 'go' | 'stop' | 'off';
const signalOf = (state: DockDoorState | undefined): Signal =>
  state?.record?.state === 'free' ? 'go' : state?.record?.state === 'occupied' ? 'stop' : 'off';

/** Wall-mounted red/green light beside a door, facing the apron. Door-local frame, +Z outward. */
function DockSignal({ signal, y }: { signal: Signal; y: number }) {
  return (
    <group position={[DOOR_W / 2 + 0.8, y + 1.9, 0.07]}>
      <mesh>
        <boxGeometry args={[0.22, 0.5, 0.12]} />
        <meshStandardMaterial color="#22282b" roughness={0.6} />
      </mesh>
      {([[0.12, '#e5483a', 'stop'], [-0.12, '#3ccf6e', 'go']] as const).map(([dy, color, lit]) => (
        <mesh key={lit} position={[0, dy, 0.065]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={signal === lit ? 2.2 : 0} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** One dock-high door: sectional door, shelter, bumpers, wheel guides. Door-local frame, +Z outward. */
function DockHighDoor({ state, shutter }: { state: DockDoorState | undefined; shutter: THREE.Texture }) {
  const record = state?.record;
  const open = record?.state === 'occupied';
  return (
    <group>
      <mesh position={[0, SILL + DOOR_H / 2, 0.05]}>
        <boxGeometry args={[DOOR_W + 0.3, DOOR_H + 0.2, 0.1]} />
        <meshStandardMaterial color="#414744" roughness={0.9} />
      </mesh>
      {open ? (
        <>
          {/* Raised door: dark opening below the coiled panel, leveler lip resting in the trailer. */}
          <mesh position={[0, SILL + DOOR_H / 2, 0.11]}>
            <boxGeometry args={[DOOR_W, DOOR_H, 0.02]} />
            <meshStandardMaterial color="#232826" roughness={1} />
          </mesh>
          <mesh position={[0, SILL + DOOR_H - 0.25, 0.13]}>
            <boxGeometry args={[DOOR_W, 0.5, 0.05]} />
            <meshStandardMaterial color="#aeb5b1" map={shutter} roughness={0.65} metalness={0.26} />
          </mesh>
          <mesh position={[0, SILL + 0.02, 0.28]}>
            <boxGeometry args={[DOOR_W * 0.72, 0.04, 0.5]} />
            <meshStandardMaterial color="#7d8580" metalness={0.5} roughness={0.5} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, SILL + DOOR_H / 2, 0.12]}>
          <boxGeometry args={[DOOR_W, DOOR_H, 0.04]} />
          <meshStandardMaterial color="#aeb5b1" map={shutter} roughness={0.65} metalness={0.26} />
        </mesh>
      )}

      {/* Foam shelter: two side pads and a header seal around the trailer. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (DOOR_W / 2 + 0.32), SILL + DOOR_H / 2 + 0.1, 0.3]} castShadow>
          <boxGeometry args={[0.45, DOOR_H + 0.6, 0.6]} />
          <meshStandardMaterial color="#2a2d2c" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, SILL + DOOR_H + 0.4, 0.3]} castShadow>
        <boxGeometry args={[DOOR_W + 1.09, 0.55, 0.6]} />
        <meshStandardMaterial color="#2a2d2c" roughness={0.95} />
      </mesh>

      {/* Rubber bumpers; the trailer rear stops against them. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.05, SILL - 0.3, TRUCK_GAP.dock_high - 0.07]}>
          <boxGeometry args={[0.25, 0.45, 0.14]} />
          <meshStandardMaterial color="#1c1f1e" roughness={0.9} />
        </mesh>
      ))}

      {/* Yellow wheel guides centre the trailer on the door. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.62, 0.11, 2.6]} castShadow>
          <boxGeometry args={[0.18, 0.22, 4]} />
          <meshStandardMaterial color="#d9a92b" roughness={0.6} />
        </mesh>
      ))}

      {/* Work light under the canopy. */}
      <mesh position={[0, SILL + DOOR_H + 1.02, 1.1]}>
        <boxGeometry args={[0.42, 0.1, 0.26]} />
        <meshStandardMaterial color="#d8d8cc" emissive="#fff4cd" emissiveIntensity={open ? 0.6 : 0.12} />
      </mesh>

      {record?.state === 'out_of_service' && (
        // Folding barrier in front of a door that must not be used.
        <group position={[0, 0, 1.6]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 1.3, 0.5, 0]}>
              <boxGeometry args={[0.08, 1, 0.08]} />
              <meshStandardMaterial color="#d9dbd4" roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[2.7, 0.22, 0.06]} />
            <meshStandardMaterial color="#c8352b" roughness={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Plinth, canopy, stall markings and end bollards shared by a dock-high bank. Bank-local frame. */
function DockHighApron({ bank }: { bank: DockBank }) {
  const width = bank.doors.length * SPACING;
  return (
    <group>
      <mesh position={[0, SILL / 2, 0.15]} receiveShadow castShadow>
        <boxGeometry args={[width, SILL, 0.3]} />
        <meshStandardMaterial color="#a3a49a" roughness={0.95} />
      </mesh>
      <mesh position={[0, SILL + DOOR_H + 1.15, 0.85]} rotation={[0.03, 0, 0]} castShadow>
        <boxGeometry args={[width, 0.15, 1.7]} />
        <meshStandardMaterial color="#b8c0ba" metalness={0.3} roughness={0.65} />
      </mesh>
      {Array.from({ length: bank.doors.length + 1 }, (_, index) => (
        <mesh key={index} position={[-width / 2 + index * SPACING, 0.03, 0.5 + bank.stallLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, bank.stallLength]} />
          <meshBasicMaterial color="#e2dfcc" />
        </mesh>
      ))}
      {/* Stop bar across the stall mouths. */}
      <mesh position={[0, 0.03, 0.5 + bank.stallLength]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, 0.3]} />
        <meshBasicMaterial color="#d7b762" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 + 0.35), 0.55, 0.7]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 1.1, 12]} />
          <meshStandardMaterial color="#e0b52a" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function BankLabel({ bank, states, selected, onSelect }: {
  bank: DockBank; states: Map<string, DockDoorState>; selected: boolean; onSelect: () => void;
}) {
  const doors = bank.doors.map((door) => states.get(door.id));
  const occupied = doors.filter((state) => state?.record?.state === 'occupied').length;
  const overrun = doors.some((state) => (state?.assessment?.overrunMinutes ?? 0) > 0);
  const [x, , z] = bankCenter(bank);
  const [nx, nz] = bank.doors[0].normal;
  const out = bank.style === 'recessed' ? 16 : bank.stallLength + 6;
  return (
    <Html center position={[x + nx * out, 9, z + nz * out]} zIndexRange={[12, 0]}>
      <button
        className={`seed-depot-label${overrun ? ' dock-label-alert' : ''}`}
        aria-pressed={selected}
        onClick={onSelect}
        title={`${bank.name} rampasına odaklan`}
      >
        <strong>{bank.code}</strong>
        <small>{occupied}/{bank.doors.length} dolu</small>
      </button>
    </Html>
  );
}

/**
 * Truck dock doors from the dock layout, with their live state: signal lights, door position and
 * the trucks standing at occupied doors. The recessed EK-03 court draws its own doors (LoadingRamp,
 * FactoryBuilding); this adds its signals and trucks.
 */
export function LoadingDocks() {
  const docksOpen = useFactoryStore((s) => s.docksOpen);
  const selectedBankId = useFactoryStore((s) => s.selectedDockBankId);
  const openDocks = useFactoryStore((s) => s.openDocks);
  const state = useDockDoors();
  const shutter = useMemo(() => createBuildingTexture('shutter', 1, 2), []);
  useEffect(() => () => shutter.dispose(), [shutter]);

  const states = useMemo(() => new Map(
    state.phase === 'ready' ? state.doors.map((item) => [item.door.id, item]) : [],
  ), [state]);

  return (
    <group>
      {DOCK_BANKS.map((bank) => {
        const [cx, cy, cz] = bankCenter(bank);
        const rotation = faceRotation(bank.doors[0].normal);
        const select = (event: ThreeEvent<MouseEvent>) => {
          if (event.delta > 4) return;
          event.stopPropagation();
          openDocks(bank.id);
        };
        return (
          <group key={bank.id} onClick={select}>
            {bank.style === 'dock_high' && (
              <group position={[cx, cy, cz]} rotation={[0, rotation, 0]}>
                <DockHighApron bank={bank} />
              </group>
            )}
            {bank.doors.map((door, index) => {
              const doorState = states.get(door.id);
              const [x, y, z] = door.position;
              const [nx, nz] = door.normal;
              const reach = SEMI_REAR_OFFSET + TRUCK_GAP[bank.style];
              return (
                <group key={door.id}>
                  <group position={door.position} rotation={[0, rotation, 0]}>
                    {bank.style === 'dock_high' && <DockHighDoor state={doorState} shutter={shutter} />}
                    <DockSignal signal={signalOf(doorState)} y={bank.style === 'dock_high' ? SILL : 0} />
                  </group>
                  {doorState?.record?.state === 'occupied' && (
                    <group position={[x + nx * reach, y + 0.02, z + nz * reach]} rotation={[0, Math.atan2(-nx, -nz), 0]}>
                      <TruckModel truck={{
                        vehicleType: 'semi_trailer',
                        cabColor: CAB_COLORS[(index * 3 + bank.code.length) % CAB_COLORS.length],
                        trailerColor: index % 3 === 0 ? '#d2d8d6' : '#eef0e8',
                      }} />
                    </group>
                  )}
                </group>
              );
            })}
            {docksOpen && state.phase === 'ready' && (
              <BankLabel bank={bank} states={states} selected={bank.id === selectedBankId} onSelect={() => openDocks(bank.id)} />
            )}
          </group>
        );
      })}
    </group>
  );
}
