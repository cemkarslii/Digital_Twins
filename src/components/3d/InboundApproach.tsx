import { useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMPUS_ENTRY_ROAD_ID, PUBLIC_ROAD_ID, useFactoryStore } from '../../store/useFactoryStore';
import { useInboundTraffic } from '../../hooks/useInboundTraffic';
import { SITE_BOUNDARY } from '../../data/sitePlan';
import { bearingGap, compass, sceneBearing } from '../../data/compass';
import type { InboundItem } from '../../types/inbound';

type Point = [number, number];

const CHEVRON_SPACING = 10;
const CHEVRON_COUNT = 5;
const CHEVRON_SPEED = 5;
const END_INSET = 6;
/** How far out from the junction each approach arm is drawn along the public road. */
const ARM_LENGTH = 70;

const time = new Intl.DateTimeFormat('tr-TR', { timeStyle: 'short', timeZone: 'Europe/Istanbul' });

/** First crossing of a polyline with the site boundary, with the polyline's unit direction there. */
function boundaryCrossing(points: Point[]): { point: Point; direction: Point } | null {
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1], [bx, bz] = points[i];
    for (let j = 0; j < SITE_BOUNDARY.length; j++) {
      const [cx, cz] = SITE_BOUNDARY[j], [dx, dz] = SITE_BOUNDARY[(j + 1) % SITE_BOUNDARY.length];
      const denominator = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx);
      if (Math.abs(denominator) < 1e-9) continue;
      const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / denominator;
      const u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / denominator;
      if (t < 0 || t > 1 || u < 0 || u > 1) continue;
      const length = Math.hypot(bx - ax, bz - az);
      return { point: [ax + (bx - ax) * t, az + (bz - az) * t], direction: [(bx - ax) / length, (bz - az) / length] };
    }
  }
  return null;
}

/** Flat chevron pointing along local −Z, about 4.4 m wide: legible from the overview, inside one lane. */
function chevronGeometry() {
  const shape = new THREE.Shape([
    new THREE.Vector2(-1.3, -0.9), new THREE.Vector2(0, 0.5), new THREE.Vector2(1.3, -0.9),
    new THREE.Vector2(1.3, -0.2), new THREE.Vector2(0, 1.2), new THREE.Vector2(-1.3, -0.2),
  ]);
  return new THREE.ShapeGeometry(shape).scale(1.7, 1.7, 1).rotateX(-Math.PI / 2);
}

interface ApproachEnd {
  /** Start of the approach arm on the public road, toward the map edge. */
  point: Point;
  /** Unit direction from the map edge toward the campus junction. */
  inward: Point;
  /** Compass bearing from the junction out to this end. */
  bearing: number;
}

/** Inbound-lane chevrons drifting from the map edge toward the junction: direction of flow, not vehicles. */
function FlowChevrons({ end, laneOffset, geometry }: { end: ApproachEnd; laneOffset: number; geometry: THREE.BufferGeometry }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const [ix, iz] = end.inward;
  // Right-hand traffic: the inbound lane is right of the direction of travel.
  const ox = end.point[0] - iz * laneOffset, oz = end.point[1] + ix * laneOffset;
  useFrame(({ clock }) => {
    const shift = (clock.elapsedTime * CHEVRON_SPEED) % CHEVRON_SPACING;
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const s = END_INSET + index * CHEVRON_SPACING + shift;
      mesh.position.set(ox + ix * s, 0.16, oz + iz * s);
      const material = mesh.material as THREE.MeshBasicMaterial;
      // Fade in at the map edge and out toward the end of the run.
      material.opacity = 0.85 * Math.min(1, (s - END_INSET) / 4, (END_INSET + CHEVRON_SPACING * CHEVRON_COUNT - s) / 6);
    });
  });
  return (
    <group>
      {Array.from({ length: CHEVRON_COUNT }, (_, index) => (
        <mesh key={index} ref={(mesh) => { refs.current[index] = mesh; }} geometry={geometry}
          rotation={[0, Math.atan2(-ix, -iz), 0]} raycast={() => null}>
          {/* Pulled further toward the camera than the road surface's own offset, so it holds at distance. */}
          <meshBasicMaterial color="#5fd0b0" transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
        </mesh>
      ))}
    </group>
  );
}

