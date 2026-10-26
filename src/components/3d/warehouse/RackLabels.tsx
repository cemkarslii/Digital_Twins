import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { WarehouseSection } from '../../../types/warehouse';
import { WAREHOUSE_CONFIG } from '../../../data/warehouseConfig';
import { WAREHOUSE_LAYOUT } from '../../../data/warehouseLayout';
import { binsPerLevel, getRackLanes } from '../../../data/warehouseLanes';
import { BEAM_DEPTH } from './warehouseGeometry';

const R = WAREHOUSE_CONFIG.rackSystem;
/** One atlas cell per token; its aspect sets the token's width on the beam. */
const CELL = { width: 86, height: 32 };
/** Label strip on the beam face: a little lower than the beam, standing just proud of it. */
const LABEL = { height: R.beamHeight - 0.02, gap: 0.004 };
/** Labels show only this close to the section (metres); farther away they are unreadable specks. */
const VISIBLE_WITHIN = 18;

type Cell = [u0: number, v0: number, u1: number, v1: number];
let atlas: { texture: THREE.CanvasTexture; cells: Map<string, Cell> } | null = null;

/**
 * Every label token once (`D1`–`D4`, `R1`–`R212`, `K1`–`K5`): dark text on a white field, so the
 * tokens of one label join into a single strip. Shared by all sections, built on first use.
 */
function labelAtlas() {
  if (atlas) return atlas;
  const tokens = [
    ...WAREHOUSE_LAYOUT.sections.map((section) => `D${section.wmsCode}`),
    ...Array.from({ length: Math.max(...WAREHOUSE_LAYOUT.sections.map(binsPerLevel)) }, (_, i) => `R${i + 1}`),
    ...Array.from({ length: R.levels }, (_, i) => `K${i + 1}`),
  ];
  const columns = Math.floor(2048 / CELL.width);
  const canvas = document.createElement('canvas');
  canvas.width = columns * CELL.width;
  canvas.height = Math.ceil(tokens.length / columns) * CELL.height;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#f4f5f0';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#16201b';
  context.font = '600 22px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const cells = new Map<string, Cell>();
  tokens.forEach((token, i) => {
    const x = (i % columns) * CELL.width, y = Math.floor(i / columns) * CELL.height;
    context.fillText(token, x + CELL.width / 2, y + CELL.height / 2 + 1);
    // The texture is flipped on upload: canvas top is v = 1.
    cells.set(token, [x / canvas.width, 1 - (y + CELL.height) / canvas.height, (x + CELL.width) / canvas.width, 1 - y / canvas.height]);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return atlas = { texture, cells };
}

/**
 * `D1 R30 K1` (depot, WMS bin number, level) on the aisle face of the beam under every lane:
 * three textured quads per lane, merged into one geometry for the whole section.
 */
function labelGeometry(section: WarehouseSection) {
  const { cells } = labelAtlas();
  const lanes = getRackLanes().filter((lane) => lane.sectionId === section.id);
  const tokenWidth = LABEL.height * CELL.width / CELL.height;
  const quads = lanes.length * 3;
  const positions = new Float32Array(quads * 12), uvs = new Float32Array(quads * 8), index = new Uint32Array(quads * 6);
  let q = 0;
  for (const lane of lanes) {
    const out = Math.sign(lane.frontX - lane.backX);
    const x = lane.frontX + out * (BEAM_DEPTH / 2 + LABEL.gap);
    const y0 = lane.y - R.beamHeight / 2 - LABEL.height / 2, y1 = y0 + LABEL.height;
    // Seen from the aisle, the reader's right is -Z when looking west (out = +1) and +Z looking east.
    const right = -out;
    [`D${section.wmsCode}`, `R${lane.slot}`, `K${lane.level}`].forEach((token, t) => {
      const [u0, v0, u1, v1] = cells.get(token)!;
      const z0 = lane.z + right * (t - 1.5) * tokenWidth, z1 = z0 + right * tokenWidth;
      // Bottom left, bottom right, top right, top left: counter-clockwise from the aisle.
      positions.set([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], q * 12);
      uvs.set([u0, v0, u1, v0, u1, v1, u0, v1], q * 8);
      index.set([0, 1, 2, 0, 2, 3].map((i) => q * 4 + i), q * 6);
      q++;
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

/** Rack labels of the open section, one draw call, shown only once the camera is close enough to read them. */
export function RackLabels({ section }: { section: WarehouseSection }) {
  const geometry = useMemo(() => labelGeometry(section), [section]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const mesh = useRef<THREE.Mesh>(null);
  const camera = useMemo(() => new THREE.Vector3(), []);
  const top = WAREHOUSE_LAYOUT.floorY + R.uprightHeight;

  useFrame((state) => {
    const labels = mesh.current;
    if (!labels?.parent) return;
    // Camera distance to the section's rack volume, in the building-local frame of the labels.
    labels.parent.worldToLocal(camera.copy(state.camera.position));
    const { minX, maxX, minZ, maxZ } = section.bounds;
    const dx = Math.max(minX - camera.x, 0, camera.x - maxX);
    const dz = Math.max(minZ - camera.z, 0, camera.z - maxZ);
    labels.visible = Math.hypot(dx, Math.max(0, camera.y - top), dz) < VISIBLE_WITHIN;
  });

  return (
    <mesh ref={mesh} geometry={geometry} raycast={() => null}>
      <meshBasicMaterial map={labelAtlas().texture} toneMapped={false} />
    </mesh>
  );
}
