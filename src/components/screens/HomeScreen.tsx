import React, { useState } from 'react';
import { useMonopoli } from '../../context/MonopoliContext';
import { PawnColor } from '../../types/monopoli';
import { getPawnBadge, formatRupiah } from '../../utils/formatters';
import { 
  Building2, 
  Coins, 
  Users, 
  ShieldCheck, 
  Play, 
  LogIn, 
  CheckCircle2, 
  Sparkles,
  Layers,
  ArrowRight,
  LogOut,
  UserCheck
} from 'lucide-react';

const PAWN_OPTIONS: PawnColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'rose'];

export const HomeScreen: React.FC = () => {
  const { 
    createGame, 
    joinGame, 
    currentUser, 
    loginWithGoogle, 
    logout, 
    isFirebaseConfigured 
  } = useMonopoli();
  
  const [mode, setMode] = useState<'create' | 'join'>('create');

  // Form states
  const [name, setName] = useState(currentUser?.displayName || '');
  const [selectedPawn, setSelectedPawn] = useState<PawnColor>('blue');
  const [initialBalance, setInitialBalance] = useState<number>(15000000);
  const [passStartReward, setPassStartReward] = useState<number>(2000000);
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [catalogPreset, setCatalogPreset] = useState<'simulation_indonesia' | 'custom_blank'>('simulation_indonesia');

  // Join form state
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createGame(
        name || currentUser?.displayName || 'Host Permainan',
        selectedPawn,
        initialBalance,
        passStartReward,
        maxPlayers,
        catalogPreset
      );
    } catch (err: any) {
      alert('Gagal membuat room: ' + (err?.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!joinCode.trim()) {
      setJoinError('Masukkan kode room 6 karakter.');
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await joinGame(joinCode.trim(), name || currentUser?.displayName || 'Pemain Baru', selectedPawn);
      if (!success) {
        setJoinError('Kode room tidak ditemukan, room sudah penuh, atau permainan sudah aktif.');
      }
    } catch (err: any) {
      setJoinError(err?.message || 'Gagal bergabung ke room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      {/* Brand Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30 mb-3">
            <Coins className="w-3.5 h-3.5" />
            <span>Sistem Bank Digital Pendamping Monopoli Fisik</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Monopoli Bank Indonesia
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
            Sistem perbankan otomatis terdesentralisasi untuk permainan Monopoli fisik Indonesia. Mengelola saldo Rupiah atomik, kepemilikan aset, dan persetujuan konsensus tanpa manipulasi uang manual.
          </p>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Bank adalah Mesin</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-200">Format Rupiah (IDR)</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 col-span-2 sm:col-span-1">
              <Users className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-slate-200">Multiplayer Cloud</span>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Account Identity Strip */}
      {isFirebaseConfigured && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between shadow-2xs">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {currentUser.displayName?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{currentUser.displayName}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                    Akun Google
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">{currentUser.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Autentikasi Pemain</p>
                <p className="text-[11px] text-slate-500">Masuk dengan Akun Google untuk sinkronisasi akun unik.</p>
              </div>
            </div>
          )}

          <div>
            {currentUser ? (
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Google</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mode Switch Tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
        <button
          onClick={() => setMode('create')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            mode === 'create'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Play className="w-4 h-4 text-emerald-600" />
          <span>Buat Room Baru (Host)</span>
        </button>
        <button
          onClick={() => setMode('join')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            mode === 'join'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LogIn className="w-4 h-4 text-blue-600" />
          <span>Gabung Room (Pemain)</span>
        </button>
      </div>

      {/* Create Room Form */}
      {mode === 'create' && (
        <form onSubmit={handleCreateSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Konfigurasi Room Permainan (Host)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Sebagai Host, Anda menetapkan parameter awal sebelum membagikan saldo ke seluruh pemain.</p>
          </div>

          {/* Player Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Nama Pemain / Identitas Anda</label>
            <input
              type="text"
              required
              placeholder="Contoh: Budi Santoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
          </div>

          {/* Pawn Color Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Warna Pion Fisik Anda</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PAWN_OPTIONS.map((color) => {
                const badge = getPawnBadge(color);
                const isSelected = selectedPawn === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedPawn(color)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all text-center ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full ${badge.dotClass} shadow-xs`} />
                    <span className="text-[10px] font-medium text-slate-700 truncate w-full">{badge.name.replace('Pion ', '')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Initial Capital Setting */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Saldo Awal Pemain (IDR)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[10000000, 15000000, 20000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setInitialBalance(val)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                      initialBalance === val
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {formatRupiah(val).replace('Rp', 'Rp ')}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">Standar Monopoli Indonesia: Rp15.000.000</p>
            </div>

            {/* Pass Start Reward */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Hadiah Melewati START (IDR)</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[2000000, 3000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPassStartReward(val)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                      passStartReward === val
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {formatRupiah(val).replace('Rp', 'Rp ')}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">Standar: Rp2.000.000</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Max Players */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Jumlah Kursi Pemain (2–8)</label>
              <div className="flex gap-1.5">
                {[2, 4, 6, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMaxPlayers(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      maxPlayers === num
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num} Orang
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Katalog Aset Papan</label>
              <select
                value={catalogPreset}
                onChange={(e) => setCatalogPreset(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="simulation_indonesia">Preset Data Simulasi Indonesia (28 Aset Lengkap)</option>
                <option value="custom_blank">Katalog Kosong (Input Manual Papan Fisik)</option>
              </select>
              <p className="text-[11px] text-amber-700 font-medium">
                *Berlabel resmi <strong>Data Simulasi</strong> agar tidak rancu dengan varian papan cetak.
              </p>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-99 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isSubmitting ? 'Membuat Room di Cloud...' : 'Buka Ruang Permainan (Ke Lobby)'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Join Room Form */}
      {mode === 'join' && (
        <form onSubmit={handleJoinSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Gabung Permainan yang Sedang Berjalan</h2>
            <p className="text-xs text-slate-500 mt-0.5">Masukkan kode room 6 karakter yang dibagikan oleh Host.</p>
          </div>

          {joinError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {joinError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Kode Room Permainan</label>
            <input
              type="text"
              required
              placeholder="Contoh: MNP-7492"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-base font-mono font-bold tracking-wider uppercase text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Nama Pemain</label>
            <input
              type="text"
              required
              placeholder="Contoh: Siti Aminah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Pawn Color Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Pilih Warna Pion Anda</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PAWN_OPTIONS.map((color) => {
                const badge = getPawnBadge(color);
                const isSelected = selectedPawn === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedPawn(color)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all text-center ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full ${badge.dotClass} shadow-xs`} />
                    <span className="text-[10px] font-medium text-slate-700 truncate w-full">{badge.name.replace('Pion ', '')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-99 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Menghubungkan ke Room...' : 'Masuk ke Room Permainan'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Principles & Anti-Cheat Manifesto */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-slate-700 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Prinsip Sistem Monopoli Bank</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</div>
            <div>
              <p className="font-semibold text-slate-900">Bank adalah Mesin</p>
              <p className="text-slate-600">Bank bukan pemain manusia. Tidak ada akun 'Banker' yang dapat memanipulasi kas semaunya.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</div>
            <div>
              <p className="font-semibold text-slate-900">Validasi Bersama (Konsensus)</p>
              <p className="text-slate-600">Kejadian fisik (lewat START, mendarat di petak) disetujui bersama oleh para pemain aktif.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</div>
            <div>
              <p className="font-semibold text-slate-900">Ledger Append-Only</p>
              <p className="text-slate-600">Histori transaksi tidak bisa diedit/dihapus. Koreksi mutasi wajib menggunakan transaksi pembalik.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">4</div>
            <div>
              <p className="font-semibold text-slate-900">Bebas Intervensi AI</p>
              <p className="text-slate-600">AI tidak diizinkan menghitung saldo, menentukan pemenang, atau mengesahkan transaksi.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
