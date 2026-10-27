import { create } from 'zustand';
import type { BuildingEntity, RoadEntity, ParkingEntity, VehicleEntity, InfrastructureEntity, GroundAreaEntity, ViewPreset } from '../types/factory';
import { DEFAULT_BUILDINGS, DEFAULT_ROADS, DEFAULT_PARKING, DEFAULT_VEHICLES, DEFAULT_INFRASTRUCTURE, DEFAULT_GROUND_AREAS } from '../data/factoryLayout';
import { SITE_BOUNDARY } from '../data/sitePlan';
import { detailCamera, seedStorageCamera } from '../data/cameraPresets';
import { bankCenter, DOCK_BANKS, DOCK_DOORS } from '../data/dockBanks';
import type { LogisticsArea } from '../types/logistics';
import type { WarehouseStep, WarehouseView } from '../types/warehouse';
import { rectCenter, WAREHOUSE_LAYOUT, warehouseWorld } from '../data/warehouseLayout';
import { faceKey, getRackLanes, sectionFaces } from '../data/warehouseLanes';

type Position = [number, number, number];
/** Warehouse mode cards that can be collapsed: the side panel and the navigation. */
export type WarehouseCard = 'panel' | 'nav';
interface CameraTarget { position: Position; lookAt: Position }

const GATE_CAMERA: CameraTarget = { position: [-148, 65, 24], lookAt: [-86, 0, -40] };
/** Public road traffic arrives over the first point of this road, where it leaves the map. */
export const CAMPUS_ENTRY_ROAD_ID = 'road-01';
/** Public road outside the boundary; inbound trucks reach the campus along it. */
export const PUBLIC_ROAD_ID = 'road-07';

/** Side panels are exclusive; every opener starts from this. */
const PANELS_CLOSED = {
  activeLogisticsArea: null,
  seedStorageOpen: false,
  selectedSeedWarehouseId: null,
  inboundOpen: false,
  docksOpen: false,
  selectedDockBankId: null,
  warehouseOpen: false,
  selectedWarehouseSectionId: null,
  selectedWarehouseLane: null,
} as const;

/**
 * Moves a view sideways so its subject lands left of centre, clear of the side panel.
 * `share` is the fraction of the horizontal distance to shift by.
 */
function clearOfPanel({ position, lookAt }: CameraTarget, share: number): CameraTarget {
  const fx = lookAt[0] - position[0], fz = lookAt[2] - position[2];
  // Screen-right on the ground plane is the view direction turned a quarter clockwise.
  const rx = -fz * share, rz = fx * share;
  return {
    position: [position[0] + rx, position[1], position[2] + rz],
    lookAt: [lookAt[0] + rx, lookAt[1], lookAt[2] + rz],
  };
}

/** One bank seen across its apron, or every bank framed from the south-east. */
function dockCamera(bankId?: string): CameraTarget {
  const bank = DOCK_BANKS.find((item) => item.id === bankId);
  if (bank) {
    const [x, , z] = bankCenter(bank);
    const [nx, nz] = bank.doors[0].normal;
    return clearOfPanel({
      position: [x + nx * 48 - nz * 30, 42, z + nz * 48 + nx * 30],
      lookAt: [x + nx * 9, 0, z + nz * 9],
    }, 0.4);
  }
  const xs = DOCK_DOORS.map(({ position }) => position[0]), zs = DOCK_DOORS.map(({ position }) => position[2]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) + 60;
  return clearOfPanel({ position: [cx + span * 0.3, span * 0.75, cz + span * 0.8], lookAt: [cx, 0, cz] }, 0.2);
}

/**
 * GES-02 interior: almost straight down with north up, shifted so the plan clears the side panel;
 * or one section seen from the south, along its aisles. Both keep north at the top of the screen.
 */
