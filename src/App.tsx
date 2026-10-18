import React, { useState } from 'react';
import { MonopoliProvider, useMonopoli } from './context/MonopoliContext';
import { FirebaseStatusBanner } from './components/FirebaseStatusBanner';
import { HomeScreen } from './components/screens/HomeScreen';
import { LobbyScreen } from './components/screens/LobbyScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { AssetsScreen } from './components/screens/AssetsScreen';
import { RequestsScreen } from './components/screens/RequestsScreen';
import { ActivityScreen } from './components/screens/ActivityScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { getPawnBadge } from './utils/formatters';
import { 
  Home, 
  Building2, 
  Scale, 
  Receipt, 
  Settings2, 
  Coins, 
  Landmark,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { room, currentMember, activeTab, setActiveTab, requests, isLoading } = useMonopoli();
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;
  const myPawn = currentMember ? getPawnBadge(currentMember.pawnColor) : null;

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Top Header App Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-900 to-emerald-800 text-white flex items-center justify-center shadow-xs">
              <Landmark className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-slate-900">
                  MONOPOLI BANK
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  IDR
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Sistem Pendamping Papan Fisik</p>
            </div>
          </div>

          {/* Right Header Status / Identity */}
          {room && currentMember ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                  {currentMember.displayName}
                </span>
                <span className="text-[10px] font-mono font-semibold text-emerald-700">
                  Room: {room.roomCode}
                </span>
              </div>

              <div className={`w-8 h-8 rounded-xl ${myPawn?.dotClass || 'bg-slate-800'} text-white font-bold text-xs flex items-center justify-center shadow-xs border-2 border-white`}>
                {currentMember.displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-600">Build 01 Aktif</span>
            </div>
          )}
        </div>
      </header>

      {/* Main App Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-5">
        {/* Firebase Status Requirement Notice */}
        <FirebaseStatusBanner onConnectClick={() => setSetupModalOpen(true)} />

        {/* Loading state while checking Firebase Auth / Firestore */}
        {isLoading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3 shadow-xs">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-700">Memeriksa sesi room & akun...</p>
            <p className="text-[11px] text-slate-400">Menghubungkan ke Cloud Firestore</p>
          </div>
        ) : (
          <>
            {/* Screen Switching Logic */}
            {!room && <HomeScreen />}

            {room && room.status === 'lobby' && <LobbyScreen />}

            {room && room.status === 'active' && (
              <div>
                {activeTab === 'home' && <DashboardScreen />}
                {activeTab === 'assets' && <AssetsScreen />}
                {activeTab === 'requests' && <RequestsScreen />}
                {activeTab === 'activity' && <ActivityScreen />}
                {activeTab === 'settings' && <SettingsScreen />}
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation Bar (Docked on Active Game) */}
      {room && room.status === 'active' && (
        <nav className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg pb-safe">
          <div className="max-w-2xl mx-auto px-2 py-1.5 flex items-center justify-around">
            {/* 1. Beranda */}
            <button
              onClick={() => setActiveTab('home')}
              className={`flex-1 py-1 px-2 flex flex-col items-center gap-1 rounded-xl transition-all ${
                activeTab === 'home'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'home' ? 'bg-emerald-50' : ''}`}>
                <Home className="w-5 h-5" />
              </div>
              <span className="text-[10px]">Beranda</span>
            </button>

            {/* 2. Aset */}
            <button
              onClick={() => setActiveTab('assets')}
              className={`flex-1 py-1 px-2 flex flex-col items-center gap-1 rounded-xl transition-all ${
                activeTab === 'assets'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'assets' ? 'bg-emerald-50' : ''}`}>
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px]">Aset</span>
            </button>

            {/* 3. Permintaan (Consensus Hub) with notification pill */}
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-1 px-2 flex flex-col items-center gap-1 rounded-xl transition-all relative ${
                activeTab === 'requests'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg relative ${activeTab === 'requests' ? 'bg-emerald-50' : ''}`}>
                <Scale className="w-5 h-5" />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-extrabold text-[9px] flex items-center justify-center animate-bounce">
                    {pendingRequestsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px]">Permintaan</span>
            </button>

            {/* 4. Aktivitas (Ledger) */}
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-1 px-2 flex flex-col items-center gap-1 rounded-xl transition-all ${
                activeTab === 'activity'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'activity' ? 'bg-emerald-50' : ''}`}>
                <Receipt className="w-5 h-5" />
              </div>
              <span className="text-[10px]">Aktivitas</span>
            </button>

            {/* 5. Pengaturan */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-1 px-2 flex flex-col items-center gap-1 rounded-xl transition-all ${
                activeTab === 'settings'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'settings' ? 'bg-emerald-50' : ''}`}>
                <Settings2 className="w-5 h-5" />
              </div>
              <span className="text-[10px]">Aturan</span>
            </button>
          </div>
        </nav>
      )}

      {/* Setup Guide Modal */}
      {setupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Aktivasi Cloud Firestore & Firebase Auth
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Untuk sinkronisasi multiplayer lintas perangkat nyata, autentikasi UID Google, dan ledger anti-manipulasi, sistem memerlukan integrasi Cloud Firestore.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</span>
                <span><strong>Arsitektur Selesai:</strong> Schema blueprint dan logic validation konsensus telah terpasang.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</span>
                <span><strong>Anti-Manipulasi:</strong> Tidak menggunakan localStorage sebagai sumber kebenaran saldo.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-normal">
              <strong>Catatan:</strong> Jika Anda ingin menghubungkan Firebase sekarang, ketikkan <em>"Aktifkan Firebase sekarang"</em> pada kolom percakapan agar sistem memicu wizard konfigurasi.
            </div>

            <button
              onClick={() => setSetupModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              Kembali ke Aplikasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <MonopoliProvider>
      <AppContent />
    </MonopoliProvider>
  );
}
