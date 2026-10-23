import type {
  BuildingEntity,
  RoadEntity,
  ParkingEntity,
  VehicleEntity,
  InfrastructureEntity,
  GroundAreaEntity,
} from '../types/factory';
import { referenceDimensions, referencePoint, referencePosition, SITE_PLAN_SCALE } from './siteCoordinates';
import { LOADING_DOCK } from './loadingDock';
import { REFERENCE_SEED_WAREHOUSES } from './seedWarehouses';

/** Visual reconstruction from the supplied aerial image; no surveyed dimensions or live telemetry. */
export const FACTORY_METADATA = {
  facilityName: 'Endüstriyel Üretim Kampüsü',
  location: 'Referans hava fotoğrafından modellenen yerleşim',
  established: 'Referans yerleşim · 2026',
  referencePerimeterM: 1960,
  totalFootprintM2: null,
  coveredAreaM2: null,
  totalSolarCapacityKwp: null,
  annualSolarGenerationMwh: null,
  carbonOffsetTonsAnnual: null,
  activeZones: 5,
  measurementNote: 'Alan etiketleri referans görseldeki yaklaşık değerlerdir. Model ölçüleri temsili; enerji ve üretim verileri doğrulanmamıştır.',
};

const REFERENCE_BUILDINGS: BuildingEntity[] = [
  {
    id: 'bldg-01', name: 'Ana Fabrika · Üretim Bloğu', code: 'FAB-01', type: 'building',
    category: 'processing', categoryLabel: 'Ana Fabrika Kompleksi',
    dimensions: { width: 70, depth: 40, height: 7.5 }, position: [16.5, 3.75, 39], rotationY: 0,
    roofType: 'gable_multi_bay', wallColor: '#d7d9d6', roofColor: '#e4e6e2',
    footprintAreaM2: 2800, operationalStatus: 'Aktif İzleme',
    features: ['Dört açıklıklı açık renk endüstriyel çatı', 'Doğu depo bloğuyla bitişik yerleşim', 'Kuzeyde teknik servis avlusu'],
    description: 'Hava fotoğrafındaki ana fabrikanın geniş, açık renk çatılı üretim bloğu. Bina oturumu ve kütle oranları görsel referansa göre yeniden kurulmuştur.',
    visible: true,
  },
  {
    id: 'bldg-02', name: 'Ana Fabrika · Güneş Panelli Doğu Bloğu', code: 'GES-02', type: 'building',
    category: 'solar_logistics', categoryLabel: 'Ana Fabrika Kompleksi',
    dimensions: { width: 45, depth: 62, height: 9 }, position: [74, 4.5, 35], rotationY: 0,
    roofType: 'solar_dense', wallColor: '#cdd1ce', roofColor: '#d0d5d2',
    footprintAreaM2: 2790, operationalStatus: 'Aktif İzleme',
    features: ['Kuzey–güney doğrultusunda yoğun fotovoltaik çatı dizileri', 'Paneller arasında açık renk bakım şeritleri', 'Ana üretim çatısından daha yüksek depo kütlesi', 'Kuzey cephesinde altı kapılı yükseltilmiş tır rampası (R3)', 'Doğu ve güneyde çevre servis yolu'],
    description: 'Referansta ana kompleksin doğusunda görülen uzun güneş panelli çatı. Panel sayısı ve enerji kapasitesi görselden doğrulanamadığı için operasyonel değer verilmez.',
    visible: true,
  },
  {
    id: 'bldg-03', name: 'Kuzey Üretim Ek Binası', code: 'EK-03', type: 'building',
    category: 'processing', categoryLabel: 'Ana Fabrika Kompleksi',
    dimensions: { width: 16, depth: 24, height: 7 }, position: [43, 3.5, 7], rotationY: 0,
    roofType: 'ridged_single_bay', wallColor: '#d5d8d5', roofColor: '#dedfda',
    footprintAreaM2: 384, operationalStatus: 'Aktif İzleme', officeFacade: 'west',
    features: ['Ana üretim bloğuna bitişik kuzey uzantısı', 'Batı cephesinde iki katlı yönetim ofisi', 'Doğu cephesinde çukur tır rampası (R1)', 'Kapılara doğru alçalan rampa ve iki geri yanaşma cebi'],
    description: 'Ana çatının kuzeyinde yer alan dar bağlantı bloğu. Konumu ve formu referanstaki bina siluetini tamamlar.',
    visible: true,
  },
  {
    id: 'bldg-04', name: 'Batı Teknik Servis Bloğu', code: 'TEK-04', type: 'building',
    category: 'utility_energy', categoryLabel: 'Teknik Servis Alanı',
    dimensions: { width: 15, depth: 20, height: 5.8 }, position: [-3, 2.9, 5], rotationY: 0,
    roofType: 'flat_parapet', wallColor: '#c6c9c2', roofColor: '#daddd5',
    footprintAreaM2: 300, operationalStatus: 'Aktif İzleme',
    features: ['Kompakt dikdörtgen teknik bina', 'Düz çatı ve alçak parapet', 'Ana fabrika önündeki servis avlusu'],
    description: 'Referans fotoğrafta ana fabrikanın kuzeybatısında görülen bağımsız teknik bina. Ekipmanlar temsili olarak modellenmiştir.',
    visible: true,
  },
  {
    id: 'bldg-05', name: 'Doğu Teknik Servis Bloğu', code: 'TEK-05', type: 'building',
    category: 'utility_energy', categoryLabel: 'Teknik Servis Alanı',
    dimensions: { width: 15, depth: 20, height: 5.5 }, position: [19, 2.75, 5], rotationY: 0,
    roofType: 'flat_parapet', wallColor: '#bcc2bc', roofColor: '#cdd2ca',
    footprintAreaM2: 300, operationalStatus: 'Aktif İzleme',
    features: ['Ana üretim bloğu önünde ikinci teknik hacim', 'Çatı üstü servis ekipmanları', 'İki teknik bina arasında erişim koridoru'],
    description: 'Ana fabrikanın kuzey cephesindeki ikinci küçük teknik blok; çatı ekipmanları referansın okunabilen kütlelerine göre temsil edilir.',
    visible: true,
  },
  {
    id: 'bldg-06', name: 'Batı Depo Bloğu', code: 'DEP-06', type: 'building',
    category: 'cold_storage', categoryLabel: 'Ana Fabrika Kompleksi',
    dimensions: { width: 26, depth: 37, height: 7.2 }, position: [-37, 3.6, 26], rotationY: 0,
    roofType: 'gable_multi_bay', wallColor: '#d1d5ce', roofColor: '#e7e8e2',
    footprintAreaM2: 962, operationalStatus: 'Aktif İzleme',
    features: ['Kuzey–güney uzanan açık renk metal çatı', 'Ana üretimden ayrılan dar servis aralığı', 'Güney cephesinde altı kapılı yükseltilmiş tır rampası (R2)'],
    description: 'Ana fabrika kompleksinin batısındaki müstakil depo kütlesi. Referanstaki ince uzun beyaz çatı ve çevresindeki açık manevra sahası korunmuştur.',
    visible: true,
  },
  {
    id: 'bldg-07', name: 'Kuzey Depo · Güneş Panelli Çatı', code: 'DEP-07', type: 'building',
    category: 'solar_logistics', categoryLabel: 'Depo',
    dimensions: { width: 43, depth: 52, height: 8 }, position: [43, 4, -51], rotationY: 0,
    roofType: 'solar_striped', wallColor: '#d2d5cf', roofColor: '#e1e4de',
    footprintAreaM2: 2236, operationalStatus: 'Aktif İzleme',
    features: ['Açık renk çatı üzerinde üç uzun güneş paneli bandı', 'Ana kampüsten bulvarla ayrılan bağımsız depo', 'Kapalı depo cepheleri', 'Çevresinde dar yeşil peyzaj şeridi'],
    description: 'Referans fotoğrafın kuzeydoğusundaki bağımsız depo. Beyaz çevre şeritleri ve koyu fotovoltaik bantları bina kimliğinin temel parçalarıdır.',
    visible: true,
  },
  {
    id: 'bldg-08', name: 'Kuzey Yardımcı Bina', code: 'YRD-08', type: 'building',
    category: 'utility_energy', categoryLabel: 'Yardımcı Bina',
    dimensions: { width: 11, depth: 7, height: 3.2 }, position: [-49, 1.6, -87], rotationY: 0,
    roofType: 'flat_parapet', wallColor: '#bdc3b9', roofColor: '#c9cec3',
    footprintAreaM2: 77, operationalStatus: 'Hazırda Beklemede',
    features: ['Kuzey sınırının yakınında küçük servis yapısı', 'Düşük profilli açık renk çatı'],
    description: 'Fotoğrafın üst kenarında görülen küçük yardımcı yapı; bina işlevi referansta belirtilmemiştir.',
    visible: true,
  },
  {
    id: 'bldg-09', name: 'Kantar ve Güvenlik', code: 'GUV-09', type: 'building',
    category: 'security_admin', categoryLabel: 'Kantar ve Güvenlik',
    dimensions: { width: 15, depth: 7, height: 3 }, position: [-43, 1.5, -25], rotationY: 0,
    roofType: 'flat_parapet', wallColor: '#d8dacd', roofColor: '#b4bbb0',
    footprintAreaM2: 105, operationalStatus: 'Aktif İzleme',
    features: ['Batı girişindeki alçak güvenlik yapısı', 'Yanında doğrusal araç tartım platformu', 'Ana bulvara açılan kontrollü giriş sahası'],
    description: 'Referansta mor sınırla gösterilen kantar ve güvenlik bölgesi. Ana giriş, güvenlik binası ve taşıt kantarı aynı avlu içerisinde yer alır.',
    visible: true,
  },
  ...REFERENCE_SEED_WAREHOUSES,
  {
    id: 'bldg-11', name: 'Güney Servis ve Bakım Binası', code: 'SRV-11', type: 'building',
    category: 'utility_energy', categoryLabel: 'Saha Servisi',
    dimensions: { width: 14, depth: 5, height: 3 }, position: [13, 1.5, 80], rotationY: 0,
    roofType: 'flat_parapet', wallColor: '#c0c5b9', roofColor: '#9da69a',
    footprintAreaM2: 70, operationalStatus: 'Hazırda Beklemede',
    features: ['Güney sınırında küçük yardımcı yapı', 'Çevre yolunun dışında servis cebi'],
    description: 'Güney çevre şeridindeki küçük servis yapısı. Yol ile arazi sınırı arasındaki açık alanı tamamlar.',
    visible: true,
  },
];

