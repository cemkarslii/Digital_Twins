import * as THREE from 'three';
import { WAREHOUSE_CONFIG } from '../../../data/warehouseConfig';

/** While the WMS feed is not live the data may be stale, so stock colours fade toward the unknown colour. */
const STALE_MIX = 0.65;
const UNKNOWN = new THREE.Color(WAREHOUSE_CONFIG.stockColors.unknown);

/** Writes a stock colour into `target`, faded when stale; shared by lane markers, lids and floor bands. */
export function stockTint(target: THREE.Color, color: THREE.ColorRepresentation, stale: boolean) {
  target.set(color);
  return stale ? target.lerp(UNKNOWN, STALE_MIX) : target;
}

/** CSS hex of a stock colour, faded when stale. */
export const stockHex = (color: string, stale: boolean) => `#${stockTint(new THREE.Color(), color, stale).getHexString()}`;
