import * as THREE from 'three';

type Point = [number, number];

function cleanPath(points: Point[]): { points: Point[]; closed: boolean } {
  const path = points.filter((point, index) => index === 0 || Math.hypot(
    point[0] - points[index - 1][0], point[1] - points[index - 1][1],
  ) > 0.001);
  const closed = path.length > 2 && Math.hypot(path[0][0] - path[path.length - 1][0], path[0][1] - path[path.length - 1][1]) < 0.001;
  return { points: closed ? path.slice(0, -1) : path, closed };
}

/** Shared vertices and bounded miter joins keep every corner watertight. */
export function createRoadRibbon(controlPoints: Point[], leftOffset: number, rightOffset: number, elevation: number) {
  const { points, closed } = cleanPath(controlPoints);
  const geometry = new THREE.BufferGeometry();
  if (points.length < 2) return geometry;
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const count = points.length;
  const direction = (a: Point, b: Point) => new THREE.Vector2(b[0] - a[0], b[1] - a[1]).normalize();
  const drawCount = closed ? count + 1 : count;
  for (let index = 0; index < drawCount; index++) {
    const i = index % count, point = points[i];
    const previous = points[(i - 1 + count) % count], next = points[(i + 1) % count];
    const before = !closed && i === 0 ? direction(point, next) : direction(previous, point);
    const after = !closed && i === count - 1 ? before.clone() : direction(point, next);
    const normal = new THREE.Vector2(-after.y, after.x);
    const miter = new THREE.Vector2(-before.y - after.y, before.x + after.x);
    if (miter.lengthSq() < 0.0001) miter.copy(normal);
    else miter.normalize();
    const divisor = miter.dot(normal);
    const scale = Math.abs(divisor) > 0.25 ? 1 / divisor : 1;
    for (const offset of [leftOffset, rightOffset]) {
      const distance = THREE.MathUtils.clamp(offset * scale, -Math.abs(offset) * 2, Math.abs(offset) * 2);
      const x = point[0] + miter.x * distance, z = point[1] + miter.y * distance;
      positions.push(x, elevation, z);
      uvs.push(x / 10, z / 10);
    }
    if (index < drawCount - 1) {
      const v = index * 2;
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** A single geometry for all dashes, with spacing carried through successive corners. */
export function createRoadDashes(points: Point[], elevation = 0.068) {
  const positions: number[] = [], indices: number[] = [];
  const period = 6.8, dashLength = 2.8, halfWidth = 0.085;
  let distance = 0;
  for (let segment = 0; segment < points.length - 1; segment++) {
    const a = points[segment], b = points[segment + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < 0.001) continue;
    const nx = -dz / length * halfWidth, nz = dx / length * halfWidth;
    const firstDash = Math.floor(distance / period);
    const lastDash = Math.ceil((distance + length) / period);
    for (let d = firstDash; d <= lastDash; d++) {
      const start = Math.max(0, d * period - distance);
      const end = Math.min(length, d * period + dashLength - distance);
      if (end <= start) continue;
      const x0 = a[0] + dx * start / length, z0 = a[1] + dz * start / length;
      const x1 = a[0] + dx * end / length, z1 = a[1] + dz * end / length;
      const offset = positions.length / 3;
      positions.push(x0 + nx, elevation, z0 + nz, x0 - nx, elevation, z0 - nz,
        x1 + nx, elevation, z1 + nz, x1 - nx, elevation, z1 - nz);
      indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
    }
    distance += length;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