const REFERENCE_ROADS: RoadEntity[] = [
  {
    id: 'road-01', name: 'Batı Ana Erişim Yolu', type: 'road',
    points: [[-80, -96], [-78, -83], [-74, -70], [-73, -54], [-70, -42], [-66, -33], [-64, -22], [-64, -3], [-64, 90]],
    width: 7, surfaceType: 'asphalt', visible: true,
  },
  {
    id: 'road-02', name: 'Tır Parkı Giriş Bağlantısı', type: 'road',
    points: [[-119, 0], [-89, 0], [-73, 0], [-67, -2], [-64, -6]],
    width: 6, surfaceType: 'asphalt', visible: true,
  },
  {
    id: 'road-03', name: 'Ana Tesis Bulvarı', type: 'road',
    points: [[-64, -16], [-44, -16], [-19, -16], [99, -16]],
    width: 6, surfaceType: 'asphalt', visible: true,
  },
  {
    id: 'road-04', name: 'Ana Fabrika Çevre Yolu', type: 'road',
    points: [[99, -16], [104, -14], [107, -9], [108, -2], [108, 66], [106, 72], [101, 77], [96, 78], [47, 78], [42, 75], [38, 70], [33, 69], [-44, 69], [-50, 66], [-55, 60], [-55, 10], [-53, 4], [-49, 1], [-25, 1], [-21, -2], [-21, -9], [-18, -16]],
    width: 5.8, surfaceType: 'asphalt', visible: true,
  },
  {
    id: 'road-05', name: 'Kuzey Depo Servis Yolu', type: 'road',
    points: [[12, -16], [12, -72], [14, -79], [19, -82], [62, -82], [69, -78], [72, -70], [72, -29], [69, -23], [64, -19]],
    width: 4.2, surfaceType: 'asphalt', visible: true,
  },
  {
    id: 'road-06', name: 'Güney Çevre Servis Bağlantısı', type: 'road',
    points: [[-119, 86], [-82, 86], [-64, 86], [-32, 85], [40, 85]],
    width: 4, surfaceType: 'gravel', visible: true,
  },
  {
    // Public road along the northern map edge; road-01 meets it in a T at its first point.
    id: 'road-07', name: 'Kamu Yolu · Kuzey Bağlantısı', type: 'road',
    points: [[-135, -96], [-80, -96], [135, -96]],
    width: 6.5, surfaceType: 'asphalt', visible: true,
  },
];

