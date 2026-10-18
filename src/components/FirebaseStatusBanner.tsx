import React, { useState } from 'react';
import { ShieldAlert, Database, Users, CheckCircle2, AlertTriangle, ArrowRight, Server, ChevronDown, ChevronUp } from 'lucide-react';

interface FirebaseStatusBannerProps {
  onConnectClick?: () => void;
}

export const FirebaseStatusBanner: React.FC<FirebaseStatusBannerProps> = ({ onConnectClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 text-slate-800 shadow-xs mb-4">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-amber-900 tracking-tight flex items-center gap-1.5">
              <span>Status Integrasi: Belum Terhubung ke Cloud Firestore</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 border border-amber-300/60">
                Mode Setup Mandiri
              </span>
            </h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-amber-800 font-medium hover:text-amber-950 flex items-center gap-1 transition-colors"
            >
              <span>{isExpanded ? 'Sembunyikan Detail' : 'Pelajari Kebutuhan Setup'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
            Sesuai prinsip <strong>Build 01</strong>, Monopoli Bank tidak membuat simulasi lokal fiktif yang seolah-olah sudah multiplayer. Multi-perangkat real-time, ledger anti-manipulasi, dan login akun memerlukan integrasi resmi Firebase.
          </p>

          {isExpanded && (
            <div className="mt-3.5 pt-3.5 border-t border-amber-200/60 space-y-3 text-xs text-amber-900">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-white/70 border border-amber-200/60">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-1">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>Cloud Firestore Atomic</span>
                  </div>
                  <p className="text-slate-600 leading-normal">
                    Mencatat mutasi saldo Rp secara atomik dengan transaction engine, mencegah double-spending dan kecurangan pemain.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/70 border border-amber-200/60">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-1">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Multi-User Konsensus</span>
                  </div>
                  <p className="text-slate-600 leading-normal">
                    Sinkronisasi instan antar HP pemain fisik (2–8 orang). Seluruh pemain berperan sebagai validator kejadian fisik.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-300/40 text-[11px] leading-relaxed">
                <p className="font-semibold text-amber-950 flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  Prinsip Kejujuran Sistem:
                </p>
                <p className="text-amber-900">
                  Fitur keuangan dan persetujuan yang belum terhubung backend nyata ditampilkan dengan label <strong>"Segera Hadir / Tahap 2"</strong> non-interaktif, sehingga tidak ada tombol palsu yang mengklaim berhasil tanpa pencatatan permanen.
                </p>
              </div>
            </div>
          )}

          {onConnectClick && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onConnectClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-medium transition-all shadow-xs"
              >
                <span>Buka Setup Firebase</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-amber-700">
                Hubungkan Firestore untuk multiplayer lintas gawai.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