/** Plate camera over the inbound lane and a message sign facing arriving drivers. Local +Z points out of the campus. */
function EntryCheckpoint({ half, arrivals, showBoard }: { half: number; arrivals: InboundItem[]; showBoard: boolean }) {
  const poleX = half + 1.1;
  return (
    <group>
      {/* ANPR gantry: pole on the inbound side, arm over the lane, camera reading front plates. */}
      <mesh position={[poleX, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 6.4, 10]} />
        <meshStandardMaterial color="#7b8481" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[poleX - (half + 1.1) / 2, 6.2, 0]} castShadow>
        <boxGeometry args={[half + 1.1, 0.14, 0.14]} />
        <meshStandardMaterial color="#7b8481" metalness={0.5} roughness={0.5} />
      </mesh>
      <group position={[half / 2, 5.85, 0.1]} rotation={[0.35, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.3, 0.75]} />
          <meshStandardMaterial color="#e8eae5" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0, 0.38]}>
          <boxGeometry args={[0.26, 0.22, 0.02]} />
          <meshStandardMaterial color="#141a1c" emissive="#7a1d14" emissiveIntensity={0.6} roughness={0.3} />
        </mesh>
      </group>
      <mesh position={[poleX + 0.7, 0.6, 0]} castShadow>
        <boxGeometry args={[0.6, 1.2, 0.45]} />
        <meshStandardMaterial color="#c9ccc4" roughness={0.6} />
      </mesh>

      {/* Variable message sign ahead of the gate, readable on approach; short of the public road. */}
      <group position={[half + 3, 0, 9]}>
        {[-1.6, 1.6].map((x) => (
          <mesh key={x} position={[x, 2.2, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 4.4, 8]} />
            <meshStandardMaterial color="#7b8481" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 4.6, 0]} castShadow>
          <boxGeometry args={[4.2, 1.9, 0.22]} />
          <meshStandardMaterial color="#1d2326" roughness={0.5} />
        </mesh>
        <mesh position={[0, 4.6, 0.115]}>
          <planeGeometry args={[3.9, 1.6]} />
          <meshStandardMaterial color="#0f1714" emissive="#145c3c" emissiveIntensity={0.55} roughness={0.4} />
        </mesh>
        {showBoard && (
          <Html position={[0, 6, 0]} center zIndexRange={[11, 0]}>
            <div className="entry-vms">
              <small>SIRADAKİ VARIŞLAR</small>
              {arrivals.length === 0 && <span>Beklenen araç yok</span>}
              {arrivals.map(({ vehicle, assessment }) => (
                <span key={vehicle.id}>
                  <strong>{vehicle.licensePlate}</strong>
                  <em>{time.format(new Date(vehicle.estimatedArrivalAt))}</em>
                  <i>{assessment.minutesToArrival} dk</i>
                </span>
              ))}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

/**
 * The campus's link to public roads: the junction with the public road, the boundary checkpoint
 * and, in inbound mode, where each truck will arrive from. Trucks are never drawn on the map;
 * their real positions are tens or hundreds of kilometres away. Each is assigned to the public
 * road end nearest its true bearing from the gate.
 */
export function InboundApproach() {
  const roads = useFactoryStore((s) => s.roads);
  const open = useFactoryStore((s) => s.inboundOpen);
  const openInbound = useFactoryStore((s) => s.openInbound);
  const closeInbound = useFactoryStore((s) => s.closeInbound);
  const state = useInboundTraffic();
  const chevron = useMemo(chevronGeometry, []);

  const entryRoad = roads.find((road) => road.id === CAMPUS_ENTRY_ROAD_ID);
  const publicRoad = roads.find((road) => road.id === PUBLIC_ROAD_ID);
  const layout = useMemo(() => {
    if (!entryRoad || !publicRoad || publicRoad.points.length < 2) return null;
    const junction = entryRoad.points[0];
    const ends: ApproachEnd[] = [publicRoad.points[0], publicRoad.points[publicRoad.points.length - 1]].map((edge) => {
      const dx = junction[0] - edge[0], dz = junction[1] - edge[1], length = Math.hypot(dx, dz);
      const inward: Point = [dx / length, dz / length];
      const arm = Math.min(ARM_LENGTH, length);
      return { point: [junction[0] - inward[0] * arm, junction[1] - inward[1] * arm], inward, bearing: sceneBearing(-dx, -dz) };
    });
    return { junction, ends, crossing: boundaryCrossing(entryRoad.points), half: entryRoad.width / 2 };
  }, [entryRoad, publicRoad]);
  if (!layout) return null;

  const items = state.phase === 'ready' ? state.items : [];
  const alerts = items.filter(({ assessment }) => assessment.exceptions.length > 0).length;
  const byEnd = layout.ends.map((end) => items.filter(({ assessment }) =>
    layout.ends.every((other) => bearingGap(assessment.bearingDeg, end.bearing) <= bearingGap(assessment.bearingDeg, other.bearing))));
  const { junction, crossing } = layout;

  return (
    <group>
      {state.phase === 'ready' && !open && (
        <Html center position={[junction[0], 9, junction[1]]} zIndexRange={[12, 0]}>
          <button
            className={`seed-depot-label inbound-road-label${alerts ? ' inbound-road-label-alert' : ''}`}
            aria-pressed={open}
            onClick={() => (open ? closeInbound() : openInbound())}
            title="Kampüse gelmekte olan araçlar"
          >
            <strong>Yoldaki araçlar</strong>
            <small>{items.length} araç{alerts ? ` · ${alerts} uyarı` : ''}</small>
          </button>
        </Html>
      )}

      {crossing && (
        <group position={[crossing.point[0], 0, crossing.point[1]]}
          rotation={[0, Math.atan2(-crossing.direction[0], -crossing.direction[1]), 0]}>
          <EntryCheckpoint half={layout.half} arrivals={items.slice(0, 3)} showBoard={open && state.phase === 'ready'} />
        </group>
      )}

      {open && state.phase === 'ready' && layout.ends.map((end, index) => {
        const vehicles = byEnd[index];
        const first = vehicles[0];
        return (
          <group key={index}>
            <FlowChevrons end={end} laneOffset={(publicRoad?.width ?? 12) / 4} geometry={chevron} />
            <Html center position={[end.point[0], 7, end.point[1]]} zIndexRange={[12, 0]}>
              <div className="approach-edge">
                <strong>{compass(end.bearing).from} · {vehicles.length} araç</strong>
                {first
                  ? <small>İlk {first.vehicle.licensePlate} · {time.format(new Date(first.vehicle.estimatedArrivalAt))}</small>
                  : <small>Beklenen araç yok</small>}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
