import { Fragment, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Edges, Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { LaneStatus, RackLane, WarehouseSection } from '../../../types/warehouse';
import { faceKey, getRackLanes, sectionFaces, type AisleFace } from '../../../data/warehouseLanes';
import { WAREHOUSE_CONFIG } from '../../../data/warehouseConfig';
import { useFactoryStore } from '../../../store/useFactoryStore';
import { LANE_STATUSES, laneStatus, laneStock, useWarehouseStock } from '../../../store/useWarehouseStock';
import { Instanced } from '../interiorParts';
import { sectionRackParts } from './warehouseGeometry';
import { stockTint } from './stockTint';
import { RackLabels } from './RackLabels';

const { stockColors, pallet } = WAREHOUSE_CONFIG;
/** Lane marker: a thin plate along the whole lane, and a block over its filled share from the back. */
const MARKER = { width: pallet.width - 0.06, plate: 0.05, block: 0.45, endGap: 0.1 };
const COLORS = Object.fromEntries(LANE_STATUSES.map((status) => [status, new THREE.Color(stockColors[status])])) as Record<LaneStatus, THREE.Color>;

const laneLength = (lane: RackLane) => Math.abs(lane.frontX - lane.backX) - MARKER.endGap;

/**
 * One marker per lane of the section, coloured by its WMS state: empty green, partly filled amber,
 * full red, no data pale; only the chosen level and aisle face when they are chosen. Two instanced
 * meshes of fixed size; a WMS flush or a level change rewrites colours and sizes in place, without
 * re-rendering React or rebuilding the meshes.
 */
function LaneMarkers({ sectionId }: { sectionId: string }) {
  const lanes = useMemo(() => getRackLanes().filter((lane) => lane.sectionId === sectionId), [sectionId]);
  const faces = useMemo(() => lanes.map(faceKey), [lanes]);
  const plates = useRef<THREE.InstancedMesh>(null);
  const blocks = useRef<THREE.InstancedMesh>(null);
  const select = useFactoryStore((s) => s.selectWarehouseLane);

  useLayoutEffect(() => {
    const plateMesh = plates.current, blockMesh = blocks.current;
    if (!plateMesh || !blockMesh) return;
    const object = new THREE.Object3D();
    const tint = new THREE.Color();

    const paint = () => {
      const stale = useWarehouseStock.getState().feed !== 'live';
      const { warehouseLevel: level, warehouseFace: face } = useFactoryStore.getState();
      lanes.forEach((lane, i) => {
        // Lanes off the chosen level or face collapse to nothing: hidden, and out of the pointer's way.
        const shown = (level === null || lane.level === level) && (face === null || faces[i] === face);
        object.position.set((lane.frontX + lane.backX) / 2, lane.y + MARKER.plate / 2, lane.z);
        if (shown) object.scale.set(laneLength(lane), MARKER.plate, MARKER.width);
        else object.scale.set(0, 0, 0);
        object.updateMatrix();
        plateMesh.setMatrixAt(i, object.matrix);

        const status = laneStatus(lane.index);
        stockTint(tint, COLORS[status], stale);
        plateMesh.setColorAt(i, tint);
        blockMesh.setColorAt(i, tint);
        // Lanes fill from the back, so the block grows from the back end towards the aisle.
        const share = status === 'unknown' ? 0 : laneStock.count[lane.index] / laneStock.capacity[lane.index];
        const length = laneLength(lane) * Math.min(1, share);
        const toFront = Math.sign(lane.frontX - lane.backX);
        object.position.set(lane.backX + toFront * (MARKER.endGap / 2 + length / 2), lane.y + MARKER.block / 2, lane.z);
        if (shown && length > 0) object.scale.set(length, MARKER.block, MARKER.width);
        else object.scale.set(0, 0, 0);
        object.updateMatrix();
        blockMesh.setMatrixAt(i, object.matrix);
      });
      for (const mesh of [plateMesh, blockMesh]) {
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    };
    paint();
    const unsubscribeStock = useWarehouseStock.subscribe((state, previous) => {
      if (state.version !== previous.version || state.feed !== previous.feed) paint();
    });
    const unsubscribeLevel = useFactoryStore.subscribe((state, previous) => {
      if (state.warehouseLevel !== previous.warehouseLevel || state.warehouseFace !== previous.warehouseFace) paint();
    });
    return () => { unsubscribeStock(); unsubscribeLevel(); };
  }, [lanes, faces]);

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 4 || event.instanceId === undefined) return;
    event.stopPropagation();
    select(lanes[event.instanceId].index);
  };
  return (
    <group>
      <instancedMesh ref={plates} args={[undefined, undefined, lanes.length]} receiveShadow onClick={onClick}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="white" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={blocks} args={[undefined, undefined, lanes.length]} onClick={onClick}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="white" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

const PIN_COLOR = '#2563eb';

/**
 * Selected lane: an outline from its beam to just above a full block, and a pin standing above
 * the racks at the lane's front, so a lane on a low level is found from above too.
 */
function LaneHighlight({ lane, floorY }: { lane: RackLane; floorY: number }) {
  const height = MARKER.block + 0.3;
  const top = floorY + WAREHOUSE_CONFIG.rackSystem.uprightHeight + 1.6;
  const pinX = lane.frontX + Math.sign(lane.frontX - lane.backX) * 0.6;
  return (
    <group>
      <mesh position={[(lane.frontX + lane.backX) / 2, lane.y + height / 2, lane.z]} raycast={() => null}>
        <boxGeometry args={[laneLength(lane) + 0.2, height, MARKER.width + 0.16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        <Edges color={PIN_COLOR} />
      </mesh>
      <mesh position={[pinX, (lane.y + top) / 2, lane.z]} raycast={() => null}>
        <cylinderGeometry args={[0.05, 0.05, top - lane.y, 8]} />
        <meshBasicMaterial color={PIN_COLOR} />
      </mesh>
      <mesh position={[pinX, top + 0.35, lane.z]} raycast={() => null}>
        <sphereGeometry args={[0.35, 16, 12]} />
        <meshBasicMaterial color={PIN_COLOR} />
      </mesh>
    </group>
  );
}

const SIDE_LABEL = { west: 'BATI', east: 'DOĞU' } as const;

/**
 * Sign above the rack ends at every aisle mouth: the aisle and the bin numbers on each of its faces.
 * Each half shows that face alone and looks along it; pressed again, it shows every face.
 */
function AisleSigns({ section, floorY }: { section: WarehouseSection; floorY: number }) {
  const face = useFactoryStore((s) => s.warehouseFace);
  const setFace = useFactoryStore((s) => s.setWarehouseFace);
  const faces = sectionFaces(section.id);
  const y = floorY + WAREHOUSE_CONFIG.rackSystem.uprightHeight + 1.4;
  return (
    <>
      {section.aisles.map((aisle) => {
        const sides = faces.filter((item) => item.aisleId === aisle.id);
        if (!sides.length) return null;
        const mouthZ = sides[0].startZ - Math.sign(sides[0].endZ - sides[0].startZ) * 1.2;
        return (
          <Html key={aisle.id} center position={[aisle.centerX, y, mouthZ]} zIndexRange={[11, 0]}>
            <div className="warehouse-aisle-sign">
              {sides.map((side, i) => (
                <Fragment key={side.key}>
                  {i === 1 && <strong>{aisle.id.slice(-2)}</strong>}
                  <button aria-pressed={face === side.key} onClick={() => setFace(face === side.key ? null : side.key, face !== side.key)}
                    title={`${aisle.id.slice(-2)} ${SIDE_LABEL[side.side].toLowerCase()} yüzü: göz ${side.firstSlot}–${side.lastSlot}`}>
                    <span>{SIDE_LABEL[side.side]}<small>{side.firstSlot}–{side.lastSlot}</small></span>
                  </button>
                </Fragment>
              ))}
            </div>
          </Html>
        );
      })}
    </>
  );
}

/** Floor band along the chosen face, on its aisle side. */
function FaceHighlight({ face, floorY }: { face: AisleFace; floorY: number }) {
  const out = Math.sign(face.frontX - face.backX);
  const pitch = WAREHOUSE_CONFIG.rackSystem.positionPitch;
  const minZ = Math.min(face.startZ, face.endZ) - pitch / 2, maxZ = Math.max(face.startZ, face.endZ) + pitch / 2;
  return (
    <mesh position={[face.frontX + out * 0.35, floorY + 0.035, (minZ + maxZ) / 2]} raycast={() => null}>
      <boxGeometry args={[0.3, 0.02, maxZ - minZ]} />
      <meshBasicMaterial color={PIN_COLOR} />
    </mesh>
  );
}

/**
 * Racks and the aisle forklift of the one open section, with a live marker on every lane and its
 * D·R·K label on the beam in front.
 * Closed sections mount nothing.
 */
export function WarehouseRacks({ section, floorY }: { section: WarehouseSection; floorY: number }) {
  const steel = useMemo(() => sectionRackParts(section, floorY), [section, floorY]);
  const selectedIndex = useFactoryStore((s) => s.selectedWarehouseLane);
  const selected = selectedIndex === null ? undefined : getRackLanes()[selectedIndex];
  const faceId = useFactoryStore((s) => s.warehouseFace);
  const face = sectionFaces(section.id).find((item) => item.key === faceId);
  return (
    <group>
      <Instanced items={steel.uprights} color="#2c5d8c" metalness={0.4} roughness={0.5} />
      <Instanced items={steel.bracing} color="#3a6a96" metalness={0.4} roughness={0.5} />
      <Instanced items={steel.beams} color="#e2772e" metalness={0.3} roughness={0.5} />
      <Instanced items={steel.guards} color="#e0b52a" roughness={0.55} />
      <Instanced items={steel.lines} color="#e2c23a" roughness={0.7} />
      <RackLabels section={section} />
      <LaneMarkers sectionId={section.id} />
      {selected?.sectionId === section.id && <LaneHighlight lane={selected} floorY={floorY} />}
      {face && <FaceHighlight face={face} floorY={floorY} />}
      <AisleSigns section={section} floorY={floorY} />
      <Instanced items={steel.forklift.body} color="#e8b21f" roughness={0.45} metalness={0.15} castShadow />
      <Instanced items={steel.forklift.dark} color="#2b3134" roughness={0.6} metalness={0.3} />
      <Instanced items={steel.forklift.forks} color="#8c9294" roughness={0.4} metalness={0.6} />
      <Instanced items={steel.forklift.wheels} shape="cylinder" color="#1d2021" roughness={0.9} />
    </group>
  );
}