function warehouseCamera(sectionId?: string): CameraTarget {
  const section = WAREHOUSE_LAYOUT.sections.find((item) => item.id === sectionId);
  const { floorY } = WAREHOUSE_LAYOUT;
  if (section) {
    const [x, , z] = warehouseWorld(rectCenter(section.bounds), floorY);
    return { position: [x + 14, 66, z + 50], lookAt: [x + 14, floorY, z + 4] };
  }
  const [x, , z] = warehouseWorld(rectCenter(WAREHOUSE_LAYOUT.interior));
  return { position: [x + 32, 205, z + 52], lookAt: [x + 32, 0, z + 6] };
}

/**
 * A picker's view of an aisle face: standing on the far side of the aisle, `eye.back` metres from
 * `z` towards the corridor end, looking across at the face `look.ahead` metres from `z` towards the
 * back. Beam labels read and nothing stands between camera and face. Heights are absolute.
 */
function acrossAisle(sectionId: string | null, faceId: string, z: number, eye: { back: number; y: number }, look: { ahead: number; y: number }): CameraTarget | null {
  const section = WAREHOUSE_LAYOUT.sections.find((item) => item.id === sectionId);
  const face = section && sectionFaces(section.id).find((item) => item.key === faceId);
  const aisle = section?.aisles.find((item) => item.id === face?.aisleId);
  if (!face || !aisle) return null;
  const out = Math.sign(face.frontX - face.backX), along = Math.sign(face.endZ - face.startZ);
  return {
    position: warehouseWorld([face.frontX + out * (aisle.width - 0.6), z - along * eye.back], eye.y),
    lookAt: warehouseWorld([face.frontX, z + along * look.ahead], look.y),
  };
}

/** One lane at its own level, from five positions nearer the corridor: the lane, its pin and label in view. */
function laneCamera(index: number): CameraTarget | null {
  const lane = getRackLanes()[index];
  return acrossAisle(lane.sectionId, faceKey(lane), lane.z, { back: 5, y: lane.y + 1.6 }, { ahead: 0, y: lane.y + 0.25 });
}

/** One aisle face from behind position 1 at forklift-mast height, looking down the face. */
function faceCamera(sectionId: string | null, faceId: string): CameraTarget | null {
  const face = sectionId ? sectionFaces(sectionId).find((item) => item.key === faceId) : undefined;
  const { floorY } = WAREHOUSE_LAYOUT;
  return face ? acrossAisle(sectionId, faceId, face.startZ, { back: 3, y: floorY + 5 }, { ahead: 16, y: floorY + 2.6 }) : null;
}

/** One aisle face from behind position 1 at the height of one level, looking down that level. */
function levelCamera(sectionId: string, faceId: string, level: number): CameraTarget | null {
  const face = sectionFaces(sectionId).find((item) => item.key === faceId);
  const first = face?.lanes[level - 1]?.[0];
  if (first === undefined) return null;
  const { y } = getRackLanes()[first];
  return acrossAisle(sectionId, faceId, face!.startZ, { back: 3, y: y + 1.6 }, { ahead: 16, y: y + 0.25 });
}

