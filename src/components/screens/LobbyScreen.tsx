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
  UserPlus, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { PawnColor } from '../../types/monopoli';

export const LobbyScreen: React.FC = () => {
  const { room, members, isHost, startGame, addSimulationMember } = useMonopoli();
  const [copied, setCopied] = useState(false);
  const [simName, setSimName] = useState('');

  if (!room) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unusedPawnColors: PawnColor[] = (['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'rose'] as PawnColor[])
    .filter(c => !members.some(m => m.pawnColor === c));

  const handleAddSimPlayer = () => {
    if (unusedPawnColors.length === 0) return;
    const defaultName = `Pemain ${members.length + 1}`;
    addSimulationMember(simName || defaultName, unusedPawnColors[0]);
    setSimName('');
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
              <span>Ruang Tunggu (Lobby)</span>
            </div>
            <p className="text-xs text-slate-400">Kode Unik Permainan:</p>
            <h1 className="text-3xl sm:text-4xl font-mono font-extrabold tracking-widest text-emerald-400 mt-0.5">
              {room.roomCode}
            </h1>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-semibold border border-white/15 transition-all self-stretch sm:self-auto justify-center"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin!' : 'Salin Kode Room'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-4 leading-relaxed border-t border-slate-800/80 pt-3">
          Bagikan kode ini kepada teman bermain fisik Anda. Setiap pemain menggunakan gawai masing-masing untuk memvalidasi kejadian papan.
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
                    Siap di Lobby
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
                <p className="text-[10px] text-slate-400">Menunggu pemain bergabung...</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Add Companion / Simulation Player */}
        {emptySlotsCount > 0 && isHost && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Tambah pemain fisik (misal: Budi / Siti)`}
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-emerald-500"
            />
            <button
              onClick={handleAddSimPlayer}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftarkan Kursi</span>
            </button>
          </div>
        )}
      </div>

      {/* Game Rules & Config Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Settings2 className="w-4 h-4 text-emerald-600" />
          <span>Aturan Finansial Terkunci (Build 01)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500">Saldo Awal Pemain:</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {formatRupiah(room.settings.initialBalance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Dibagikan otomatis tepat 1x saat mulai</p>
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
              {room.settings.catalogPreset === 'simulation_indonesia' ? '28 Aset (Simulasi ID)' : 'Katalog Kosong'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tersinkronisasi ke semua layar</p>
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
            onClick={startGame}
            disabled={members.length < 2}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
              members.length >= 2
                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-99 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {members.length < 2
                ? 'Minimal 2 Pemain Diperlukan'
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
