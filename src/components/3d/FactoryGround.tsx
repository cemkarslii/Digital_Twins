import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFactoryStore } from '../../store/useFactoryStore';
import { SITE_BOUNDARY } from '../../data/sitePlan';
import { MAP_BOUNDS } from '../../data/siteCoordinates';
import { LOADING_PIT } from '../../data/loadingDock';
import { createGroundPatch, createGroundTexture, GroundSurface } from './groundMaterials';

const GroundPatch: React.FC<{
  center: [number, number]; size: [number, number]; height?: number;
  color: string; texture: THREE.Texture;
}> = ({ center, size, height = 0, color, texture }) => {
  const geometry = useMemo(() => createGroundPatch(center[0], center[1], size[0], size[1], height, [LOADING_PIT]),
    [center[0], center[1], size[0], size[1], height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow>
    <meshStandardMaterial color={color} map={texture} roughness={0.98} />
  </mesh>;
};

export const FactoryGround: React.FC = () => {
  const groundAreas = useFactoryStore((s) => s.groundAreas);
  const focusOnGroundPosition = useFactoryStore((s) => s.focusOnGroundPosition);
  const openLogisticsArea = useFactoryStore((s) => s.openLogisticsArea);
  const textures = useMemo(() => ({
    earth: createGroundTexture('earth'), grass: createGroundTexture('grass'),
    concrete: createGroundTexture('concrete'), gravel: createGroundTexture('gravel'),
  }), []);
  const parcel = useMemo(() => {
    const contour = SITE_BOUNDARY.map(([x, z]) => new THREE.Vector2(x, z));
    const hole = [
      new THREE.Vector2(LOADING_PIT.minX, LOADING_PIT.minZ),
      new THREE.Vector2(LOADING_PIT.minX, LOADING_PIT.maxZ),
      new THREE.Vector2(LOADING_PIT.maxX, LOADING_PIT.maxZ),
      new THREE.Vector2(LOADING_PIT.maxX, LOADING_PIT.minZ),
    ];
    const triangles = THREE.ShapeUtils.triangulateShape(contour, [hole]);
    const vertices = [...contour, ...hole];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flatMap(({ x, y }) => [x, -0.026, y]), 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(vertices.flatMap(({ x, y }) => [x / 12, y / 12]), 2));
    // ShapeUtils winds in XY; reverse it for the upwards-facing XZ surface.
    geometry.setIndex(triangles.flatMap(([a, b, c]) => [a, c, b]));
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => {
    Object.values(textures).forEach((texture) => texture.dispose());
    parcel.dispose();
  }, [textures, parcel]);

  return (
    <group
      onClick={(event) => {
        if (event.delta > 4) return;
        const area = groundAreas.find((yard) => ['yard-truck-park', 'yard-security'].includes(yard.id) && yard.visible &&
          Math.abs(event.point.x - yard.center[0]) <= yard.dimensions[0] / 2 &&
          Math.abs(event.point.z - yard.center[1]) <= yard.dimensions[1] / 2);
        if (!area) return;
        event.stopPropagation();
        openLogisticsArea(area.id === 'yard-security' ? 'gate_security' : 'truck_park');
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        focusOnGroundPosition([event.point.x, 0, event.point.z]);
      }}
    >
      <GroundPatch center={[0, 0]} size={[MAP_BOUNDS.width, MAP_BOUNDS.depth]} height={-0.08} color="#b3a58a" texture={textures.earth} />
      {/* The same four exterior fields now occupy the margins of the existing map. */}
      <GroundPatch center={[-255, 0]} size={[24, 364]} height={-0.07} color="#9b9575" texture={textures.earth} />
      <GroundPatch center={[0, -196]} size={[476, 42]} height={-0.07} color="#ac9876" texture={textures.earth} />
      <GroundPatch center={[254, 0]} size={[28, 400]} height={-0.07} color="#9a9677" texture={textures.grass} />
      <GroundPatch center={[0, 198]} size={[476, 40]} height={-0.07} color="#b1a185" texture={textures.earth} />
      <mesh geometry={parcel} receiveShadow>
        <meshStandardMaterial map={textures.grass} color="#8c946e" roughness={1} />
      </mesh>
      {groundAreas.filter((yard) => yard.visible).map((yard) => {
        const surface: Exclude<GroundSurface, 'asphalt'> = yard.surfaceType === 'concrete_apron' ? 'concrete'
          : yard.surfaceType === 'graded_gravel' ? 'gravel' : 'earth';
        return <GroundPatch key={yard.id} center={yard.center} size={yard.dimensions} height={0.012}
          color={surface === 'concrete' ? '#c6c4b9' : surface === 'gravel' ? '#b7b1a0' : '#b0a083'} texture={textures[surface]} />;
      })}
    </group>
  );
};
