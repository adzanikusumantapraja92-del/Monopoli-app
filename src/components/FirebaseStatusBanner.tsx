import React, { useState } from 'react';
import { useMonopoli } from '../context/MonopoliContext';
import { 
  ShieldAlert, 
  Database, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Server, 
  ChevronDown, 
  ChevronUp,
  Key,
  Wifi,
  WifiOff
} from 'lucide-react';

interface FirebaseStatusBannerProps {
  onConnectClick?: () => void;
}

export const FirebaseStatusBanner: React.FC<FirebaseStatusBannerProps> = ({ onConnectClick }) => {
  const { isFirebaseConfigured } = useMonopoli();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isFirebaseConfigured) {
    return (
      <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3.5 sm:p-4 text-slate-800 shadow-2xs mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 shrink-0">
              <Wifi className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-950">Cloud Firestore & Auth Aktif</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-emerald-800/90 mt-0.5">
                Sinkronisasi real-time antar perangkat dan transaksi atomik siap digunakan.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 border border-emerald-300">
            Multiplayer Online
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50/95 border border-amber-300/80 rounded-2xl p-4 sm:p-5 text-slate-800 shadow-xs mb-4">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-800 shrink-0 mt-0.5">
          <WifiOff className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-amber-950 tracking-tight flex items-center gap-1.5">
              <span>Firebase Belum Dikonfigurasi (Mode Lokal / Penyiapan)</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                Belum Multiplayer
              </span>
            </h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-amber-800 font-semibold hover:text-amber-950 flex items-center gap-1 transition-colors"
            >
              <span>{isExpanded ? 'Sembunyikan Instruksi' : 'Panduan Konfigurasi'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-xs text-amber-900 mt-1 leading-relaxed">
            Sesuai kriteria Build 01: Aplikasi tidak mengklaim permainan sudah multiplayer sebelum terhubung ke server. Untuk sinkronisasi lintas HP fisik dan login Google UID, konfigurasikan Cloud Firestore.
          </p>

          {isExpanded && (
            <div className="mt-3.5 pt-3.5 border-t border-amber-200 space-y-3 text-xs text-amber-900">
              <div className="p-3 rounded-xl bg-white/80 border border-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Key className="w-4 h-4 text-emerald-600" />
                  <span>Kunci Konfigurasi Environment (.env)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Isikan variabel environment pada file <code>.env</code> berdasarkan project Firebase Anda (lihat template di <code>.env.example</code>):
                </p>
                <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-300 text-[10px] font-mono overflow-x-auto leading-relaxed">
                  VITE_FIREBASE_API_KEY="AIzaSy..."{'\n'}
                  VITE_FIREBASE_PROJECT_ID="monopoli-bank-xxx"{'\n'}
                  VITE_FIREBASE_APP_ID="1:..."
                </pre>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white/70 border border-amber-200/80">
                  <span className="font-bold text-slate-900 block mb-0.5">1. Cloud Firestore:</span>
                  <span className="text-slate-600">Menyimpan room, data 28 aset, dan transaksi atomik modal awal tanpa manipulasi klien.</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/70 border border-amber-200/80">
                  <span className="font-bold text-slate-900 block mb-0.5">2. Firebase Auth:</span>
                  <span className="text-slate-600">Mengikat identitas pemain ke Google UID unik dan memulihkan sesi setelah refresh browser.</span>
                </div>
              </div>
            </div>
          )}

          {onConnectClick && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onConnectClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 active:scale-98 text-white text-xs font-semibold transition-all shadow-2xs"
              >
                <span>Buka Petunjuk Setup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-amber-800">
                Penyedia backend resmi Cloud Firestore.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
