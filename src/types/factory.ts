export type BuildingCategory =
  | 'processing'
  | 'solar_logistics'
  | 'cold_storage'
  | 'utility_energy'
  | 'security_admin'
  | 'agri_storage';

export type RoofType =
  | 'solar_dense'           // Full coverage photovoltaic array
  | 'solar_striped'         // Alternating light strips and solar banks
  | 'gable_multi_bay'       // Multi-bay longitudinal ridged industrial metal
  | 'ridged_single_bay'     // Single or double ridge light panels
  | 'flat_parapet'          // Utility flat roof with HVAC units
  | 'skeletal_truss';       // Structural open truss grid with shade canopies

export interface SolarSpec {
  installedPanels: number;
  capacityKwp: number;
  orientation: string;
  tiltAngle: number;
  estimatedAnnualMwh: number;
  inverterCount: number;
}

export interface BuildingEntity {
  id: string;
  name: string;
  code: string;
  type: 'building';
  category: BuildingCategory;
  categoryLabel: string;
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  position: [number, number, number]; // [x, y, z]
  rotationY: number; // Radians
  roofType: RoofType;
  wallColor: string;
  roofColor: string;
  solarSpec?: SolarSpec;
  features: string[];
  description: string;
  operationalStatus: 'Operational' | 'Active Monitoring' | 'Standby' | 'Operasyonel' | 'Aktif İzleme' | 'Hazırda Beklemede';
  temperatureZone?: string;
  footprintAreaM2: number;
  /** Face that carries the administration office front, if any. */
  officeFacade?: 'north' | 'south' | 'east' | 'west';
  visible: boolean;
}

export interface RoadEntity {
  id: string;
  name: string;
  type: 'road';
  points: [number, number][]; // [x, z] control points
  width: number;
  surfaceType: 'asphalt' | 'concrete' | 'gravel';
  visible: boolean;
}

export interface ParkingEntity {
  id: string;
  name: string;
  type: 'parking';
  parkingType: 'truck' | 'car' | 'loading_bay';
  position: [number, number, number]; // [x, y, z]
  dimensions: [number, number]; // [width, depth]
  rotationY: number;
  slotCount: number;
  visible: boolean;
}

export interface VehicleEntity {
  id: string;
  name: string;
  type: 'vehicle';
  vehicleType: 'semi_trailer' | 'box_truck' | 'flatbed';
  position: [number, number, number]; // [x, y, z]
  rotationY: number;
  cabColor: string;
  trailerColor: string;
  visible: boolean;
}

export interface InfrastructureEntity {
  id: string;
  name: string;
  type: 'infrastructure';
  infraType: 'silo_tanks' | 'weighbridge_gate' | 'transformer' | 'pallet_stacks';
  position: [number, number, number]; // [x, y, z]
  rotationY: number;
  dimensions?: [number, number, number];
  visible: boolean;
}

export interface GroundAreaEntity {
  id: string;
  name: string;
  type: 'ground_area';
  surfaceType: 'concrete_apron' | 'graded_gravel' | 'compacted_earth';
  center: [number, number]; // [x, z]
  dimensions: [number, number]; // [width, depth]
  label?: string;
  visible: boolean;
}

export type ViewPreset = 'isometric' | 'top_down' | 'solar_focus' | 'west_logistics' | 'production_bay';
