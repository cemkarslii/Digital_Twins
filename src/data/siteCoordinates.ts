/** Horizontal display scale shared by layout, landscape, overlays, and cameras. */
export const SITE_PLAN_SCALE = 2;

export const MAP_BOUNDS = {
  minX: -270,
  maxX: 270,
  minZ: -220,
  maxZ: 220,
  width: 540,
  depth: 440,
} as const;

export function referencePoint([x, z]: readonly [number, number]): [number, number] {
  return [x * SITE_PLAN_SCALE, z * SITE_PLAN_SCALE];
}

/** Heights stay unchanged when spreading the plan across the map. */
export function referencePosition([x, y, z]: readonly [number, number, number]): [number, number, number] {
  return [x * SITE_PLAN_SCALE, y, z * SITE_PLAN_SCALE];
}

type BuildingDimensions = { width: number; depth: number; height: number };

export function referenceDimensions(dimensions: readonly [number, number]): [number, number];
export function referenceDimensions(dimensions: readonly [number, number, number]): [number, number, number];
export function referenceDimensions(dimensions: BuildingDimensions): BuildingDimensions;
export function referenceDimensions(
  dimensions: readonly [number, number] | readonly [number, number, number] | BuildingDimensions,
): [number, number] | [number, number, number] | BuildingDimensions {
  if ('width' in dimensions) {
    return {
      ...dimensions,
      width: dimensions.width * SITE_PLAN_SCALE,
      depth: dimensions.depth * SITE_PLAN_SCALE,
    };
  }
  // Infrastructure tuples use [width, depth, height], unlike position tuples.
  if (dimensions.length === 3) {
    return [dimensions[0] * SITE_PLAN_SCALE, dimensions[1] * SITE_PLAN_SCALE, dimensions[2]];
  }
  return [dimensions[0] * SITE_PLAN_SCALE, dimensions[1] * SITE_PLAN_SCALE];
}

export const referenceBuildingDimensions = (dimensions: BuildingDimensions): BuildingDimensions =>
  referenceDimensions(dimensions);
