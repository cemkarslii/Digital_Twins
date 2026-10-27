import { Fragment, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Edges, Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { RackLane, WarehouseSection } from '../../../types/warehouse';
import { faceKey, getRackLanes, sectionFaces, type AisleFace } from '../../../data/warehouseLanes';
import { WAREHOUSE_CONFIG } from '../../../data/warehouseConfig';
import { getStorageLocations } from '../../../data/storageLocations';
import { useFactoryStore } from '../../../store/useFactoryStore';
import { laneColor, laneStatus, laneStock, useWarehouseStock } from '../../../store/useWarehouseStock';
import { Instanced } from '../interiorParts';
import { rackStockSlots, sectionRackParts } from './warehouseGeometry';
import { stockTint } from './stockTint';
import { RackLabels } from './RackLabels';
import { focusChanged, focusOf, focusRegion, inFocus, inRegion } from './focus';

const { pallet } = WAREHOUSE_CONFIG;
/**
 * Lane marker: a thin plate along the whole lane, and a block over its filled share from the back.
 * They stack, never overlap: the plate stands `lift` clear of the beams and the block sits on the
 * plate, `inset` narrower on each side. Two surfaces in one plane z-fight, and differently coloured
 * they flicker as the camera moves.
 */
const MARKER = { width: pallet.width - 0.06, plate: 0.05, block: 0.45, endGap: 0.1, lift: 0.01, inset: 0.015 };
const plateY = (lane: RackLane) => lane.y + MARKER.lift + MARKER.plate / 2;
const blockY = (lane: RackLane) => lane.y + MARKER.lift + MARKER.plate + MARKER.block / 2;
/** Under a block the plate takes a light tint of the lane colour, so the filled share stands out from the free one. */
const PLATE_TINT = 0.55;
const WHITE = new THREE.Color('#ffffff');

const laneLength = (lane: RackLane) => Math.abs(lane.frontX - lane.backX) - MARKER.endGap;

const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * One marker per lane of the section, coloured by laneColor: empty green, partly filled on the amber
 * ramp by pallet count (darker is fuller), full red, no data pale; only the lanes in focus are drawn. Two fixed-size instanced meshes; a WMS
 * flush or a focus change rewrites colours and sizes in place, without re-rendering React or
 * rebuilding the meshes.
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
    const base = new THREE.Color();

    const paint = () => {
      const stale = useWarehouseStock.getState().feed !== 'live';
      const focus = focusOf(useFactoryStore.getState());
      lanes.forEach((lane, i) => {
        const status = laneStatus(lane.index);
        stockTint(tint, laneColor(lane.index), stale);
        blockMesh.setColorAt(i, tint);
        // An empty or unknown lane has no block: its plate carries the full colour.
        plateMesh.setColorAt(i, status === 'empty' || status === 'unknown' ? tint : base.copy(tint).lerp(WHITE, PLATE_TINT));
        // Lanes out of focus collapse to nothing: not drawn, and out of the pointer's way.
        if (!inFocus(focus, lane, faces[i])) {
          plateMesh.setMatrixAt(i, HIDDEN);
          blockMesh.setMatrixAt(i, HIDDEN);
          return;
        }
        object.position.set((lane.frontX + lane.backX) / 2, plateY(lane), lane.z);
        object.scale.set(laneLength(lane), MARKER.plate, MARKER.width);
        object.updateMatrix();
        plateMesh.setMatrixAt(i, object.matrix);
        // Lanes fill from the back, so the block grows from the back end towards the aisle.
        const share = status === 'unknown' ? 0 : laneStock.count[lane.index] / laneStock.capacity[lane.index];
        const length = laneLength(lane) * Math.min(1, share);
        const toFront = Math.sign(lane.frontX - lane.backX);
        object.position.set(lane.backX + toFront * (MARKER.endGap / 2 + length / 2), blockY(lane), lane.z);
        object.scale.set(length, MARKER.block, MARKER.width - 2 * MARKER.inset);
        object.updateMatrix();
        blockMesh.setMatrixAt(i, length > 0 ? object.matrix : HIDDEN);
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
    const unsubscribeFocus = useFactoryStore.subscribe((state, previous) => { if (focusChanged(state, previous)) paint(); });
    return () => { unsubscribeStock(); unsubscribeFocus(); };
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

/**
 * Pallet seats drawn for a lane: its WMS count scaled to the drawn depth (the WMS capacity and the
 * modelled depth may differ), so a partly filled lane never looks empty or full.
 */
function seatsFilled(index: number, depth: number) {
  const status = laneStatus(index);
  if (status === 'unknown' || status === 'empty') return 0;
  if (status === 'full') return depth;
  return Math.min(depth - 1, Math.max(1, Math.round(laneStock.count[index] * depth / laneStock.capacity[index])));
}

/**
 * "Tüm kutular": every occupied position with its pallet and load, from the live WMS counts. Lanes
 * fill from the back, so a lane with n seats holds its n deepest positions. One pallet and one load
 * instance per position of the section, built once; a flush or a focus change only shows or hides
 * them. A load selects its lane.
 */
function StockLoads({ sectionId }: { sectionId: string }) {
  const slots = useMemo(() => {
    const laneIndex = new Map(getRackLanes().map((lane) => [lane.id, lane.index]));
    const locations = getStorageLocations().filter((location) => location.sectionId === sectionId);
    const { pallets, loads } = rackStockSlots(locations);
    const object = new THREE.Object3D();
    const matrix = (item: (typeof pallets)[number]) => {
      object.position.set(...item.position);
      object.scale.set(...item.scale);
      object.updateMatrix();
      return object.matrix.clone();
    };
    return locations.map((location, i) => {
      const lane = getRackLanes()[laneIndex.get(location.laneId)!];
      return { location, lane, face: faceKey(lane), pallet: matrix(pallets[i]), load: matrix(loads[i]), color: new THREE.Color(loads[i].color) };
    });
  }, [sectionId]);
  const pallets = useRef<THREE.InstancedMesh>(null);
  const loads = useRef<THREE.InstancedMesh>(null);
  const select = useFactoryStore((s) => s.selectWarehouseLane);

  useLayoutEffect(() => {
    const palletMesh = pallets.current, loadMesh = loads.current;
    if (!palletMesh || !loadMesh) return;
    slots.forEach((slot, i) => loadMesh.setColorAt(i, slot.color));
    if (loadMesh.instanceColor) loadMesh.instanceColor.needsUpdate = true;

    const paint = () => {
      const focus = focusOf(useFactoryStore.getState());
      for (const [i, { location, lane, face, pallet, load }] of slots.entries()) {
        const shown = inFocus(focus, lane, face)
          && location.laneDepth > location.laneLength - seatsFilled(lane.index, location.laneLength);
        palletMesh.setMatrixAt(i, shown ? pallet : HIDDEN);
        loadMesh.setMatrixAt(i, shown ? load : HIDDEN);
      }
      for (const mesh of [palletMesh, loadMesh]) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    };
    paint();
    const unsubscribeStock = useWarehouseStock.subscribe((state, previous) => {
      if (state.version !== previous.version) paint();
    });
    const unsubscribeFocus = useFactoryStore.subscribe((state, previous) => { if (focusChanged(state, previous)) paint(); });
    return () => { unsubscribeStock(); unsubscribeFocus(); };
  }, [slots]);

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 4 || event.instanceId === undefined) return;
    event.stopPropagation();
    select(slots[event.instanceId].lane.index);
  };
  return (
    <group>
      <instancedMesh ref={pallets} args={[undefined, undefined, slots.length]} receiveShadow onClick={onClick}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#a9814f" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={loads} args={[undefined, undefined, slots.length]} castShadow onClick={onClick}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="white" roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

const PIN_COLOR = '#2563eb';

/** Selected lane's outline reaches this far below the marker, into the beams, so its bottom shares no plane with them. */
const OUTLINE_BELOW = 0.03;

/**
 * Selected lane: an outline from its beam to just above a full block, and a pin standing above
 * the racks at the lane's front, so a lane on a low level is found from above too.
 */
function LaneHighlight({ lane, floorY }: { lane: RackLane; floorY: number }) {
  const height = OUTLINE_BELOW + MARKER.lift + MARKER.plate + MARKER.block + 0.3;
  const top = floorY + WAREHOUSE_CONFIG.rackSystem.uprightHeight + 1.6;
  const pinX = lane.frontX + Math.sign(lane.frontX - lane.backX) * 0.6;
  return (
    <group>
      <mesh position={[(lane.frontX + lane.backX) / 2, lane.y - OUTLINE_BELOW + height / 2, lane.z]} raycast={() => null}>
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
 * Racks and the aisle forklift of the one open section, with every lane's D·R·K label on the beam
 * in front. "Boş / dolu" shows a fill-coloured marker per lane on the beams alone, without uprights
 * and bracing, so the colours read through the rack; "Tüm kutular" shows the whole rack with every
 * pallet and load. A focus cuts the rack at a level, and to one face (see focus.ts); floor items
 * stay. Closed sections mount nothing.
 */
export function WarehouseRacks({ section, floorY }: { section: WarehouseSection; floorY: number }) {
  const steel = useMemo(() => sectionRackParts(section, floorY), [section, floorY]);
  const selectedIndex = useFactoryStore((s) => s.selectedWarehouseLane);
  const selected = selectedIndex === null ? undefined : getRackLanes()[selectedIndex];
  const level = useFactoryStore((s) => s.warehouseLevel);
  const faceId = useFactoryStore((s) => s.warehouseFace);
  const face = sectionFaces(section.id).find((item) => item.key === faceId);
  const stock = useFactoryStore((s) => s.warehouseView) === 'stock';
  const region = useMemo(() => focusRegion({ level, face: faceId }, section.id), [level, faceId, section.id]);
  const parts = useMemo(() => {
    const keep = (list: typeof steel.beams) => region ? list.filter((part) => inRegion(region, part.extent)) : list;
    return { uprights: keep(steel.uprights), bracing: keep(steel.bracing), beams: keep(steel.beams) };
  }, [steel, region]);
  return (
    <group>
      {stock && <Instanced items={parts.uprights} color="#2c5d8c" metalness={0.4} roughness={0.5} />}
      {stock && <Instanced items={parts.bracing} color="#3a6a96" metalness={0.4} roughness={0.5} />}
      <Instanced items={parts.beams} color="#e2772e" metalness={0.3} roughness={0.5} />
      <RackLabels section={section} />
      {stock ? <StockLoads sectionId={section.id} /> : <LaneMarkers sectionId={section.id} />}
      {selected?.sectionId === section.id && <LaneHighlight lane={selected} floorY={floorY} />}
      {face && <FaceHighlight face={face} floorY={floorY} />}
      <AisleSigns section={section} floorY={floorY} />
      <Instanced items={steel.guards} color="#e0b52a" roughness={0.55} />
      <Instanced items={steel.lines} color="#e2c23a" roughness={0.7} />
      {/* The aisle forklift would stand in front of the camera that drives up to a selected lane. */}
      {selectedIndex === null && (
        <>
          <Instanced items={steel.forklift.body} color="#e8b21f" roughness={0.45} metalness={0.15} castShadow />
          <Instanced items={steel.forklift.dark} color="#2b3134" roughness={0.6} metalness={0.3} />
          <Instanced items={steel.forklift.forks} color="#8c9294" roughness={0.4} metalness={0.6} />
          <Instanced items={steel.forklift.wheels} shape="cylinder" color="#1d2021" roughness={0.9} />
        </>
      )}
    </group>
  );
}
