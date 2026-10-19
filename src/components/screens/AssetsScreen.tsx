import React, { useState, useMemo } from 'react';
import { useMonopoli } from '../../context/MonopoliContext';
import { AssetItem, GroupId, PropertyStatus } from '../../types/monopoli';
import { formatRupiah, getPawnBadge } from '../../utils/formatters';
import { calculateRent } from '../../utils/rentCalculator';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Check,
  AlertTriangle,
  Lock,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

const GROUP_STYLES: Record<GroupId, { name: string; bg: string; text: string; border: string; bar: string }> = {
  A: { name: 'Kelompok A', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', bar: 'bg-indigo-600' },
  B: { name: 'Kelompok B', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', bar: 'bg-emerald-600' },
  C: { name: 'Kelompok C', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', bar: 'bg-amber-500' },
  D: { name: 'Kelompok D', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', bar: 'bg-rose-600' },
};

interface PropertyFormData {
  name: string;
  boardPosition: string;
  groupId: GroupId;
  buyPrice: string;
  mortgageValue: string;
  rentBase: string;
  rentOneHouse: string;
  rentTwoHouses: string;
  rentThreeHouses: string;
  rentFourHouses: string;
  rentHotel: string;
  houseCost: string;
  hotelCost: string;
  status: PropertyStatus;
}

const INITIAL_FORM: PropertyFormData = {
  name: '',
  boardPosition: '',
  groupId: 'A',
  buyPrice: '',
  mortgageValue: '',
  rentBase: '',
  rentOneHouse: '',
  rentTwoHouses: '',
  rentThreeHouses: '',
  rentFourHouses: '',
  rentHotel: '',
  houseCost: '',
  hotelCost: '',
  status: 'ready',
};

export const AssetsScreen: React.FC = () => {
  const { 
    assets, 
    members, 
    currentMember, 
    room, 
    isHost,
    createProperty,
    updateProperty,
    deleteProperty,
    confirmGroup 
  } = useMonopoli();

  // Filters state
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'bank' | 'mortgaged'>('all');
  const [selectedGroup, setSelectedGroup] = useState<'all' | GroupId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [groupConfirming, setGroupConfirming] = useState<GroupId | null>(null);

  const isLobby = room?.status === 'lobby';
  const canManage = isHost && isLobby;

  // Filter logic
  const filteredAssets = useMemo(() => {
    return assets.filter(item => {
      // Tab filter
      if (activeTab === 'mine' && item.ownerId !== currentMember?.uid) return false;
      if (activeTab === 'bank' && item.ownerId !== null) return false;
      if (activeTab === 'mortgaged' && !item.isMortgaged) return false;

      // Group filter
      if (selectedGroup !== 'all' && item.groupId !== selectedGroup) return false;

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.groupId.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [assets, activeTab, selectedGroup, statusFilter, searchQuery, currentMember]);

  // Counts
  const bankCount = assets.filter(a => a.ownerId === null).length;
  const myCount = assets.filter(a => a.ownerId === currentMember?.uid).length;
  const mortgagedCount = assets.filter(a => a.isMortgaged).length;

  const handleOpenCreate = (prefillGroup?: GroupId) => {
    setEditingAssetId(null);
    setFormData({
      ...INITIAL_FORM,
      groupId: prefillGroup || (selectedGroup !== 'all' ? selectedGroup : 'A'),
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (asset: AssetItem) => {
    setEditingAssetId(asset.id);
    setFormData({
      name: asset.name,
      boardPosition: asset.boardPosition !== undefined && asset.boardPosition !== null ? String(asset.boardPosition) : '',
      groupId: asset.groupId || 'A',
      buyPrice: asset.buyPrice !== undefined && asset.buyPrice !== null ? String(asset.buyPrice) : '',
      mortgageValue: asset.mortgageValue !== undefined && asset.mortgageValue !== null ? String(asset.mortgageValue) : '',
      rentBase: asset.rentBase !== undefined && asset.rentBase !== null ? String(asset.rentBase) : '',
      rentOneHouse: asset.rentOneHouse !== undefined && asset.rentOneHouse !== null ? String(asset.rentOneHouse) : '',
      rentTwoHouses: asset.rentTwoHouses !== undefined && asset.rentTwoHouses !== null ? String(asset.rentTwoHouses) : '',
      rentThreeHouses: asset.rentThreeHouses !== undefined && asset.rentThreeHouses !== null ? String(asset.rentThreeHouses) : '',
      rentFourHouses: asset.rentFourHouses !== undefined && asset.rentFourHouses !== null ? String(asset.rentFourHouses) : '',
      rentHotel: asset.rentHotel !== undefined && asset.rentHotel !== null ? String(asset.rentHotel) : '',
      houseCost: asset.houseCost !== undefined && asset.houseCost !== null ? String(asset.houseCost) : '',
      hotelCost: asset.hotelCost !== undefined && asset.hotelCost !== null ? String(asset.hotelCost) : '',
      status: asset.status || 'ready',
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
    setSelectedAsset(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.name.trim()) {
      setFormError('Nama properti wajib diisi.');
      return;
    }

    const isReady = formData.status === 'ready';

    // Helper to validate and parse client input
    const parseField = (val: string, label: string): number | null => {
      const trimmed = val.trim();
      if (trimmed === '') {
        if (isReady) {
          throw new Error(`Kolom ${label} wajib diisi dengan nominal nonnegatif untuk status 'Siap Digunakan'.`);
        }
        return null;
      }
      const num = Number(trimmed);
      if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
        throw new Error(`Kolom ${label} harus berupa bilangan bulat nonnegatif.`);
      }
      return num;
    };

    let buyPrice = 0;
    let mortgageValue = 0;
    let rentBase = 0;
    let rentOneHouse = 0;
    let rentTwoHouses = 0;
    let rentThreeHouses = 0;
    let rentFourHouses = 0;
    let rentHotel = 0;
    let houseCost = 0;
    let hotelCost = 0;

    try {
      buyPrice = parseField(formData.buyPrice, 'Harga Beli Tanah') ?? 0;
      mortgageValue = parseField(formData.mortgageValue, 'Nilai Agunan / Hipotek') ?? 0;
      rentBase = parseField(formData.rentBase, 'Sewa Tanah Kosong') ?? 0;
      rentOneHouse = parseField(formData.rentOneHouse, 'Sewa 1 Rumah') ?? 0;
      rentTwoHouses = parseField(formData.rentTwoHouses, 'Sewa 2 Rumah') ?? 0;
      rentThreeHouses = parseField(formData.rentThreeHouses, 'Sewa 3 Rumah') ?? 0;
      rentFourHouses = parseField(formData.rentFourHouses, 'Sewa 4 Rumah') ?? 0;
      rentHotel = parseField(formData.rentHotel, 'Sewa Hotel') ?? 0;
      houseCost = parseField(formData.houseCost, 'IMB per Rumah') ?? 0;
      hotelCost = parseField(formData.hotelCost, 'IMB Hotel') ?? 0;
    } catch (valErr: any) {
      setFormError(valErr.message);
      return;
    }

    const payload: Partial<AssetItem> = {
      name: formData.name.trim(),
      groupId: formData.groupId,
      boardPosition: formData.boardPosition && formData.boardPosition.trim() !== '' 
        ? Math.max(1, Math.round(Number(formData.boardPosition))) 
        : undefined,
      category: 'property',
      buyPrice,
      mortgageValue,
      rentBase,
      rentOneHouse,
      rentTwoHouses,
      rentThreeHouses,
      rentFourHouses,
      rentHotel,
      houseCost,
      hotelCost,
      status: formData.status,
    };

    setIsSubmitting(true);
    try {
      if (editingAssetId) {
        await updateProperty(editingAssetId, payload);
        setFormSuccess('Properti berhasil diperbarui!');
      } else {
        await createProperty(payload);
        setFormSuccess('Properti baru berhasil ditambahkan ke katalog!');
      }
      setTimeout(() => {
        setIsFormOpen(false);
      }, 700);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan properti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!window.confirm('Hapus properti ini dari katalog? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    setIsDeleting(assetId);
    try {
      await deleteProperty(assetId);
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(null);
      }
    } catch (err: any) {
      alert('Gagal menghapus properti: ' + (err.message || 'Error'));
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleConfirmGroup = async (groupId: GroupId, currentState: boolean) => {
    setGroupConfirming(groupId);
    try {
      await confirmGroup(groupId, !currentState);
    } catch (err: any) {
      alert('Gagal mengubah status kelompok: ' + (err.message || 'Error'));
    } finally {
      setGroupConfirming(null);
    }
  };

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return 'Bank Monopoli Sentral';
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
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Katalog Properti Monopoli</h1>
          </div>
          {isLobby ? (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Fase Lobby: Konfigurasi Katalog</span>
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Permainan Aktif (Hanya Baca)</span>
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Katalog properti dibagi ke dalam <strong>Kelompok A, B, C, D</strong> dengan aturan sewa tanah berlipat 2× saat kelompok dimiliki penuh dan telah dikonfirmasi lengkap oleh Host.
        </p>

        {/* Action Button for Host in Lobby */}
        {canManage && (
          <div className="pt-1 flex flex-wrap gap-2">
            <button
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Properti Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Group A, B, C, D Summary Cards with Host Confirmation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {(['A', 'B', 'C', 'D'] as const).map((grpId) => {
          const style = GROUP_STYLES[grpId];
          const grpAssets = assets.filter(a => a.groupId === grpId);
          const readyCount = grpAssets.filter(a => a.status === 'ready').length;
          const draftCount = grpAssets.filter(a => a.status === 'draft').length;
          const isConfirmed = room?.groupsConfig?.[grpId]?.isConfirmed ?? false;

          return (
            <div
              key={grpId}
              className={`rounded-2xl border p-3 flex flex-col justify-between transition-all ${
                selectedGroup === grpId ? `${style.border} ring-2 ring-emerald-500/20 bg-white shadow-xs` : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${style.bg} ${style.text}`}>
                    {style.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">2× Sewa</span>
                </div>

                <div className="mt-2 text-xs">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-slate-900">{grpAssets.length}</span>
                    <span className="text-[11px] text-slate-500 font-medium">Properti</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {readyCount} Siap {draftCount > 0 && `• ${draftCount} Draft`}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Status:</span>
                  {isConfirmed ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Siap
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200">
                      Draft
                    </span>
                  )}
                </div>

                {canManage && (
                  <button
                    onClick={() => handleToggleConfirmGroup(grpId, isConfirmed)}
                    disabled={groupConfirming === grpId}
                    className={`w-full py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                      isConfirmed
                        ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800'
                        : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {groupConfirming === grpId
                      ? 'Menyimpan...'
                      : isConfirmed
                      ? 'Batal Konfirmasi'
                      : 'Konfirmasi Siap'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Group & Ownership Tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setSelectedGroup('all')}
          className={`flex-1 min-w-[70px] py-2 px-2 rounded-xl transition-all ${
            selectedGroup === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Semua ({assets.length})
        </button>
        {(['A', 'B', 'C', 'D'] as const).map(grpId => (
          <button
            key={grpId}
            onClick={() => setSelectedGroup(grpId)}
            className={`flex-1 min-w-[85px] py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
              selectedGroup === grpId ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Kelompok {grpId}</span>
            <span className="text-[10px] text-slate-400">({assets.filter(a => a.groupId === grpId).length})</span>
          </button>
        ))}
      </div>

      {/* Secondary Status / Ownership Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-full font-medium border transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua Aset
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-2.5 py-1 rounded-full font-medium border transition-all ${
              activeTab === 'bank'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Di Bank ({bankCount})
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-2.5 py-1 rounded-full font-medium border transition-all ${
              activeTab === 'mine'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Milik Saya ({myCount})
          </button>
          <button
            onClick={() => setActiveTab('mortgaged')}
            className={`px-2.5 py-1 rounded-full font-medium border transition-all ${
              activeTab === 'mortgaged'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Gadai ({mortgagedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama properti..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <div>
            <p className="text-xs font-bold text-slate-800">Belum ada properti dalam kategori ini</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {canManage
                ? 'Gunakan tombol "+ Tambah Properti Baru" di atas untuk menambahkan properti kelompok A, B, C, D sesuai papan fisik Anda.'
                : 'Tidak ada properti yang cocok dengan filter yang dipilih.'}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => handleOpenCreate(selectedGroup !== 'all' ? selectedGroup : 'A')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Properti Kelompok {selectedGroup !== 'all' ? selectedGroup : 'A'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredAssets.map((asset) => {
            const grpStyle = GROUP_STYLES[asset.groupId || 'A'] || GROUP_STYLES.A;
            const ownerBadge = getOwnerBadge(asset.ownerId);
            const isDraft = asset.status === 'draft';
            const rentPreview = calculateRent(asset, assets, room?.groupsConfig);

            return (
              <div
                key={asset.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Color Header Bar */}
                  <div className={`h-2.5 w-full ${grpStyle.bar}`} />

                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${grpStyle.bg} ${grpStyle.text}`}>
                            Kelompok {asset.groupId}
                          </span>
                          {asset.boardPosition && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              Petak #{asset.boardPosition}
                            </span>
                          )}
                          {isDraft && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800">
                              Draft
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 tracking-tight leading-snug mt-1">
                          {asset.name}
                        </h3>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 whitespace-nowrap">
                        {formatRupiah(asset.buyPrice)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Sewa Dasar:</span>
                        <strong className="text-slate-800">{formatRupiah(asset.rentBase)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Sewa Hotel:</span>
                        <strong className="text-emerald-700">{formatRupiah(asset.rentHotel)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-50">
                      <span>Agunan: <strong>{formatRupiah(asset.mortgageValue)}</strong></span>
                      <span>IMB Rumah: <strong>{formatRupiah(asset.houseCost)}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="px-3.5 pb-3 pt-1 flex items-center justify-between border-t border-slate-50 gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ownerBadge.className}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ownerBadge.dot}`} />
                    <span className="truncate max-w-[110px]">{ownerBadge.label}</span>
                  </span>

                  <div className="flex items-center gap-1">
                    {canManage && !asset.ownerId && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(asset)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Edit Properti"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(asset.id)}
                          disabled={isDeleting === asset.id}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Properti"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedAsset(asset)}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold px-1.5 py-1 rounded-md hover:bg-emerald-50 transition-colors"
                    >
                      Rincian →
                    </button>
                  </div>
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
            {/* Deed Header styled like physical title deed card */}
            <div className="border-2 border-slate-900 rounded-2xl overflow-hidden p-0.5 shadow-sm">
              <div className={`p-3 text-center text-white ${GROUP_STYLES[selectedAsset.groupId || 'A']?.bar || 'bg-slate-900'}`}>
                <span className="text-[9px] font-bold tracking-widest uppercase block opacity-85">
                  SURAT HAK MILIK (TITLE DEED)
                </span>
                <h3 className="text-base font-black tracking-tight mt-0.5">
                  {selectedAsset.name}
                </h3>
                <span className="text-[10px] font-medium opacity-90 block mt-0.5">
                  Kelompok {selectedAsset.groupId} • {selectedAsset.boardPosition ? `Petak #${selectedAsset.boardPosition}` : 'Papan Monopoli Fisik'}
                </span>
              </div>

              <div className="p-4 space-y-3 bg-white text-xs">
                <div className="flex justify-between font-bold text-slate-900 border-b border-slate-100 pb-2">
                  <span>Harga Pembelian Tanah</span>
                  <span className="text-emerald-700 font-extrabold">{formatRupiah(selectedAsset.buyPrice)}</span>
                </div>

                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>Sewa Tanah Kosong</span>
                  <span>{formatRupiah(selectedAsset.rentBase)}</span>
                </div>

                {/* Full Rent Schedule */}
                <div className="space-y-1.5 pt-1.5 border-t border-slate-100 text-slate-600 text-[11px]">
                  <div className="flex justify-between">
                    <span>Dengan 1 Rumah</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(selectedAsset.rentOneHouse)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dengan 2 Rumah</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(selectedAsset.rentTwoHouses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dengan 3 Rumah</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(selectedAsset.rentThreeHouses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dengan 4 Rumah</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(selectedAsset.rentFourHouses)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                    <span className="text-emerald-800">Dengan HOTEL</span>
                    <span className="text-emerald-700 font-black">{formatRupiah(selectedAsset.rentHotel)}</span>
                  </div>
                </div>

                {/* Pure Function Rent Calculation Preview */}
                {(() => {
                  const rentResult = calculateRent(selectedAsset, assets, room?.groupsConfig);
                  return (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>Simulasi Tarif Saat Ini:</span>
                        <span className="text-emerald-700">{formatRupiah(rentResult.rentAmount)}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">{rentResult.description}</p>
                    </div>
                  );
                })()}

                {/* Building Costs & Mortgage */}
                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Nilai Agunan (Hipotek)</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(selectedAsset.mortgageValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IMB per Rumah</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(selectedAsset.houseCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IMB Hotel (+ 4 Rumah)</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(selectedAsset.hotelCost)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic mt-1 leading-snug">
                    *Sewa tanah kosong berlipat 2× ({formatRupiah(selectedAsset.rentBase * 2)}) jika seluruh properti di Kelompok {selectedAsset.groupId} dimiliki oleh pemain yang sama dan kelompok telah dikonfirmasi lengkap.
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
              {canManage && !selectedAsset.ownerId && (
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedAsset)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Properti</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Tutup Kartu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Property Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingAssetId ? 'Edit Properti Katalog' : 'Tambah Properti Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nama Properti *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jl. Sudirman, Malioboro, Pantai Kuta..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Group A, B, C, D & Board Position */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Kelompok (A/B/C/D) *</label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['A', 'B', 'C', 'D'] as const).map(grp => (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setFormData({ ...formData, groupId: grp })}
                        className={`py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                          formData.groupId === grp
                            ? `${GROUP_STYLES[grp].bg} ${GROUP_STYLES[grp].text} ${GROUP_STYLES[grp].border} ring-2 ring-emerald-500/20`
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {grp}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Posisi Petak (Opsional)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    placeholder="Contoh: 1"
                    value={formData.boardPosition}
                    onChange={(e) => setFormData({ ...formData, boardPosition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Status Ready / Draft */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Status Data</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'ready' })}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      formData.status === 'ready'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Siap Digunakan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'draft' })}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      formData.status === 'draft'
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Draft (Belum Lengkap)</span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>Seluruh nominal berupa integer Rupiah nonnegatif sesuai kartu hak milik fisik Anda.</span>
              </div>

              {/* Prices & Mortgage */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Harga Beli Tanah (IDR)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Contoh: 1200000"
                    value={formData.buyPrice}
                    onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                  {formData.buyPrice && (
                    <span className="text-[10px] text-emerald-700 font-bold block">
                      {formatRupiah(Number(formData.buyPrice))}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nilai Agunan / Hipotek</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Contoh: 600000"
                    value={formData.mortgageValue}
                    onChange={(e) => setFormData({ ...formData, mortgageValue: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                  {formData.mortgageValue && (
                    <span className="text-[10px] text-slate-600 font-bold block">
                      {formatRupiah(Number(formData.mortgageValue))}
                    </span>
                  )}
                </div>
              </div>

              {/* Rents */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block">Tarif Sewa (Schedule)</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600">Sewa Tanah Kosong</label>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={formData.rentBase}
                      onChange={(e) => setFormData({ ...formData, rentBase: e.target.value })}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs"
                    />
                    {formData.rentBase && (
                      <span className="text-[9px] text-slate-500 font-semibold">
                        {formatRupiah(Number(formData.rentBase))}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600">Sewa 1 Rumah</label>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={formData.rentOneHouse}
                      onChange={(e) => setFormData({ ...formData, rentOneHouse: e.target.value })}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs"
                    />
                    {formData.rentOneHouse && (
                      <span className="text-[9px] text-slate-500 font-semibold">
                        {formatRupiah(Number(formData.rentOneHouse))}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600">Sewa 2 Rumah</label>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={formData.rentTwoHouses}
                      onChange={(e) => setFormData({ ...formData, rentTwoHouses: e.target.value })}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs"
                    />
                    {formData.rentTwoHouses && (
                      <span className="text-[9px] text-slate-500 font-semibold">
                        {formatRupiah(Number(formData.rentTwoHouses))}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600">Sewa 3 Rumah</label>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={formData.rentThreeHouses}
                      onChange={(e) => setFormData({ ...formData, rentThreeHouses: e.target.value })}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs"
                    />
                    {formData.rentThreeHouses && (
                      <span className="text-[9px] text-slate-500 font-semibold">
                        {formatRupiah(Number(formData.rentThreeHouses))}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600">Sewa 4 Rumah</label>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={formData.rentFourHouses}
                      onChange={(e) => setFormData({ ...formData, rentFourHouses: e.target.value })}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs"
                    />
                    {formData.rentFourHouses && (
                      <span className="text-[9px] text-slate-500 font-semibold">
                        {formatRupiah(Number(formData.rentFourHouses))}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-bold text-emerald-800">Sewa Hotel</label>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={formData.rentHotel}
                      onChange={(e) => setFormData({ ...formData, rentHotel: e.target.value })}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold"
                    />
                    {formData.rentHotel && (
                      <span className="text-[9px] text-emerald-700 font-bold">
                        {formatRupiah(Number(formData.rentHotel))}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* IMB Costs */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600">IMB per Rumah</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Contoh: 500000"
                    value={formData.houseCost}
                    onChange={(e) => setFormData({ ...formData, houseCost: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                  {formData.houseCost && (
                    <span className="text-[9px] text-slate-500 font-semibold block">
                      {formatRupiah(Number(formData.houseCost))}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600">IMB Hotel</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Contoh: 1000000"
                    value={formData.hotelCost}
                    onChange={(e) => setFormData({ ...formData, hotelCost: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                  {formData.hotelCost && (
                    <span className="text-[9px] text-slate-500 font-semibold block">
                      {formatRupiah(Number(formData.hotelCost))}
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan ke Cloud...' : editingAssetId ? 'Perbarui Properti' : 'Simpan ke Katalog'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
