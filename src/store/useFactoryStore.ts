import { create } from 'zustand';
import type { BuildingEntity, RoadEntity, ParkingEntity, VehicleEntity, InfrastructureEntity, GroundAreaEntity, ViewPreset } from '../types/factory';
import { DEFAULT_BUILDINGS, DEFAULT_ROADS, DEFAULT_PARKING, DEFAULT_VEHICLES, DEFAULT_INFRASTRUCTURE, DEFAULT_GROUND_AREAS } from '../data/factoryLayout';
import { SITE_BOUNDARY } from '../data/sitePlan';
import { detailCamera, seedStorageCamera } from '../data/cameraPresets';
import { bankCenter, DOCK_BANKS, DOCK_DOORS } from '../data/dockBanks';
import type { LogisticsArea } from '../types/logistics';

type Position = [number, number, number];
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
  setViewPreset: (preset: ViewPreset) => void;
  toggleZoneOverlay: () => void;
  focusOnBuilding: (id: string) => void;
  focusOnGroundPosition: (position: Position) => void;
  clearCameraTransition: () => void;
  cancelCameraTransition: () => void;
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
