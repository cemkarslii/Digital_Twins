/** Small deterministic hash in [0, 1), so generated patterns stay stable between renders and reloads. */
export function stableHash(text: string, index: number) {
  let h = 2166136261 ^ index;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