/** Read-only campus content. Only camera and overlay presentation can change. */
interface FactoryViewState {
  buildings: BuildingEntity[];
  roads: RoadEntity[];
  parking: ParkingEntity[];
  vehicles: VehicleEntity[];
  infrastructure: InfrastructureEntity[];
  groundAreas: GroundAreaEntity[];
  viewPreset: ViewPreset | null;
  showZoneOverlay: boolean;
  cameraTransitionTarget: CameraTarget | null;
  activeLogisticsArea: LogisticsArea | null;
  openLogisticsArea: (area: LogisticsArea) => void;
  closeLogisticsPanel: () => void;
  /** Seed storage mode: transparent roofs, cold-room interiors and the depot panel. */
  seedStorageOpen: boolean;
  selectedSeedWarehouseId: string | null;
  openSeedStorage: (buildingId?: string) => void;
  closeSeedStorage: () => void;
  /** Inbound mode: trucks on public roads heading to the campus, outside the site boundary. */
  inboundOpen: boolean;
  openInbound: () => void;
  closeInbound: () => void;
  /** Dock mode: door status of every loading dock bank, optionally focused on one bank. */
  docksOpen: boolean;
  selectedDockBankId: string | null;
  openDocks: (bankId?: string) => void;
  closeDocks: () => void;
  /** Warehouse mode: see-through GES-02 roof; sections stay closed except the selected one. */
  warehouseOpen: boolean;
  selectedWarehouseSectionId: string | null;
  openWarehouse: (sectionId?: string) => void;
  /** Opens a section, or closes it again (back to the overview) if it is already open. */
  toggleWarehouseSection: (sectionId: string) => void;
  /** Index of the inspected rack lane (WMS bin), always inside the open section. */
  selectedWarehouseLane: number | null;
  /** Selects a lane, opening its section and cutting the rack at its level; `focus` also takes the camera into its aisle, facing it. */
  selectWarehouseLane: (index: number | null, focus?: boolean) => void;
  /** Top rack level shown in the open section: it and the levels below it are drawn; null draws every level. */
  warehouseLevel: number | null;
  /** Cuts the rack at a level; `focus` also looks down the shown aisle face at that height. */
  setWarehouseLevel: (level: number | null, focus?: boolean) => void;
  /** Starts as fill-coloured lane markers each time warehouse mode opens. */
  warehouseView: WarehouseView;
  setWarehouseView: (view: WarehouseView) => void;
  /** Aisle face shown in the open section (see faceKey); null shows every face. */
  warehouseFace: string | null;
  /** Side panel and navigation, each shrunk to its header on its own so more of the scene shows; kept across openings. */
  warehouseCollapsed: Record<WarehouseCard, boolean>;
  toggleWarehouseCollapsed: (card: WarehouseCard) => void;
  /** Shows one aisle face alone; `focus` also looks along it from inside its aisle. */
  setWarehouseFace: (face: string | null, focus?: boolean) => void;
  /** Goes back to `step`: clears its choice and every later one, and returns the camera to where that choice is made. */
  rewindWarehouse: (step: WarehouseStep) => void;
  closeWarehouse: () => void;
  setViewPreset: (preset: ViewPreset) => void;
  toggleZoneOverlay: () => void;
  focusOnBuilding: (id: string) => void;
  focusOnGroundPosition: (position: Position) => void;
  clearCameraTransition: () => void;
  cancelCameraTransition: () => void;
}

export const WAREHOUSE_STEPS: readonly WarehouseStep[] = ['section', 'face', 'level', 'bin'];

type WarehouseNavSource = Pick<FactoryViewState, 'selectedWarehouseSectionId' | 'warehouseFace' | 'warehouseLevel' | 'selectedWarehouseLane'>;

/** Aisle face the navigation is on: the face filter, or the selected lane's face when a search picked it. */
export function warehouseNavFace(s: WarehouseNavSource): string | null {
  return s.warehouseFace ?? (s.selectedWarehouseLane === null ? null : faceKey(getRackLanes()[s.selectedWarehouseLane]));
}

/** Index in WAREHOUSE_STEPS of the first choice still open; its length once a bin is selected. */
export function warehouseNavStep(s: WarehouseNavSource): number {
  const chosen = [s.selectedWarehouseSectionId, warehouseNavFace(s), s.warehouseLevel, s.selectedWarehouseLane];
  const open = chosen.findIndex((value) => value === null);
  return open === -1 ? WAREHOUSE_STEPS.length : open;
}

