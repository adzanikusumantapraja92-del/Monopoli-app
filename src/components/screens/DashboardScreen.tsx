import React, { useState } from 'react';
import { useMonopoli } from '../../context/MonopoliContext';
import { formatRupiah, getPawnBadge, formatDateTime } from '../../utils/formatters';
import { 
  Wallet, 
  Building2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  History, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Landmark,
  ShieldCheck,
  SendHorizontal,
  PlusCircle,
  Receipt
} from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const { 
    room, 
    members, 
    currentMember, 
    transactions, 
    requests, 
    setActiveTab,
    submitRequest 
  } = useMonopoli();

  const [claimStartModalOpen, setClaimStartModalOpen] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  if (!room || !currentMember) return null;

  const myPawn = getPawnBadge(currentMember.pawnColor);
  const recentTransactions = transactions.slice(0, 4);
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  const handleClaimStart = () => {
    submitRequest(
      'claim_start',
      'Klaim Melewati Petak START',
      `${currentMember.displayName} mendarat atau melewati petak START pada papan fisik.`,
      room.settings.passStartReward
    );
    setClaimSubmitted(true);
    setTimeout(() => {
      setClaimSubmitted(false);
      setClaimStartModalOpen(false);
      setActiveTab('requests');
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Balance Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden border border-slate-800">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${myPawn.dotClass}`} />
            <span className="text-xs font-semibold text-slate-300">
              Rekening {currentMember.displayName} ({myPawn.name})
            </span>
          </div>

          <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            Room: {room.roomCode}
          </span>
        </div>

        <div className="mt-3">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Saldo Kas Tersedia
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-1">
            {formatRupiah(currentMember.balance)}
          </h1>
        </div>

        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Aset Dimiliki: <strong>{currentMember.propertiesOwnedCount} Properti</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[11px]">Terverifikasi Atomik</span>
          </div>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Aksi Finansial Permainan
          </h2>
          <span className="text-[11px] text-slate-400">Verifikasi Konsensus</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Action 1: Klaim START (Interactive with consensus) */}
          <button
            onClick={() => setClaimStartModalOpen(true)}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 active:scale-97 transition-all text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-950">Lewat START</span>
            <span className="text-[10px] text-emerald-700 font-medium">+{formatRupiah(room.settings.passStartReward)}</span>
          </button>

          {/* Action 2: Beli Properti (Directs to Asset Catalog) */}
          <button
            onClick={() => setActiveTab('assets')}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 active:scale-97 transition-all text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-blue-950">Katalog Aset</span>
            <span className="text-[10px] text-blue-700 font-medium">Lihat & Beli</span>
          </button>

          {/* Action 3: Bayar Sewa (Non-interactive with honest Segera Hadir label) */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center opacity-75 cursor-not-allowed">
            <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mb-1.5">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700">Bayar Sewa</span>
            <span className="text-[9px] text-slate-500 font-semibold px-1.5 py-0.2 rounded bg-slate-200 mt-0.5">Segera Hadir</span>
          </div>

          {/* Action 4: Transfer (Non-interactive with honest Segera Hadir label) */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center opacity-75 cursor-not-allowed">
            <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mb-1.5">
              <SendHorizontal className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700">Transfer</span>
            <span className="text-[9px] text-slate-500 font-semibold px-1.5 py-0.2 rounded bg-slate-200 mt-0.5">Segera Hadir</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-normal italic">
          *Sesuai panduan Build 01, tombol tanpa transaksi backend nyata berstatus 'Segera Hadir'. Tidak ada aksi fiktif yang memalsukan keberhasilan.
        </p>
      </div>

      {/* Central Bank Info Card */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900">Bank Monopoli Sentral</h3>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                Otomatis
              </span>
            </div>
            <p className="text-[11px] text-slate-600">Saldo: Tak Terbatas • Menjaga integritas moneter</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-500 font-medium">Aturan:</span>
          <p className="text-xs font-bold text-slate-800">Non-Negatif</p>
        </div>
      </div>

      {/* Players Standing / All Room Members */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Saldo Rekening Seluruh Pemain ({members.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Sinkron Real-time</span>
        </div>

        <div className="divide-y divide-slate-100">
          {members.map((member, index) => {
            const badge = getPawnBadge(member.pawnColor);
            const isMe = member.uid === currentMember.uid;

            return (
              <div key={member.uid} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg ${badge.dotClass} flex items-center justify-center text-white font-bold text-[11px] shadow-xs`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${isMe ? 'text-emerald-950 font-extrabold' : 'text-slate-800'}`}>
                        {member.displayName}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                          Anda
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {member.propertiesOwnedCount} Aset Terdaftar
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-extrabold text-slate-900">
                    {formatRupiah(member.balance)}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-medium">Solven</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Ledger Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Aktivitas Ledger Terakhir
            </h2>
          </div>
          <button
            onClick={() => setActiveTab('activity')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
          >
            <span>Semua Histori</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">Belum ada transaksi</p>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">{tx.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {formatDateTime(tx.timestamp)} • ID: {tx.id}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-extrabold text-emerald-700">
                    +{formatRupiah(tx.amount)}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-medium">
                    Settled
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claim START Modal */}
      {claimStartModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <PlusCircle className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Ajukan Klaim Melewati START</h3>
              <p className="text-xs text-slate-600 mt-1">
                Sesuai prinsip ke-4: Aplikasi tidak memiliki sensor fisik. Permintaan Anda akan dikirim ke seluruh pemain di room untuk disetujui bersama.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs text-slate-500">Nominal Hadiah START:</span>
              <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                +{formatRupiah(room.settings.passStartReward)}
              </p>
            </div>

            {claimSubmitted ? (
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs text-center font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Permintaan Dibuat! Mengalihkan ke menu Permintaan...</span>
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimStartModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleClaimStart}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  Ajukan ke Pemain
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