const REFERENCE_PARKING: ParkingEntity[] = [
  {
    id: 'prk-01', name: 'Tır Parkı · Batı Sırası', type: 'parking', parkingType: 'truck',
    position: [-112, 0.04, -39.5], dimensions: [14.5, 55], rotationY: 0, slotCount: 8,
    visible: true,
  },
  {
    id: 'prk-02', name: 'Tır Parkı · Doğu Sırası', type: 'parking', parkingType: 'truck',
    position: [-88, 0.04, -39.5], dimensions: [14.5, 55], rotationY: 0, slotCount: 8,
    visible: true,
  },
  {
    id: 'prk-03', name: 'Batı Depo Yükleme Cebi', type: 'parking', parkingType: 'loading_bay',
    position: [-37, 0.04, 52], dimensions: [12, 22], rotationY: Math.PI / 2, slotCount: 5,
    visible: true,
  },
];

const truckCabColors = ['#e1e3dc', '#ae3b30', '#e5e5df', '#dde0d7', '#35536b', '#e8e6de', '#a83b31', '#d9ded9'];

// Two orderly rows leave a clear central aisle and keep every vehicle inside the truck precinct.
// Trucks standing at dock doors are not listed here; they come from the dock feed (LoadingDocks).
const REFERENCE_VEHICLES: VehicleEntity[] = Array.from({ length: 14 }, (_, index) => {
  const row = index < 8 ? 0 : 1;
  const slot = index % 8;
  return {
    id: `trk-${String(index + 1).padStart(2, '0')}`,
    name: `Tır Parkı · Araç ${String(index + 1).padStart(2, '0')}`,
    type: 'vehicle', vehicleType: 'semi_trailer',
    position: [row === 0 ? -112 : -88, 0, -63.5 + slot * 6.875],
    rotationY: row === 0 ? -Math.PI / 2 : Math.PI / 2,
    cabColor: truckCabColors[slot], trailerColor: index % 5 === 0 ? '#d2d8d6' : '#eef0e8',
    visible: true,
  };
});