export const useFactoryStore = create<FactoryViewState>((set, get) => ({
  buildings: DEFAULT_BUILDINGS,
  roads: DEFAULT_ROADS,
  parking: DEFAULT_PARKING,
  vehicles: DEFAULT_VEHICLES,
  infrastructure: DEFAULT_INFRASTRUCTURE,
  groundAreas: DEFAULT_GROUND_AREAS,
  viewPreset: 'isometric',
  showZoneOverlay: true,
  cameraTransitionTarget: null,
  warehouseLevel: null,
  warehouseView: 'occupancy',
  warehouseFace: null,
  warehouseCollapsed: { panel: false, nav: false },
  ...PANELS_CLOSED,
  openLogisticsArea: (area) => {
    set(PANELS_CLOSED);
    if (area === 'truck_park') {
      set({ activeLogisticsArea: area, viewPreset: 'west_logistics', cameraTransitionTarget: detailCamera('west_logistics') });
    } else {
      set({ activeLogisticsArea: area, viewPreset: null, cameraTransitionTarget: GATE_CAMERA });
    }
  },
  closeLogisticsPanel: () => set({ activeLogisticsArea: null }),
  openSeedStorage: (buildingId) => {
    const building = buildingId ? get().buildings.find((item) => item.id === buildingId) : undefined;
    const [x, , z] = building?.position ?? [0, 0, 0];
    set({
      ...PANELS_CLOSED,
      seedStorageOpen: true,
      selectedSeedWarehouseId: building?.id ?? null,
      viewPreset: null,
      cameraTransitionTarget: building
        ? { position: [x + 18, 36, z + 28], lookAt: [x, 0, z] }
        : seedStorageCamera(),
    });
  },
  closeSeedStorage: () => set({ seedStorageOpen: false, selectedSeedWarehouseId: null }),
  openInbound: () => {
    const entry = get().roads.find((item) => item.id === CAMPUS_ENTRY_ROAD_ID)?.points[0];
    set({
      ...PANELS_CLOSED,
      inboundOpen: true,
      viewPreset: null,
      // The junction from inside the campus: both approach arms, the checkpoint and its sign.
      ...(entry && { cameraTransitionTarget: clearOfPanel({
        position: [entry[0] + 10, 150, entry[1] + 170],
        lookAt: [entry[0], 0, entry[1] + 6],
      }, 0.3) }),
    });
  },
  closeInbound: () => set({ inboundOpen: false }),
  openDocks: (bankId) => {
    const bank = DOCK_BANKS.find((item) => item.id === bankId);
    set({
      ...PANELS_CLOSED,
      docksOpen: true,
      selectedDockBankId: bank?.id ?? null,
      viewPreset: null,
      cameraTransitionTarget: dockCamera(bank?.id),
    });
  },
  closeDocks: () => set({ docksOpen: false, selectedDockBankId: null }),
  openWarehouse: (sectionId) => {
    const section = WAREHOUSE_LAYOUT.sections.find((item) => item.id === sectionId);
    set({
      ...PANELS_CLOSED,
      warehouseOpen: true,
      selectedWarehouseSectionId: section?.id ?? null,
      warehouseLevel: get().warehouseOpen ? get().warehouseLevel : null,
      warehouseView: get().warehouseOpen ? get().warehouseView : 'occupancy',
      // Faces belong to one section.
      warehouseFace: get().warehouseOpen && section?.id === get().selectedWarehouseSectionId ? get().warehouseFace : null,
      viewPreset: null,
      cameraTransitionTarget: warehouseCamera(section?.id),
    });
  },
  toggleWarehouseSection: (sectionId) => {
    get().openWarehouse(get().selectedWarehouseSectionId === sectionId ? undefined : sectionId);
  },
  selectWarehouseLane: (index, focus = false) => {
    const lane = index === null ? undefined : getRackLanes()[index];
    if (!lane) { set({ selectedWarehouseLane: null }); return; }
    if (!get().warehouseOpen || get().selectedWarehouseSectionId !== lane.sectionId) get().openWarehouse(lane.sectionId);
    // The rack is cut at the lane's level, so the lane is on top; a filter on another face would hide it.
    const face = get().warehouseFace;
    const camera = focus ? laneCamera(lane.index) : null;
    set({
      selectedWarehouseLane: lane.index,
      warehouseLevel: lane.level,
      ...(face !== null && face !== faceKey(lane) && { warehouseFace: faceKey(lane) }),
      ...(camera && { cameraTransitionTarget: camera }),
    });
  },
  setWarehouseLevel: (level, focus = false) => {
    const lane = get().selectedWarehouseLane;
    const keep = lane !== null && (level === null || getRackLanes()[lane].level <= level);
    const sectionId = get().selectedWarehouseSectionId, face = get().warehouseFace;
    const camera = focus && level !== null && sectionId && face ? levelCamera(sectionId, face, level) : null;
    set({ warehouseLevel: level, selectedWarehouseLane: keep ? lane : null, ...(camera && { cameraTransitionTarget: camera }) });
  },
  setWarehouseView: (view) => set({ warehouseView: view }),
  setWarehouseFace: (face, focus = false) => {
    const lane = get().selectedWarehouseLane;
    const keep = lane !== null && (face === null || faceKey(getRackLanes()[lane]) === face);
    const camera = focus && face ? faceCamera(get().selectedWarehouseSectionId, face) : null;
    set({ warehouseFace: face, selectedWarehouseLane: keep ? lane : null, ...(camera && { cameraTransitionTarget: camera }) });
  },
  rewindWarehouse: (step) => {
    const sectionId = get().selectedWarehouseSectionId, face = warehouseNavFace(get());
    if (step === 'section' || !sectionId) {
      get().openWarehouse();
      set({ warehouseLevel: null });
    } else if (step === 'face' || !face) {
      get().openWarehouse(sectionId);
      set({ warehouseFace: null, warehouseLevel: null });
    } else if (step === 'level') {
      const camera = faceCamera(sectionId, face);
      set({ warehouseFace: face, warehouseLevel: null, selectedWarehouseLane: null, ...(camera && { cameraTransitionTarget: camera }) });
    } else {
      set({ warehouseFace: face, selectedWarehouseLane: null });
    }
  },
  toggleWarehouseCollapsed: (card) => set((state) => ({ warehouseCollapsed: { ...state.warehouseCollapsed, [card]: !state.warehouseCollapsed[card] } })),
  closeWarehouse: () => set({ warehouseOpen: false, selectedWarehouseSectionId: null, selectedWarehouseLane: null, warehouseFace: null }),

  setViewPreset: (preset) => {
    set(PANELS_CLOSED);
    const detail = detailCamera(preset);
    if (detail) {
      set({ viewPreset: preset, cameraTransitionTarget: detail });
      return;
    }
    const minX = Math.min(...SITE_BOUNDARY.map(([x]) => x));
    const maxX = Math.max(...SITE_BOUNDARY.map(([x]) => x));
    const minZ = Math.min(...SITE_BOUNDARY.map(([, z]) => z));
    const maxZ = Math.max(...SITE_BOUNDARY.map(([, z]) => z));
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const aspect = typeof window === 'undefined' ? 1.5 : window.innerWidth / window.innerHeight;
    const distance = Math.max(maxZ - minZ, (maxX - minX) / aspect) / (2 * Math.tan(Math.PI / 8)) * 1.18;
    const position: Position = preset === 'top_down'
      ? [cx, distance, cz + 0.1]
      : [cx + (maxX - minX) * 0.12, distance, cz + distance * 0.62];
    set({ viewPreset: preset, cameraTransitionTarget: { position, lookAt: [cx, 0, cz] } });
  },
  toggleZoneOverlay: () => set((state) => ({ showZoneOverlay: !state.showZoneOverlay })),
  focusOnBuilding: (id) => {
    if (id === 'bldg-09') { get().openLogisticsArea('gate_security'); return; }
    const building = get().buildings.find((item) => item.id === id);
    if (!building) return;
    if (building.category === 'agri_storage') { get().openSeedStorage(id); return; }
    if (building.id === WAREHOUSE_LAYOUT.buildingId) { get().openWarehouse(); return; }
    const [x, y, z] = building.position;
    const extent = Math.max(building.dimensions.width, building.dimensions.depth);
    set({ ...PANELS_CLOSED, viewPreset: null, cameraTransitionTarget: {
      position: [x + extent * 0.8 + 12, y + extent * 0.85 + 16, z + extent * 0.9 + 12],
      lookAt: [x, y, z],
    } });
  },
  focusOnGroundPosition: ([x, , z]) => set({ viewPreset: null, cameraTransitionTarget: {
    position: [x + 65, 70, z + 65], lookAt: [x, 0, z],
  } }),
  clearCameraTransition: () => set({ cameraTransitionTarget: null }),
  cancelCameraTransition: () => set({ cameraTransitionTarget: null, viewPreset: null }),
}));
