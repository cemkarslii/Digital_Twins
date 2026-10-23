import { SITE_CENTER } from './sitePlan';
import { SITE_PLAN_SCALE } from './siteCoordinates';
import type { ViewPreset } from '../types/factory';
import { SEED_STORAGE_CENTER } from './seedWarehouses';

export const CAMPUS_CAMERA_TARGET = SITE_CENTER;
export const CAMPUS_CAMERA_POSITION: [number, number, number] = [58, 490, 300];

/** Camera locations follow the same horizontal plan; elevation scales to frame it. */
export const DETAIL_CAMERAS: Partial<Record<ViewPreset, {
  position: [number, number, number]; lookAt: [number, number, number];
}>> = {
  solar_focus: { position: [110, 80, 10], lookAt: [43, 1, -51] },
  west_logistics: { position: [-155, 67, 26], lookAt: [-94, 0, -33] },
  production_bay: { position: [133, 108, 149], lookAt: [26, 0, 29] },
};

export function detailCamera(preset: ViewPreset) {
  const view = DETAIL_CAMERAS[preset];
  if (!view) return null;
  return {
    position: view.position.map((coordinate) => coordinate * SITE_PLAN_SCALE) as [number, number, number],
    lookAt: [view.lookAt[0] * SITE_PLAN_SCALE, view.lookAt[1], view.lookAt[2] * SITE_PLAN_SCALE] as [number, number, number],
  };
}

/** Steep view over the seed storage precinct so the interiors read through the transparent roofs. */
export function seedStorageCamera() {
  const [x, z] = SEED_STORAGE_CENTER;
  return {
    position: [(x + 30) * SITE_PLAN_SCALE, 144, (z + 56) * SITE_PLAN_SCALE] as [number, number, number],
    lookAt: [x * SITE_PLAN_SCALE, 0, z * SITE_PLAN_SCALE] as [number, number, number],
  };
}
