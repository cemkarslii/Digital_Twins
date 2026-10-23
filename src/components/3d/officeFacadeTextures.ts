import * as THREE from 'three';

/** Canvas maps for the administration facade. Detail lives in textures, not geometry. */

function canvas(width: number, height: number) {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  return { element, context: element.getContext('2d')! };
}

function toTexture(element: HTMLCanvasElement, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(element);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Tile size in metres for the brick map; repeats are derived from it. */
export const BRICK_TILE_M = 2;

/** Split-face slim brick in mixed greys and beiges, running bond, light mortar. */
export function brickTexture(widthM: number, heightM: number) {
  const { element, context } = canvas(512, 512);
  const courses = 25, perRow = 8;
  const courseH = 512 / courses, brickW = 512 / perRow;
  const palette = ['#9c9a94', '#b3aea4', '#8d8a85', '#c1b8a8', '#a59b8e', '#7f7d7a', '#b9b4ab', '#968f86'];
  context.fillStyle = '#d6d3cb';
  context.fillRect(0, 0, 512, 512);
  let seed = 4127;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let row = 0; row < courses; row++) {
    const offset = row % 2 ? brickW / 2 : 0;
    for (let i = -1; i < perRow; i++) {
      const x = i * brickW + offset;
      context.fillStyle = palette[Math.floor(random() * palette.length)];
      context.fillRect(x + 1.5, row * courseH + 1.5, brickW - 3, courseH - 3);
      // Split-face texture: a few darker and lighter flecks per brick.
      for (let k = 0; k < 6; k++) {
        context.fillStyle = random() > 0.5 ? 'rgba(60,56,52,0.18)' : 'rgba(255,255,255,0.12)';
        context.fillRect(x + 3 + random() * (brickW - 8), row * courseH + 3 + random() * (courseH - 7), 3, 2);
      }
    }
  }
  return toTexture(element, widthM / BRICK_TILE_M, heightM / BRICK_TILE_M);
}

/** Dark composite panel band with vertical joints every `jointM` metres. */
export function panelTexture(widthM: number, jointM = 1.2) {
  const { element, context } = canvas(128, 64);
  context.fillStyle = '#585d61';
  context.fillRect(0, 0, 128, 64);
  context.fillStyle = 'rgba(255,255,255,0.06)';
  context.fillRect(0, 0, 128, 10);
  context.fillStyle = '#3c4044';
  context.fillRect(0, 0, 3, 64);
  return toTexture(element, widthM / jointM, 1);
}

/** Tinted glazing with dark mullions every `mullionM` metres. */
export function glazingTexture(widthM: number, mullionM = 1.5) {
  const { element, context } = canvas(128, 256);
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#4d5a63');
  gradient.addColorStop(0.45, '#2a3238');
  gradient.addColorStop(1, '#1f2529');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 256);
  context.fillStyle = 'rgba(255,255,255,0.07)';
  context.beginPath();
  context.moveTo(30, 0); context.lineTo(70, 0); context.lineTo(20, 256); context.lineTo(-20, 256);
  context.fill();
  context.fillStyle = '#34393d';
  context.fillRect(0, 0, 7, 256);
  return toTexture(element, widthM / mullionM, 1);
}

/** Entrance tower cladding: a large X with chevron louvres in the four triangles. */
export function louvreTexture(aspect: number) {
  const width = 512, height = Math.round(512 / aspect);
  const { element, context } = canvas(width, height);
  context.fillStyle = '#4a4f54';
  context.fillRect(0, 0, width, height);
  const cx = width / 2, cy = height / 2;
  const triangles: [number, number][][] = [
    [[0, 0], [width, 0], [cx, cy]],
    [[0, height], [width, height], [cx, cy]],
    [[0, 0], [0, height], [cx, cy]],
    [[width, 0], [width, height], [cx, cy]],
  ];
  context.strokeStyle = '#6e7479';
  context.lineWidth = 3;
  for (const [a, b, c] of triangles) {
    // Nested outlines shrinking toward the triangle's centroid read as louvre slats.
    const gx = (a[0] + b[0] + c[0]) / 3, gy = (a[1] + b[1] + c[1]) / 3;
    for (let k = 0.92; k > 0.08; k -= 0.09) {
      context.beginPath();
      [a, b, c].forEach(([x, y], index) => {
        const px = gx + (x - gx) * k, py = gy + (y - gy) * k;
        if (index) context.lineTo(px, py); else context.moveTo(px, py);
      });
      context.closePath();
      context.stroke();
    }
  }
  // The X itself: two flat bars with a lit upper edge.
  context.lineCap = 'butt';
  for (const [x0, y0, x1, y1] of [[0, 0, width, height], [width, 0, 0, height]]) {
    context.strokeStyle = '#3d4246'; context.lineWidth = 22;
    context.beginPath(); context.moveTo(x0, y0); context.lineTo(x1, y1); context.stroke();
    context.strokeStyle = '#646a6f'; context.lineWidth = 6;
    context.beginPath(); context.moveTo(x0, y0 - 6); context.lineTo(x1, y1 - 6); context.stroke();
  }
  context.strokeStyle = '#3d4246';
  context.lineWidth = 10;
  context.strokeRect(0, 0, width, height);
  return toTexture(element);
}

/** Channel-letter sign: orange fruit mark with blue bars and a leaf, then the wordmark. */
export function signTexture(text: string) {
  const { element, context } = canvas(1024, 192);
  const r = 74, cx = 92, cy = 104;
  context.fillStyle = '#ef6a2f';
  context.beginPath(); context.arc(cx, cy, r, 0, Math.PI * 2); context.fill();
  // Blue bars clipped to the right half of the circle.
  context.save();
  context.beginPath(); context.arc(cx, cy, r, 0, Math.PI * 2); context.clip();
  [['#1f6fb5', 0], ['#2f86cf', 1], ['#46a3e0', 2], ['#1f6fb5', 3]].forEach(([color, i]) => {
    const n = i as number;
    context.fillStyle = color as string;
    context.fillRect(cx - 4 + n * 20, cy - 52 + n * 6, 14, 140);
  });
  context.restore();
  context.fillStyle = '#3c9a3a';
  context.beginPath();
  context.ellipse(cx + 8, cy - r - 10, 26, 11, -0.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#5b3b22';
  context.fillRect(cx - 3, cy - r - 12, 5, 16);

  context.font = 'bold 116px Georgia, "Times New Roman", serif';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = 9;
  context.strokeStyle = '#2b2b2b';
  context.strokeText(text, 190, cy + 6);
  context.fillStyle = '#ffffff';
  context.fillText(text, 190, cy + 6);
  const texture = toTexture(element);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Sign plane aspect (width / height) matching signTexture's canvas. */
export const SIGN_ASPECT = 1024 / 192;