const REFERENCE_INFRASTRUCTURE: InfrastructureEntity[] = [
  {
    id: 'inf-01', name: 'Teknik Avlu Tankları', type: 'infrastructure', infraType: 'silo_tanks',
    position: [74, 0, -4], rotationY: Math.PI / 2, dimensions: [8.5, 8.5, 3],
    visible: true,
  },
  {
    id: 'inf-02', name: 'Kuzeydoğu Açık İstif Sahası', type: 'infrastructure', infraType: 'pallet_stacks',
    position: [88, 0, -4], rotationY: 0, dimensions: [9, 9, 1.8],
    visible: true,
  },
  {
    id: 'inf-03', name: 'Giriş Taşıt Kantarı', type: 'infrastructure', infraType: 'weighbridge_gate',
    position: [-44, 0, -16], rotationY: Math.PI / 2, dimensions: [2.5, 10, 2],
    visible: true,
  },
  {
    id: 'inf-04', name: 'Güney Servis İstif Alanı', type: 'infrastructure', infraType: 'pallet_stacks',
    position: [-12, 0, 79], rotationY: 0, dimensions: [9, 8, 1.2],
    visible: true,
  },
];

const REFERENCE_GROUND_AREAS: GroundAreaEntity[] = [
  {
    id: 'yard-truck-park', name: 'Tır Parkı Beton Sahası', type: 'ground_area',
    center: [-100, -38], dimensions: [40, 66], surfaceType: 'concrete_apron',
    label: 'Tır Parkı', visible: true,
  },
  {
    id: 'yard-north-graded', name: 'Kuzey Açık Arazi', type: 'ground_area',
    center: [-22, -52], dimensions: [54, 48], surfaceType: 'compacted_earth',
    label: 'Açık Arazi', visible: true,
  },
  {
    id: 'yard-security', name: 'Kantar ve Güvenlik Avlusu', type: 'ground_area',
    center: [-44, -20], dimensions: [34, 22], surfaceType: 'concrete_apron',
    label: 'Giriş Kontrol', visible: true,
  },
  {
    id: 'yard-north-warehouse', name: 'Kuzey Depo Servis Avlusu', type: 'ground_area',
    center: [43, -51], dimensions: [49, 58], surfaceType: 'concrete_apron',
    label: 'Depo Servis Sahası', visible: true,
  },
  {
    id: 'yard-west-logistics', name: 'Batı Depo Yükleme Avlusu', type: 'ground_area',
    center: [-36, 50], dimensions: [31, 25], surfaceType: 'concrete_apron',
    label: 'Yükleme Avlusu', visible: true,
  },
  {
    id: 'yard-main-north', name: 'Ana Fabrika Teknik Avlusu', type: 'ground_area',
    center: [16, 4], dimensions: [70, 30], surfaceType: 'concrete_apron',
    label: 'Teknik Avlu', visible: true,
  },
  {
    id: 'yard-main-south', name: 'Ana Fabrika Güney Apronu', type: 'ground_area',
    center: [18, 61], dimensions: [72, 7], surfaceType: 'concrete_apron',
    visible: true,
  },
  {
    id: 'yard-east-staging', name: 'Doğu Depo Servis Apronu', type: 'ground_area',
    center: [99.5, 34], dimensions: [6, 68], surfaceType: 'concrete_apron',
    visible: true,
  },
  {
    id: 'yard-solar-south', name: 'Güneş Panelli Blok Güney Apronu', type: 'ground_area',
    center: [74, 69], dimensions: [48, 7], surfaceType: 'concrete_apron',
    visible: true,
  },
  {
    id: 'yard-seed-storage', name: 'Tohum Depoları Beton Zemini', type: 'ground_area',
    center: [-88, 44], dimensions: [41, 70], surfaceType: 'concrete_apron',
    visible: true,
  },
  {
    id: 'yard-south-apron', name: 'Güney Servis Cebi', type: 'ground_area',
    center: [8, 79], dimensions: [38, 8], surfaceType: 'graded_gravel',
    visible: true,
  },
];

