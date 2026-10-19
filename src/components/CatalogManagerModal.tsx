import React, { useState } from 'react';
import { useMonopoli } from '../context/MonopoliContext';
import { AssetItem, GroupId, PropertyStatus } from '../types/monopoli';
import { GROUP_ABCD_CONFIG } from '../data/mockIndonesianAssets';
import { formatRupiah } from '../utils/formatters';
import { getGroupStatistics, calculateRent } from '../utils/rentCalculator';
import { 
  Building2, 
  Plus, 
  X, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Check, 
  ShieldCheck, 
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface CatalogManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GROUP_IDS: GroupId[] = ['A', 'B', 'C', 'D'];

export const CatalogManagerModal: React.FC<CatalogManagerModalProps> = ({ isOpen, onClose }) => {
  const { room, assets, isHost, createProperty, updateProperty, deleteProperty, confirmGroup } = useMonopoli();

  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [deedModalAsset, setDeedModalAsset] = useState<AssetItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState<GroupId>('A');
  const [boardPosition, setBoardPosition] = useState<string>('');
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [rentBase, setRentBase] = useState<string>('');
  const [rentOneHouse, setRentOneHouse] = useState<string>('');
  const [rentTwoHouses, setRentTwoHouses] = useState<string>('');
  const [rentThreeHouses, setRentThreeHouses] = useState<string>('');
  const [rentFourHouses, setRentFourHouses] = useState<string>('');
  const [rentHotel, setRentHotel] = useState<string>('');
  const [mortgageValue, setMortgageValue] = useState<string>('');
  const [houseCost, setHouseCost] = useState<string>('');
  const [hotelCost, setHotelCost] = useState<string>('');
  const [status, setStatus] = useState<PropertyStatus>('ready');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const isLobby = room?.status === 'lobby';

  const resetForm = () => {
    setName('');
    setGroupId('A');
    setBoardPosition('');
    setBuyPrice('');
    setRentBase('');
    setRentOneHouse('');
    setRentTwoHouses('');
    setRentThreeHouses('');
    setRentFourHouses('');
    setRentHotel('');
    setMortgageValue('');
    setHouseCost('');
    setHotelCost('');
    setStatus('ready');
    setEditingAsset(null);
    setFormError(null);
  };

  const openAddForm = (defaultGroup?: GroupId) => {
    resetForm();
    if (defaultGroup) setGroupId(defaultGroup);
    setFormOpen(true);
  };

  const openEditForm = (asset: AssetItem) => {
    setEditingAsset(asset);
    setName(asset.name);
    setGroupId(asset.groupId || 'A');
    setBoardPosition(asset.boardPosition ? String(asset.boardPosition) : '');
    setBuyPrice(String(asset.buyPrice || ''));
    setRentBase(String(asset.rentBase || ''));
    setRentOneHouse(String(asset.rentOneHouse || ''));
    setRentTwoHouses(String(asset.rentTwoHouses || ''));
    setRentThreeHouses(String(asset.rentThreeHouses || ''));
    setRentFourHouses(String(asset.rentFourHouses || ''));
    setRentHotel(String(asset.rentHotel || ''));
    setMortgageValue(String(asset.mortgageValue || ''));
    setHouseCost(String(asset.houseCost || ''));
    setHotelCost(String(asset.hotelCost || ''));
    setStatus(asset.status || 'ready');
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Nama properti wajib diisi.');
      return;
    }

    const payload: Partial<AssetItem> = {
      name: name.trim(),
      groupId,
      boardPosition: boardPosition ? parseInt(boardPosition, 10) : undefined,
      buyPrice: Math.max(0, parseInt(buyPrice, 10) || 0),
      rentBase: Math.max(0, parseInt(rentBase, 10) || 0),
      rentOneHouse: Math.max(0, parseInt(rentOneHouse, 10) || 0),
      rentTwoHouses: Math.max(0, parseInt(rentTwoHouses, 10) || 0),
      rentThreeHouses: Math.max(0, parseInt(rentThreeHouses, 10) || 0),
      rentFourHouses: Math.max(0, parseInt(rentFourHouses, 10) || 0),
      rentHotel: Math.max(0, parseInt(rentHotel, 10) || 0),
      mortgageValue: Math.max(0, parseInt(mortgageValue, 10) || 0),
      houseCost: Math.max(0, parseInt(houseCost, 10) || 0),
      hotelCost: Math.max(0, parseInt(hotelCost, 10) || 0),
      status,
      category: 'property',
    };

    setIsSubmitting(true);
    try {
      if (editingAsset) {
        await updateProperty(editingAsset.id, payload);
        setFeedbackMsg({ type: 'success', text: `Properti "${payload.name}" berhasil diperbarui!` });
      } else {
        await createProperty(payload);
        setFeedbackMsg({ type: 'success', text: `Properti "${payload.name}" berhasil ditambahkan ke Kelompok ${payload.groupId}!` });
      }
      setFormOpen(false);
      resetForm();
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan properti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (asset: AssetItem) => {
    if (!window.confirm(`Hapus properti "${asset.name}" dari katalog?`)) return;
    try {
      await deleteProperty(asset.id);
      setFeedbackMsg({ type: 'success', text: `Properti "${asset.name}" telah dihapus.` });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus properti.');
    }
  };

  const handleToggleConfirmGroup = async (gId: GroupId) => {
    if (!room) return;
    const isCurrentlyConfirmed = room.groupsConfig?.[gId]?.isConfirmed ?? false;
    try {
      await confirmGroup(gId, !isCurrentlyConfirmed);
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah konfirmasi kelompok.');
    }
  };

  const filteredAssets = assets.filter(item => {
    if (activeGroupFilter === 'all') return true;
    return item.groupId === activeGroupFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Kelola Katalog Properti (A, B, C, D)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Host mengatur properti fisik permainan Monopoli. Kelompok A–D dapat dikonfirmasi saat terisi lengkap.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Strip */}
        {feedbackMsg && (
          <div className={`py-2 px-4 text-xs font-semibold flex items-center gap-2 ${
            feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-rose-50 text-rose-800 border-b border-rose-200'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Main Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Summary Matrix for Groups A, B, C, D */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {GROUP_IDS.map((gId) => {
              const stats = getGroupStatistics(gId, assets);
              const conf = GROUP_ABCD_CONFIG[gId];
              const isConfirmed = room?.groupsConfig?.[gId]?.isConfirmed ?? false;

              return (
                <div
                  key={gId}
                  className={`p-3 rounded-2xl border transition-all ${
                    isConfirmed 
                      ? 'bg-slate-50 border-emerald-300 ring-1 ring-emerald-400/40' 
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${conf.bgClass} text-white`}>
                      {conf.label}
                    </span>
                    {isConfirmed ? (
                      <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        Siap
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-semibold">
                        Draf
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <p className="text-lg font-black text-slate-900 leading-none">
                      {stats.total} <span className="text-[11px] font-normal text-slate-500">Properti</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {stats.ready} Siap • {stats.draft} Draf
                    </p>
                  </div>

                  {/* Host Confirm Toggle */}
                  {isHost && isLobby && (
                    <button
                      type="button"
                      onClick={() => handleToggleConfirmGroup(gId)}
                      className={`w-full mt-2.5 py-1 px-2 rounded-xl text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                        isConfirmed
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isConfirmed ? 'Terkonfirmasi (2x Sewa)' : 'Konfirmasi Selesai'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Bar & Group Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveGroupFilter('all')}
                className={`py-1.5 px-3 rounded-xl transition-all whitespace-nowrap ${
                  activeGroupFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({assets.length})
              </button>
              {GROUP_IDS.map(gId => {
                const count = assets.filter(a => a.groupId === gId).length;
                return (
                  <button
                    key={gId}
                    type="button"
                    onClick={() => setActiveGroupFilter(gId)}
                    className={`py-1.5 px-3 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeGroupFilter === gId ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Grup {gId}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

            {isHost && isLobby && (
              <button
                type="button"
                onClick={() => openAddForm(activeGroupFilter !== 'all' ? (activeGroupFilter as GroupId) : undefined)}
                className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Properti Baru</span>
              </button>
            )}
          </div>

          {/* Properties List */}
          {filteredAssets.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Belum Ada Properti Terdaftar</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                {isHost && isLobby 
                  ? 'Klik tombol "Tambah Properti Baru" di atas untuk mengisi katalog papan fisik Anda secara bertahap.'
                  : 'Menunggu Host menambahkan properti ke dalam katalog kelompok A, B, C, D.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredAssets.map((asset) => {
                const conf = GROUP_ABCD_CONFIG[asset.groupId || 'A'];
                const rentDetails = calculateRent(asset, assets, room?.groupsConfig);

                return (
                  <div
                    key={asset.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white ${conf.bgClass}`}>
                            {conf.label}
                          </span>
                          {asset.boardPosition && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Petak #{asset.boardPosition}
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          asset.status === 'ready' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {asset.status === 'ready' ? 'Siap' : 'Draf'}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-1">
                        {asset.name}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                        <span>Harga Tanah:</span>
                        <span className="font-extrabold text-slate-900">{formatRupiah(asset.buyPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Sewa Tanah Kosong:</span>
                        <span className="font-semibold text-emerald-700">{formatRupiah(asset.rentBase)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Nilai Agunan:</span>
                        <span>{formatRupiah(asset.mortgageValue)}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setDeedModalAsset(asset)}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        Surat Hak Milik →
                      </button>

                      {isHost && isLobby && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(asset)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Edit Properti"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(asset)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Hapus Properti"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Total Properti Terdaftar: <strong>{assets.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Property Input Modal (Add / Edit) */}
      {formOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingAsset ? 'Edit Properti' : 'Tambah Properti Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-slate-700">Nama Properti *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Jalan Malioboro"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Posisi Petak</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Opsional (1-40)"
                    value={boardPosition}
                    onChange={(e) => setBoardPosition(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Group Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Kelompok Properti (Tepat 1 Kelompok)</label>
                <div className="grid grid-cols-4 gap-2">
                  {GROUP_IDS.map((g) => {
                    const conf = GROUP_ABCD_CONFIG[g];
                    const isSelected = groupId === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGroupId(g)}
                        className={`py-2 px-2 rounded-xl border font-bold text-center transition-all ${
                          isSelected
                            ? `${conf.bgClass} text-white shadow-xs ring-2 ring-emerald-500/20`
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {conf.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Purchase & Mortgage */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Harga Beli Tanah (IDR)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Contoh: 1500000"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">{formatRupiah(Number(buyPrice) || 0)}</span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Nilai Agunan / Hipotek (IDR)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Contoh: 750000"
                    value={mortgageValue}
                    onChange={(e) => setMortgageValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">{formatRupiah(Number(mortgageValue) || 0)}</span>
                </div>
              </div>

              {/* Rent Schedule (Detailed) */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="font-bold text-slate-800 block">Jadwal Tarif Sewa (Seluruh Tingkat)</label>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-slate-600 text-[11px]">Sewa Tanah Kosong:</span>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      placeholder="0"
                      value={rentBase}
                      onChange={(e) => setRentBase(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-600 text-[11px]">Sewa 1 Rumah:</span>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      placeholder="0"
                      value={rentOneHouse}
                      onChange={(e) => setRentOneHouse(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-600 text-[11px]">Sewa 2 Rumah:</span>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      placeholder="0"
                      value={rentTwoHouses}
                      onChange={(e) => setRentTwoHouses(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-600 text-[11px]">Sewa 3 Rumah:</span>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      placeholder="0"
                      value={rentThreeHouses}
                      onChange={(e) => setRentThreeHouses(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-600 text-[11px]">Sewa 4 Rumah:</span>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      placeholder="0"
                      value={rentFourHouses}
                      onChange={(e) => setRentFourHouses(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-600 text-[11px]">Sewa HOTEL:</span>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      placeholder="0"
                      value={rentHotel}
                      onChange={(e) => setRentHotel(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-emerald-700 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Building Costs (IMB) */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Biaya IMB per Rumah (IDR)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="0"
                    value={houseCost}
                    onChange={(e) => setHouseCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Biaya IMB Hotel (IDR)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="0"
                    value={hotelCost}
                    onChange={(e) => setHotelCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              {/* Status Radio */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <label className="font-semibold text-slate-700">Status Properti</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('ready')}
                    className={`flex-1 py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      status === 'ready' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Siap Digunakan (Ready)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('draft')}
                    className={`flex-1 py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      status === 'draft' 
                        ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-500/20' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Simpan Draf (Belum Lengkap)
                  </button>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Menyimpan...' : editingAsset ? 'Perbarui Properti' : 'Simpan ke Katalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Property Deed Modal View */}
      {deedModalAsset && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="border-2 border-slate-900 rounded-2xl overflow-hidden p-0.5">
              <div className={`p-3 text-center text-white ${GROUP_ABCD_CONFIG[deedModalAsset.groupId || 'A'].bgClass}`}>
                <span className="text-[9px] font-bold tracking-widest uppercase block opacity-80">
                  SURAT HAK MILIK (TITLE DEED)
                </span>
                <h3 className="text-sm font-extrabold tracking-tight mt-0.5">
                  {deedModalAsset.name}
                </h3>
                <span className="text-[10px] opacity-90 block mt-0.5">
                  {GROUP_ABCD_CONFIG[deedModalAsset.groupId || 'A'].label}
                </span>
              </div>

              <div className="p-4 space-y-3 bg-white text-xs">
                <div className="flex justify-between font-bold text-slate-900 border-b border-slate-100 pb-2">
                  <span>Harga Pembelian</span>
                  <span className="text-emerald-700">{formatRupiah(deedModalAsset.buyPrice)}</span>
                </div>

                <div className="flex justify-between text-slate-700">
                  <span>Sewa Tanah Kosong</span>
                  <span className="font-semibold">{formatRupiah(deedModalAsset.rentBase)}</span>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-100 text-slate-600 text-[11px]">
                  <div className="flex justify-between">
                    <span>Dengan 1 Rumah</span>
                    <span className="font-semibold">{formatRupiah(deedModalAsset.rentOneHouse)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dengan 2 Rumah</span>
                    <span className="font-semibold">{formatRupiah(deedModalAsset.rentTwoHouses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dengan 3 Rumah</span>
                    <span className="font-semibold">{formatRupiah(deedModalAsset.rentThreeHouses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dengan 4 Rumah</span>
                    <span className="font-semibold">{formatRupiah(deedModalAsset.rentFourHouses)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Dengan HOTEL</span>
                    <span className="text-emerald-700">{formatRupiah(deedModalAsset.rentHotel)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Nilai Agunan (Hipotek)</span>
                    <span className="font-semibold">{formatRupiah(deedModalAsset.mortgageValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Biaya IMB Rumah</span>
                    <span className="font-semibold">{formatRupiah(deedModalAsset.houseCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Biaya IMB Hotel</span>
                    <span className="font-semibold">{formatRupiah(deedModalAsset.hotelCost)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic mt-1">
                    *Sewa tanah kosong berlipat 2x jika seluruh aset Kelompok {deedModalAsset.groupId} dimiliki dan telah dikonfirmasi.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDeedModalAsset(null)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Tutup Surat Hak Milik
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
