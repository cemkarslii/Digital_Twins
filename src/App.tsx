import { FactoryCanvas } from './components/3d/FactoryCanvas';
import { CampusOverview } from './components/ui/CampusOverview';
import { LogisticsPanel } from './components/ui/LogisticsPanel';
import { SeedStoragePanel } from './components/ui/SeedStoragePanel';
import { InboundTrafficPanel } from './components/ui/InboundTrafficPanel';
import { LoadingDocksPanel } from './components/ui/LoadingDocksPanel';
import { WarehousePanel } from './components/ui/WarehousePanel';

export default function App() {
  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#b2b6ac] font-sans" aria-label="Endüstriyel kampüs 3D görünümü">
      <FactoryCanvas />
      <CampusOverview />
      <LogisticsPanel />
      <SeedStoragePanel />
      <InboundTrafficPanel />
      <LoadingDocksPanel />
      <WarehousePanel />
    </main>
  );
}
