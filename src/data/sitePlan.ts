import { referencePoint, referencePosition } from './siteCoordinates';

/**
 * Reference-image tracing. Coordinates use x = (pixelX - 240) / 2 and
 * z = (pixelY - 190) / 2 before the shared display scale; north is -Z.
 * This is an illustrative site plan,
 * not a survey. Area labels are transcribed from the supplied image and
 * must not be inferred from the model's arbitrary display scale.
 */
export type SitePoint = [number, number];

export interface CampusZone {
  id: string;
  name: string;
  areaLabel: string;
  color: string;
  points: SitePoint[];
  labelPosition: [number, number, number];
  buildingId?: string;
}

export const SITE_CENTER = referencePosition([-2, 0, -2]);

const REFERENCE_BOUNDARY: SitePoint[] = [
  [-121, -71], [-96, -74], [-83, -85], [-67, -84], [-7, -72],
  [20, -85], [65, -82], [72, -71], [81, -25], [112, -17],
  [117, -15], [118, 85], [-13, 88], [-121, 87],
];

const REFERENCE_ZONES: CampusZone[] = [
  {
    id: 'truck-park',
    name: 'Tır Parkı',
    areaLabel: '≈ 12.500 m²',
    color: '#ef5450',
    points: [[-120, -69], [-86, -69], [-83, -64], [-81, -8], [-85, -4], [-119, -4]],
    labelPosition: [-102, 5, -43],
  },
  {
    id: 'seed-storage',
    name: 'Tohum Depoları',
    areaLabel: '≈ 9.800 m²',
    color: '#58c769',
    points: [[-109, 11], [-69, 11], [-67, 15], [-67, 76], [-71, 80], [-109, 80], [-111, 76], [-111, 15]],
    labelPosition: [-88, 10, 44],
  },
  {
    id: 'north-warehouse',
    name: 'Depo',
    areaLabel: '≈ 8.500 m²',
    color: '#38a6e8',
    points: [[19, -79], [63, -79], [66, -76], [68, -26], [65, -22], [19, -22], [16, -25], [16, -76]],
    labelPosition: [43, 11, -46],
    buildingId: 'bldg-07',
  },
  {
    id: 'security',
    name: 'Kantar ve Güvenlik',
    areaLabel: '≈ 2.800 m²',
    color: '#ad73ef',
    points: [[-61, -31], [-35, -31], [-28, -27], [-26, -20], [-30, -13], [-37, -8], [-60, -8], [-62, -11]],
    labelPosition: [-43, 7, -26],
    buildingId: 'bldg-09',
  },
  {
    id: 'main-factory',
    name: 'Ana Fabrika Kompleksi',
    areaLabel: '≈ 15.000 m²',
    color: '#efa53d',
    points: [
      [-50, 4], [-24, 4], [-19, 1], [-18, -10], [-14, -12], [98, -12],
      [104, -7], [104, 68], [99, 74], [47, 74], [41, 69], [38, 65],
      [-46, 65], [-52, 59], [-52, 10],
    ],
    labelPosition: [27, 12, 41],
    buildingId: 'bldg-01',
  },
];

export const SITE_BOUNDARY = REFERENCE_BOUNDARY.map(referencePoint);
export const CAMPUS_ZONES: CampusZone[] = REFERENCE_ZONES.map((zone) => ({
  ...zone,
  points: zone.points.map(referencePoint),
  labelPosition: referencePosition(zone.labelPosition),
}));

