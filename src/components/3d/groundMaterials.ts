import * as THREE from 'three';

export type GroundSurface = 'earth' | 'grass' | 'concrete' | 'asphalt' | 'gravel';

/** Deterministic, seamless material detail; no external imagery or texture requests. */
export function createGroundTexture(surface: GroundSurface): THREE.DataTexture {
  const size = 256;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 137;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const coarse = Array.from({ length: 256 }, random);
  const smoothNoise = (x: number, y: number) => {
    const gx = x / 16, gy = y / 16;
    const ix = Math.floor(gx), iy = Math.floor(gy);
    const fx = gx - ix, fy = gy - iy;
    const tx = fx * fx * (3 - 2 * fx), ty = fy * fy * (3 - 2 * fy);
    const at = (cx: number, cy: number) => coarse[(cy % 16) * 16 + (cx % 16)];
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(at(ix, iy), at(ix + 1, iy), tx),
      THREE.MathUtils.lerp(at(ix, iy + 1), at(ix + 1, iy + 1), tx), ty,
    );
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = random() - 0.5;
      const patch = smoothNoise(x, y) - 0.5;
      let value = 224 + grain * 24 + patch * 22;
      if (surface === 'grass') value = 210 + grain * 36 + patch * 54;
      if (surface === 'earth') value = 220 + grain * 25 + patch * 42;
      if (surface === 'gravel') value = 214 + grain * 51 + patch * 18;
      if (surface === 'asphalt') value = 224 + grain * 24 + patch * 8;
      if (surface === 'concrete' && (x % 128 === 0 || y % 128 === 0)) value -= 27;
      const index = (y * size + x) * 4;
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export interface GroundCutout { minX: number; maxX: number; minZ: number; maxZ: number }

export function createGroundPatch(x: number, z: number, width: number, depth: number, y: number, cutouts: GroundCutout[] = []) {
  const geometry = new THREE.BufferGeometry();
  let patches: GroundCutout[] = [{ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 }];
  for (const hole of cutouts) patches = patches.flatMap((patch) => {
    const left = Math.max(patch.minX, hole.minX), right = Math.min(patch.maxX, hole.maxX);
    const near = Math.max(patch.minZ, hole.minZ), far = Math.min(patch.maxZ, hole.maxZ);
    if (left >= right || near >= far) return [patch];
    return [
      { ...patch, maxX: left }, { ...patch, minX: right },
      { minX: left, maxX: right, minZ: patch.minZ, maxZ: near },
      { minX: left, maxX: right, minZ: far, maxZ: patch.maxZ },
    ].filter((part) => part.maxX - part.minX > 0.001 && part.maxZ - part.minZ > 0.001);
  });
  const vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
  patches.forEach(({ minX: left, maxX: right, minZ: near, maxZ: far }, index) => {
    vertices.push(left, y, near, right, y, near, left, y, far, right, y, far);
    uvs.push(left / 12, near / 12, right / 12, near / 12, left / 12, far / 12, right / 12, far / 12);
    const base = index * 4;
    indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  });
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
