import * as THREE from 'three';

/** Small, deterministic surface maps; all dimensions and repeats are in metres. */
export function createBuildingTexture(
  surface: 'cladding' | 'roof' | 'shutter' | 'photovoltaic',
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = surface === 'photovoltaic' ? 512 : 256;
  const context = canvas.getContext('2d')!;
  const { width, height } = canvas;
  context.fillStyle = surface === 'photovoltaic' ? '#28343c' : '#f3f2ee';
  context.fillRect(0, 0, width, height);

  if (surface === 'photovoltaic') {
    // Half-cut cell grid, with narrow busbars and a small glass edge reveal.
    for (let row = 0; row < 12; row++) {
      for (let column = 0; column < 6; column++) {
        const x = 3 + column * 41.7;
        const y = 3 + row * 42.2;
        const shade = 39 + ((row * 7 + column * 3) % 7);
        context.fillStyle = `rgb(${shade}, ${shade + 10}, ${shade + 16})`;
        context.fillRect(x, y, 40.2, 40.7);
        context.fillStyle = 'rgba(185, 197, 200, 0.14)';
        context.fillRect(x + 13, y, 0.65, 40.7);
        context.fillRect(x + 27, y, 0.65, 40.7);
      }
    }
    context.strokeStyle = '#637078';
    context.lineWidth = 1.5;
    context.strokeRect(1, 1, width - 2, height - 2);
  } else {
    for (let i = 0; i < 500; i++) {
      const x = (i * 73 + 19) % width;
      const y = (i * 157 + 31) % height;
      context.fillStyle = `rgba(93, 88, 77, ${0.008 + (i % 4) * 0.004})`;
      context.fillRect(x, y, 2, 2);
    }
    if (surface === 'roof') {
      // Horizontal in UV space: ribs run down the pitch, across the ridge.
      context.fillStyle = 'rgba(99, 106, 105, 0.22)';
      context.fillRect(0, 0, width, 3);
      context.fillStyle = 'rgba(255, 255, 255, 0.85)';
      context.fillRect(0, 3, width, 3);
      context.fillStyle = 'rgba(100, 105, 101, 0.08)';
      context.fillRect(127, 0, 1, height);
    } else if (surface === 'shutter') {
      for (let y = 0; y < height; y += 32) {
        context.fillStyle = '#a7aaa6';
        context.fillRect(0, y, width, 2);
        context.fillStyle = '#ffffff';
        context.fillRect(0, y + 3, width, 2);
      }
    } else {
      for (let x = 0; x < width; x += 64) {
        context.fillStyle = 'rgba(107, 112, 106, 0.19)';
        context.fillRect(x, 0, 5, height);
        context.fillStyle = 'rgba(255, 255, 255, 0.88)';
        context.fillRect(x + 5, 0, 4, height);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
