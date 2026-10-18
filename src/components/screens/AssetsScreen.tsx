import React, { useState, useMemo } from 'react';
import { useMonopoli } from '../../context/MonopoliContext';
import { AssetItem, ColorGroup, AssetCategory } from '../../types/monopoli';
import { COLOR_GROUP_CONFIG } from '../../data/mockIndonesianAssets';
import { formatRupiah, getPawnBadge } from '../../utils/formatters';
import { 
  Building2, 
  Search, 
  Filter, 
  Home, 
  Landmark, 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Tag
} from 'lucide-react';

export const AssetsScreen: React.FC = () => {
  const { assets, members, currentMember, room, submitRequest } = useMonopoli();

  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'bank' | 'mortgaged'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);

  // Filter logic
  const filteredAssets = useMemo(() => {
    return assets.filter(item => {
      // Tab filter
      if (activeTab === 'mine' && item.ownerId !== currentMember?.uid) return false;
      if (activeTab === 'bank' && item.ownerId !== null) return false;
      if (activeTab === 'mortgaged' && !item.isMortgaged) return false;

      // Group filter
      if (selectedGroup !== 'all' && item.group !== selectedGroup) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(query) || item.group.toLowerCase().includes(query);
      }

      return true;
    });
  }, [assets, activeTab, selectedGroup, searchQuery, currentMember]);

  const bankCount = assets.filter(a => a.ownerId === null).length;
  const myCount = assets.filter(a => a.ownerId === currentMember?.uid).length;
  const mortgagedCount = assets.filter(a => a.isMortgaged).length;

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return 'Bank Sentral';
    const member = members.find(m => m.uid === ownerId);
    return member ? member.displayName : 'Pemain Lain';
  };

  const getOwnerBadge = (ownerId: string | null) => {
    if (!ownerId) {
      return {
        label: 'Tersedia di Bank',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    }
    if (ownerId === currentMember?.uid) {
      return {
        label: 'Milik Saya',
        className: 'bg-blue-50 text-blue-800 border-blue-200',
        dot: 'bg-blue-500'
      };
    }
    const member = members.find(m => m.uid === ownerId);
    return {
      label: `Milik: ${member?.displayName || 'Pemain'}`,
      className: 'bg-slate-100 text-slate-800 border-slate-200',
      dot: 'bg-slate-500'
    };
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Katalog Aset Permainan</h1>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
            Label: Data Simulasi
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Satu sumber kebenaran (Single Source of Truth). Seluruh pemain dan bank membaca status kepemilikan aset yang sama tanpa duplikasi.
        </p>

        {/* Counter Stats */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-medium">Di Bank</span>
            <p className="text-sm font-extrabold text-emerald-700">{bankCount} Aset</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-medium">Aset Saya</span>
            <p className="text-sm font-extrabold text-blue-700">{myCount} Aset</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-medium">Digadaikan</span>
            <p className="text-sm font-extrabold text-slate-700">{mortgagedCount} Aset</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all ${
            activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Semua ({assets.length})
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all ${
            activeTab === 'bank' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Di Bank ({bankCount})
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all ${
            activeTab === 'mine' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Milik Saya ({myCount})
        </button>
        <button
          onClick={() => setActiveTab('mortgaged')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all ${
            activeTab === 'mortgaged' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Gadai ({mortgagedCount})
        </button>
      </div>

      {/* Search & Group Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari aset (contoh: Monas, Kuta, Borobudur, Gambir)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Group Scrollable Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <button
            onClick={() => setSelectedGroup('all')}
            className={`px-3 py-1 rounded-full whitespace-nowrap font-medium border transition-all ${
              selectedGroup === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua Kelompok
          </button>
          {Object.entries(COLOR_GROUP_CONFIG).map(([grpKey, conf]) => (
            <button
              key={grpKey}
              onClick={() => setSelectedGroup(grpKey)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium border flex items-center gap-1.5 transition-all ${
                selectedGroup === grpKey
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${conf.bgClass}`} />
              <span>{conf.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">Tidak ada aset ditemukan</p>
          <p className="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau tab filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredAssets.map((asset) => {
            const groupConf = COLOR_GROUP_CONFIG[asset.group];
            const ownerBadge = getOwnerBadge(asset.ownerId);

            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all overflow-hidden cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Color Header Bar */}
                  <div className={`h-3 w-full ${groupConf.bgClass}`} />

                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          {groupConf.label} • {asset.category === 'property' ? 'Properti' : asset.category === 'transport' ? 'Stasiun' : 'Utilitas'}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 tracking-tight leading-snug">
                          {asset.name}
                        </h3>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 whitespace-nowrap">
                        {formatRupiah(asset.buyPrice)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Sewa Dasar: <strong>{formatRupiah(asset.rentBase)}</strong></span>
                      <span>Hipotek: <strong>{formatRupiah(asset.mortgageValue)}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="px-3.5 pb-3 pt-0 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ownerBadge.className}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ownerBadge.dot}`} />
                    <span>{ownerBadge.label}</span>
                  </span>

                  <span className="text-[10px] text-emerald-600 font-semibold hover:underline">
                    Rincian Hak Milik →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Property Deed Modal (Surat Hak Milik) */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Deed Header styled like classic physical title deed card */}
            <div className="border-2 border-slate-900 rounded-2xl overflow-hidden p-0.5">
              <div className={`p-3 text-center text-white ${COLOR_GROUP_CONFIG[selectedAsset.group].bgClass}`}>
                <span className="text-[9px] font-bold tracking-widest uppercase block opacity-80">
                  SURAT HAK MILIK (TITLE DEED)
                </span>
                <h3 className="text-sm font-extrabold tracking-tight mt-0.5">
                  {selectedAsset.name}
                </h3>
                <span className="text-[10px] opacity-90 block mt-0.5">
                  Preset: Data Simulasi Monopoli Indonesia
                </span>
              </div>

              <div className="p-4 space-y-3 bg-white text-xs">
                <div className="flex justify-between font-bold text-slate-900 border-b border-slate-100 pb-2">
                  <span>Harga Pembelian</span>
                  <span className="text-emerald-700">{formatRupiah(selectedAsset.buyPrice)}</span>
                </div>

                <div className="flex justify-between text-slate-700">
                  <span>Sewa Tanah Kosong</span>
                  <span className="font-semibold">{formatRupiah(selectedAsset.rentBase)}</span>
                </div>

                {selectedAsset.rentOneHouse && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100 text-slate-600 text-[11px]">
                    <div className="flex justify-between">
                      <span>Dengan 1 Rumah</span>
                      <span className="font-semibold">{formatRupiah(selectedAsset.rentOneHouse)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dengan 2 Rumah</span>
                      <span className="font-semibold">{formatRupiah(selectedAsset.rentTwoHouses || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dengan 3 Rumah</span>
                      <span className="font-semibold">{formatRupiah(selectedAsset.rentThreeHouses || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dengan 4 Rumah</span>
                      <span className="font-semibold">{formatRupiah(selectedAsset.rentFourHouses || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Dengan HOTEL</span>
                      <span className="text-emerald-700">{formatRupiah(selectedAsset.rentHotel || 0)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Nilai Hipotek (Gadai)</span>
                    <span className="font-semibold">{formatRupiah(selectedAsset.mortgageValue)}</span>
                  </div>
                  {selectedAsset.houseCost && (
                    <div className="flex justify-between">
                      <span>Biaya 1 Rumah</span>
                      <span className="font-semibold">{formatRupiah(selectedAsset.houseCost)}</span>
                    </div>
                  )}
                  {selectedAsset.hotelCost && (
                    <div className="flex justify-between">
                      <span>Biaya 1 Hotel (+4 Rumah)</span>
                      <span className="font-semibold">{formatRupiah(selectedAsset.hotelCost)}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 italic mt-1">
                    *Sewa berlipat ganda (2x) jika memiliki seluruh properti dalam kelompok warna yang sama.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block">Status Kepemilikan:</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {getOwnerName(selectedAsset.ownerId)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Tutup Kartu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
