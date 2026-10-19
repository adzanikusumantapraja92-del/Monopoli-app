import React, { useState } from 'react';
import { useMonopoli } from '../../context/MonopoliContext';
import { getPawnBadge, formatRupiah } from '../../utils/formatters';
import { 
  Copy, 
  Check, 
  Users, 
  Crown, 
  Play, 
  Settings2, 
  Coins, 
  ShieldAlert,
  Share2,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const LobbyScreen: React.FC = () => {
  const { room, members, isHost, startGame, isFirebaseConfigured, assets, setActiveTab, confirmGroup } = useMonopoli();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  if (!room) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    try {
      await startGame();
    } finally {
      setIsStarting(false);
    }
  };

  const emptySlotsCount = Math.max(0, room.settings.maxPlayers - members.length);

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Room Code Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-400/30 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ruang Tunggu (Lobby Permainan)</span>
            </div>
            <p className="text-xs text-slate-400">Kode Unik Room:</p>
            <h1 className="text-3xl sm:text-4xl font-mono font-extrabold tracking-widest text-emerald-400 mt-0.5">
              {room.roomCode}
            </h1>
          </div>

          <div className="flex gap-2 self-stretch sm:self-auto">
            <button
              onClick={handleCopyCode}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-semibold border border-white/15 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-4 leading-relaxed border-t border-slate-800/80 pt-3">
          Bagikan kode ini kepada pemain fisik Anda. Pemain lain dapat membuka aplikasi di perangkatnya, masuk dengan Google, lalu memilih 'Gabung Room' dengan kode <strong>{room.roomCode}</strong>.
        </p>
      </div>

      {/* Players List in Lobby */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Kursi Pemain ({members.length}/{room.settings.maxPlayers})
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Min 2 — Maks {room.settings.maxPlayers} Pemain
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {members.map((member, index) => {
            const badge = getPawnBadge(member.pawnColor);
            return (
              <div
                key={member.uid}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl ${badge.dotClass} flex items-center justify-center text-white font-bold text-xs shadow-xs`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{member.displayName}</span>
                      {member.isHost && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                          <Crown className="w-2.5 h-2.5 text-amber-600" />
                          Host
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <span>{badge.name}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                    Terhubung
                  </span>
                </div>
              </div>
            );
          })}

          {/* Empty Seats */}
          {Array.from({ length: emptySlotsCount }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-200 bg-white text-slate-400"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs">
                {members.length + i + 1}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Kursi Kosong</p>
                <p className="text-[10px] text-slate-400">Menunggu pemain fisik bergabung melalui kode...</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kelola Katalog Properti Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Katalog Properti (Kelompok A, B, C, D)</h2>
              <p className="text-[11px] text-slate-500">Total {assets.length} properti terdaftar</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('assets')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <span>{isHost ? 'Kelola Katalog Properti' : 'Lihat Katalog Properti'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Group A-D Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(['A', 'B', 'C', 'D'] as const).map((grpId) => {
            const count = assets.filter(a => a.groupId === grpId).length;
            const readyCount = assets.filter(a => a.groupId === grpId && a.status === 'ready').length;
            const isConfirmed = room.groupsConfig?.[grpId]?.isConfirmed ?? false;
            return (
              <div key={grpId} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Kelompok {grpId}</span>
                  {isConfirmed ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Siap
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-medium">
                      Belum Lengkap
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-800">{count} Aset</span> ({readyCount} siap)
                </div>
                <p className="text-[10px] text-slate-400">Sewa tanah: ×2</p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
          {isHost
            ? 'Sebagai Host, Anda dapat menyusun properti di kelompok A, B, C, D dan mengonfirmasi kelengkapan kelompok. Katalog dikunci permanen saat permainan dimulai.'
            : 'Katalog properti disiapkan oleh Host. Anda dapat melihat daftar properti dan rincian tarif sewa di tab Katalog.'}
        </p>
      </div>

      {/* Game Rules & Config Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Settings2 className="w-4 h-4 text-emerald-600" />
          <span>Aturan Finansial Terkunci</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500">Saldo Awal Pemain:</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {formatRupiah(room.settings.initialBalance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Dibagikan atomik tepat 1x saat mulai</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500">Hadiah Melewati START:</span>
            <p className="text-sm font-extrabold text-emerald-700 mt-0.5">
              +{formatRupiah(room.settings.passStartReward)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Wajib validasi konsensus pemain</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500">Katalog Papan:</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {room.settings.catalogPreset === 'simulation_indonesia_legacy' ? 'Preset Legacy (28 Aset)' : 'Kelompok A, B, C, D'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tersinkronisasi ke Cloud</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold mb-0.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Kunci Konfigurasi Permanen:</span>
          </div>
          <p className="text-amber-800 text-[11px]">
            Setelah permainan dimulai, keanggotaan dan aturan dikunci. Host tidak memiliki otoritas mengubah saldo atau kepemilikan aset secara sepihak.
          </p>
        </div>
      </div>

      {/* Start Action */}
      <div className="pt-2">
        {isHost ? (
          <button
            onClick={handleStartGame}
            disabled={members.length < 2 || isStarting}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
              members.length >= 2 && !isStarting
                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-99 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {isStarting
                ? 'Memproses Transaksi Atomik...'
                : members.length < 2
                ? 'Menunggu Minimal 2 Pemain Terhubung'
                : 'Mulai Permainan & Bagikan Saldo Awal'}
            </span>
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-100 text-slate-600 text-center text-xs font-medium border border-slate-200">
            Menunggu Host memulai permainan...
          </div>
        )}
      </div>
    </div>
  );
};
