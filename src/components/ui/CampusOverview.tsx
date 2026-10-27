import { Boxes, Building2, Container, Layers2, Map, MoveUpRight, Route, Sprout, Truck, Warehouse } from 'lucide-react';
import { useFactoryStore } from '../../store/useFactoryStore';
import type { ViewPreset } from '../../types/factory';

const views: { preset: ViewPreset; name: string; detail: string; icon: typeof Map }[] = [
  { preset: 'isometric', name: 'Kampüs', detail: 'GENEL PERSPEKTİF', icon: Map },
  { preset: 'west_logistics', name: 'Tır parkı', detail: 'BATI YERLEŞKESİ', icon: Truck },
  { preset: 'production_bay', name: 'Ana fabrika', detail: 'ÜRETİM KOMPLEKSİ', icon: Building2 },
  { preset: 'solar_focus', name: 'Kuzey depo', detail: 'GÜNEŞ ÇATISI', icon: Warehouse },
];

export function CampusOverview() {
  const { viewPreset, setViewPreset, showZoneOverlay, toggleZoneOverlay, openLogisticsArea, seedStorageOpen, openSeedStorage, closeSeedStorage, inboundOpen, openInbound, closeInbound, docksOpen, openDocks, closeDocks, warehouseOpen, openWarehouse, closeWarehouse } = useFactoryStore();
  return (
    <>
      {viewPreset !== 'top_down' && !warehouseOpen && (
        <div className="campus-caption pointer-events-none">
          <div className="campus-eyebrow"><span /> REFERANS YERLEŞİMİ</div>
          <h2>Fine Food Afyon Yerleşkesi</h2>
         
          <span className="campus-caption-note">Görsel referanstan modellenmiştir.</span>
        </div>
      )}
        <div className="campus-display-controls">
          <button onClick={() => setViewPreset('top_down')} aria-pressed={viewPreset === 'top_down'}>
            <Map size={14} /> Kuşbakışı
          </button>
          <button onClick={toggleZoneOverlay} aria-pressed={showZoneOverlay}>
            <Layers2 size={14} /> Bölge sınırları
          </button>
          <button onClick={() => seedStorageOpen ? closeSeedStorage() : openSeedStorage()} aria-pressed={seedStorageOpen}>
            <Sprout size={14} /> Tohum depoları
          </button>
          <button onClick={() => inboundOpen ? closeInbound() : openInbound()} aria-pressed={inboundOpen}>
            <Route size={14} /> Yoldaki araçlar
          </button>
          <button onClick={() => docksOpen ? closeDocks() : openDocks()} aria-pressed={docksOpen}>
            <Container size={14} /> Yükleme rampaları
          </button>
          <button onClick={() => warehouseOpen ? closeWarehouse() : openWarehouse()} aria-pressed={warehouseOpen}>
            <Boxes size={14} /> Depo içi
          </button>
        </div>
      <nav className="campus-view-switcher" aria-label="Kampüs perspektifleri">
        {views.map(({ preset, name, detail, icon: Icon }) => (
          <button key={preset} onClick={() => preset === 'west_logistics' ? openLogisticsArea('truck_park') : setViewPreset(preset)} aria-pressed={viewPreset === preset}>
            <Icon className="campus-view-icon" size={20} strokeWidth={1.4} />
            <span><small>{detail}</small><strong>{name}</strong></span>
            <MoveUpRight className="campus-view-arrow" size={13} />
          </button>
        ))}
      </nav>
    </>
  );
}
