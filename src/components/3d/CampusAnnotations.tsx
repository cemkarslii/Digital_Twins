import { Html, Line } from '@react-three/drei';
import { CAMPUS_ZONES, SITE_BOUNDARY } from '../../data/sitePlan';
import { useFactoryStore } from '../../store/useFactoryStore';

/** Optional reference boundaries and camera focus links. */
export function CampusAnnotations() {
  const visible = useFactoryStore((s) => s.showZoneOverlay);
  const focusOnBuilding = useFactoryStore((s) => s.focusOnBuilding);
  const openLogisticsArea = useFactoryStore((s) => s.openLogisticsArea);
  const openSeedStorage = useFactoryStore((s) => s.openSeedStorage);
  if (!visible) return null;

  return (
    <group>
      <Line
        points={[...SITE_BOUNDARY, SITE_BOUNDARY[0]].map(([x, z]) => [x, 0.65, z])}
        color="#fff7e8" lineWidth={2.5} raycast={() => null}
      />
      <Line
        points={[...SITE_BOUNDARY, SITE_BOUNDARY[0]].map(([x, z]) => [x, 0.69, z])}
        color="#d24f48" lineWidth={1.8} dashed dashSize={2.1} gapSize={1.3}
        raycast={() => null}
      />
      {CAMPUS_ZONES.map((zone) => (
        <group key={zone.id}>
          <Line
            points={[...zone.points, zone.points[0]].map(([x, z]) => [x, 0.55, z])}
            color={zone.color} lineWidth={2} raycast={() => null}
          />
          <Html center position={zone.labelPosition} zIndexRange={[12, 0]}>
            <button
              className="campus-zone-label"
              style={{ '--zone-color': zone.color } as React.CSSProperties}
              onClick={() => zone.id === 'truck-park'
                ? openLogisticsArea('truck_park')
                : zone.id === 'security'
                  ? openLogisticsArea('gate_security')
                  : zone.id === 'seed-storage'
                    ? openSeedStorage()
                    : zone.buildingId && focusOnBuilding(zone.buildingId)}
              title={`${zone.name} bölgesine odaklan`}
            >
              <span>{zone.name}</span>
              <small>{zone.areaLabel}</small>
            </button>
          </Html>
        </group>
      ))}
    </group>
  );
}