// Apply one consistent horizontal transform to the existing inventory. Keep heights,
// IDs, rotations and entity counts intact; the ground remains 540 × 440 units.
export const DEFAULT_BUILDINGS: BuildingEntity[] = REFERENCE_BUILDINGS.map((building) => ({
  ...building,
  position: referencePosition(building.position),
  dimensions: referenceDimensions(building.dimensions),
  footprintAreaM2: building.dimensions.width * building.dimensions.depth * SITE_PLAN_SCALE ** 2,
}));
export const DEFAULT_ROADS: RoadEntity[] = REFERENCE_ROADS.map((road) => ({
  ...road, points: road.points.map(referencePoint), width: road.width * SITE_PLAN_SCALE,
}));
export const DEFAULT_PARKING: ParkingEntity[] = REFERENCE_PARKING.map((park) => park.id === 'prk-03' ? {
  ...park, name: 'Yükleme Rampası · Geri Yanaşma Cepleri',
  position: [112, LOADING_DOCK.floorY + 0.025, -1.5], dimensions: [18, 14], rotationY: 0, slotCount: 2,
} : {
  ...park, position: referencePosition(park.position), dimensions: referenceDimensions(park.dimensions),
});
export const DEFAULT_VEHICLES: VehicleEntity[] = REFERENCE_VEHICLES.map((vehicle) => ({
  ...vehicle, position: referencePosition(vehicle.position),
}));
export const DEFAULT_INFRASTRUCTURE: InfrastructureEntity[] = REFERENCE_INFRASTRUCTURE.map((item) => ({
  ...item,
  name: item.id === 'inf-01' ? 'Güney Servis Alanı · Tanklar' : item.id === 'inf-02' ? 'Güney Servis Alanı · Paletler' : item.name,
  position: item.id === 'inf-01' ? [170, 0, 141] : item.id === 'inf-02' ? [145, 0, 141] : referencePosition(item.position),
  dimensions: item.dimensions ? referenceDimensions(item.dimensions) : undefined,
}));
export const DEFAULT_GROUND_AREAS: GroundAreaEntity[] = REFERENCE_GROUND_AREAS.map((area) => ({
  ...area, center: referencePoint(area.center), dimensions: referenceDimensions(area.dimensions),
}));

// Compatibility exports used by the non-editable renderers.
export const BUILDINGS = DEFAULT_BUILDINGS;
export const YARDS = DEFAULT_GROUND_AREAS;
export const TRUCKS = DEFAULT_VEHICLES;
