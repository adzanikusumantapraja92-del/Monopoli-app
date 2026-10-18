import React, { useState } from 'react';
import { useMonopoli } from '../../context/MonopoliContext';
import { TransactionType } from '../../types/monopoli';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import { 
  Receipt, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  ShieldCheck, 
  Clock, 
  FileText,
  Landmark,
  CheckCircle2
} from 'lucide-react';

export const ActivityScreen: React.FC = () => {
  const { transactions, room, currentMember } = useMonopoli();
  const [filterType, setFilterType] = useState<string>('all');

  const filteredTransactions = transactions.filter(tx => {
    if (filterType === 'all') return true;
    if (filterType === 'my' && currentMember) {
      return tx.sourceId === currentMember.uid || tx.targetId === currentMember.uid;
    }
    return tx.type === filterType;
  });

  const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case 'initial_capital':
        return { label: 'Modal Awal', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'pass_start':
        return { label: 'Hadiah START', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'asset_purchase':
        return { label: 'Beli Aset', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'rent_payment':
        return { label: 'Bayar Sewa', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'reversal':
        return { label: 'Transaksi Pembalik', color: 'bg-rose-50 text-rose-800 border-rose-200' };
      default:
        return { label: 'Mutasi Kas', color: 'bg-slate-50 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Buku Kas (Append-Only Ledger)
            </h1>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Immutable Audit Trail
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Semua transaksi dicatat secara permanen dan atomik. Histori mutasi tidak dapat dimanipulasi atau dihapus oleh siapapun.
        </p>

        {/* Financial Volume Counter */}
        <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block">Total Entri Ledger</span>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">
              {transactions.length} Mutasi
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block">Total Nilai Kas Bergerak</span>
            <p className="text-base font-extrabold text-emerald-700 mt-0.5">
              {formatRupiah(totalVolume)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-full font-semibold border transition-all whitespace-nowrap ${
            filterType === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Semua Mutasi ({transactions.length})
        </button>
        <button
          onClick={() => setFilterType('my')}
          className={`px-3 py-1.5 rounded-full font-semibold border transition-all whitespace-nowrap ${
            filterType === 'my'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Terkait Rekening Saya
        </button>
        <button
          onClick={() => setFilterType('initial_capital')}
          className={`px-3 py-1.5 rounded-full font-semibold border transition-all whitespace-nowrap ${
            filterType === 'initial_capital'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Modal Awal
        </button>
        <button
          onClick={() => setFilterType('pass_start')}
          className={`px-3 py-1.5 rounded-full font-semibold border transition-all whitespace-nowrap ${
            filterType === 'pass_start'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Hadiah START
        </button>
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">Tidak ada transaksi ditemukan</p>
          <p className="text-[11px] text-slate-400">Pilih filter lain atau tunggu aktivitas permainan baru.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTransactions.map((tx) => {
            const badge = getTypeBadge(tx.type);
            const isTargetMe = currentMember && tx.targetId === currentMember.uid;
            const isSourceMe = currentMember && tx.sourceId === currentMember.uid;

            return (
              <div
                key={tx.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {tx.id}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 mt-1">
                        {tx.description}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">{tx.sourceName}</span>
                        {' → '}
                        <span className="font-semibold text-slate-700">{tx.targetName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-emerald-700 block">
                      +{formatRupiah(tx.amount)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200 mt-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Settled
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Waktu: {formatDateTime(tx.timestamp)}</span>
                  <span>Integritas: Atomik</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Explainer Footer */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1">
        <p className="font-bold text-slate-800">Prinsip Audit Finansial:</p>
        <p className="text-[11px] text-slate-500">
          Setiap entri ledger divalidasi dan dicatat secara atomik. Jika terjadi kekeliruan perhitungan fisik di papan, dilakukan transaksi pembalik (reversal) untuk mendebit/mengkredit kembali tanpa menghapus rekaman asli.
        </p>
      </div>
    </div>
  );
};
