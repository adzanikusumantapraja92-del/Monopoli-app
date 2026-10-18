import React, { useState } from 'react';
import { useMonopoli } from '../../context/MonopoliContext';
import { ApprovalRequest, RequestType } from '../../types/monopoli';
import { formatRupiah, formatDateTime, getPawnBadge } from '../../utils/formatters';
import { 
  CheckSquare, 
  Check, 
  X, 
  Clock, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  PlusCircle, 
  Users,
  Info,
  Scale
} from 'lucide-react';

export const RequestsScreen: React.FC = () => {
  const { requests, currentMember, room, members, castVote, submitRequest } = useMonopoli();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>('claim_start');
  const [reqTitle, setReqTitle] = useState('Klaim Melewati Petak START');
  const [reqAmount, setReqAmount] = useState<number>(2000000);
  const [reqDetail, setReqDetail] = useState('');

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const finishedRequests = requests.filter(r => r.status !== 'pending');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitRequest(
      requestType,
      reqTitle,
      reqDetail || `${currentMember?.displayName} mengajukan ${reqTitle}`,
      reqAmount
    );
    setCreateModalOpen(false);
    setReqDetail('');
  };

  const getRequestTypeBadge = (type: RequestType) => {
    switch (type) {
      case 'claim_start':
        return { label: 'Melewati START', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'buy_asset':
        return { label: 'Beli Properti', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'card_reward':
        return { label: 'Hadiah Kartu', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'disputed_penalty':
        return { label: 'Denda Disengketakan', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'reversal_correction':
        return { label: 'Koreksi Transaksi', color: 'bg-rose-50 text-rose-800 border-rose-200' };
      default:
        return { label: 'Permintaan', color: 'bg-slate-50 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Sistem Persetujuan & Konsensus
            </h1>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Ajukan Validasi</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Pemain berperan sebagai validator kejadian fisik di papan (dadu, petak mendarat, kartu kesempatan). Perubahan uang atau aset wajib melalui persetujuan bersama.
        </p>

        {/* Rule Rules Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100 text-[11px]">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-900 block">100% Persetujuan</span>
            <span className="text-slate-500">Semua pemain aktif dalam snapshot wajib setuju.</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-900 block">1 Penolakan Membatalkan</span>
            <span className="text-slate-500">Satu suara tolak langsung menggugurkan klaim.</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-900 block">Eksekusi Atomik</span>
            <span className="text-slate-500">Backend memverifikasi saldo ulang sebelum eksekusi.</span>
          </div>
        </div>
      </div>

      {/* Pending Requests Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Permintaan Menunggu Persetujuan ({pendingRequests.length})</span>
          </h2>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">Tidak ada permintaan tertunda</p>
            <p className="text-[11px] text-slate-400">
              Semua kejadian fisik di papan telah divalidasi oleh para pemain.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => {
              const typeBadge = getRequestTypeBadge(req.type);
              const validatorsList = Object.values(req.validators);
              const approvedCount = validatorsList.filter(v => v.decision === 'approved').length;
              const totalRequired = validatorsList.length;
              const myVote = currentMember ? req.validators[currentMember.uid] : null;
              const hasVoted = myVote && myVote.decision !== 'pending';

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTime(req.createdAt)}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{req.title}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">{req.detail}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-emerald-700 block">
                        +{formatRupiah(req.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400">Nilai Mutasi</span>
                    </div>
                  </div>

                  {/* Quorum Progress Bar */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">
                        Progres Konsensus Snapshot:
                      </span>
                      <span className="font-bold text-slate-900">
                        {approvedCount} / {totalRequired} Pemain Menyetujui
                      </span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${(approvedCount / totalRequired) * 100}%` }}
                      />
                    </div>

                    {/* Individual Validators Avatars / Status */}
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {validatorsList.map((val) => {
                        const isRequester = val.uid === req.requesterId;
                        return (
                          <span
                            key={val.uid}
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              val.decision === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : val.decision === 'rejected'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            {val.decision === 'approved' && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                            {val.decision === 'rejected' && <X className="w-2.5 h-2.5 text-rose-600" />}
                            {val.decision === 'pending' && <Clock className="w-2.5 h-2.5 text-amber-500" />}
                            <span>{val.displayName}</span>
                            {isRequester && <span className="text-[9px] opacity-75">(Pemohon)</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Voting Controls for Current User */}
                  {currentMember && !hasVoted && (
                    <div className="pt-1 flex items-center justify-between gap-3 border-t border-slate-100">
                      <span className="text-xs text-slate-600 font-medium">
                        Suara Anda Dibutuhkan:
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => castVote(req.id, 'rejected')}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak (Tidak Sah)</span>
                        </button>
                        <button
                          onClick={() => castVote(req.id, 'approved')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setuju (Valid)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {hasVoted && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Anda telah memberikan keputusan pada permintaan ini.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Finished / Resolved Requests Section */}
      {finishedRequests.length > 0 && (
        <div className="space-y-3 pt-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Riwayat Keputusan Konsensus
          </h2>

          <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 p-4">
            {finishedRequests.map((req) => (
              <div key={req.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{req.title}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {req.status === 'approved' ? 'Disetujui Seluruh Pemain' : 'Ditolak'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Pemohon: {req.requesterName} • {formatDateTime(req.createdAt)}
                  </p>
                  {req.rejectionReason && (
                    <p className="text-[10px] text-rose-600 mt-0.5 italic">{req.rejectionReason}</p>
                  )}
                </div>

                <span className="text-xs font-extrabold text-slate-800 whitespace-nowrap">
                  {formatRupiah(req.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Ajukan Validasi Kejadian Fisik</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Jenis Kejadian Fisik</label>
                <select
                  value={requestType}
                  onChange={(e) => {
                    const t = e.target.value as RequestType;
                    setRequestType(t);
                    if (t === 'claim_start') {
                      setReqTitle('Klaim Melewati Petak START');
                      setReqAmount(room?.settings.passStartReward || 2000000);
                    } else if (t === 'card_reward') {
                      setReqTitle('Hadiah Kartu Kesempatan / Dana Umum');
                      setReqAmount(500000);
                    } else if (t === 'disputed_penalty') {
                      setReqTitle('Denda Disengketakan');
                      setReqAmount(1000000);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                >
                  <option value="claim_start">Klaim Melewati Petak START</option>
                  <option value="card_reward">Hadiah Kartu Kesempatan / Dana Umum</option>
                  <option value="disputed_penalty">Denda / Pajak Khusus</option>
                  <option value="reversal_correction">Koreksi Kesalahan Transaksi</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Judul Permintaan</label>
                <input
                  type="text"
                  required
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nominal Rupiah (IDR)</label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={10000}
                  value={reqAmount}
                  onChange={(e) => setReqAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400">
                  Tampilan: <strong>{formatRupiah(reqAmount)}</strong>
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Misal: Mendapatkan kartu kesempatan nomor 3: Bank membayar dividen."
                  value={reqDetail}
                  onChange={(e) => setReqDetail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  Kirim ke Seluruh Pemain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
