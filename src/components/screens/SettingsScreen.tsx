import React, { useState } from 'react';
import { useMonopoli } from '../../context/MonopoliContext';
import { formatRupiah, getPawnBadge } from '../../utils/formatters';
import { 
  Settings2, 
  ShieldAlert, 
  LogOut, 
  Users, 
  Landmark, 
  FileText, 
  Sparkles, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { room, members, currentMember, resetGame } = useMonopoli();
  const [confirmReset, setConfirmReset] = useState(false);

  if (!room) return null;

  const myPawn = currentMember ? getPawnBadge(currentMember.pawnColor) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Room Identity Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-emerald-600" />
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Pengaturan & Identitas Room
            </h1>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
            {room.status === 'active' ? 'Permainan Berjalan' : room.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Kode Room</span>
            <span className="text-sm font-mono font-extrabold text-slate-900 mt-0.5 block">
              {room.roomCode}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Identitas Akun Saya</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
              {currentMember?.displayName} ({myPawn?.name})
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
            <span className="text-slate-400 block text-[10px]">Status Peran</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">
              {currentMember?.isHost ? 'Host Permainan' : 'Pemain Peserta'}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Rules Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Parameter Finansial Terkunci
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-600">Saldo Awal Pemain</span>
            <span className="font-extrabold text-slate-900">{formatRupiah(room.settings.initialBalance)}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-600">Hadiah Melewati Petak START</span>
            <span className="font-extrabold text-emerald-700">+{formatRupiah(room.settings.passStartReward)}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-600">Preset Katalog Aset</span>
            <span className="font-extrabold text-slate-900">
              {room.settings.catalogPreset === 'simulation_indonesia' ? 'Data Simulasi Indonesia (28)' : 'Katalog Kosong'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-600">Batas Saldo Minimum</span>
            <span className="font-extrabold text-slate-900">Rp0 (Tidak Boleh Negatif)</span>
          </div>
        </div>
      </div>

      {/* 8 Principles Reference */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          8 Prinsip Utama Sistem (Spesifikasi Build 01)
        </h2>

        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
            <span className="font-bold text-slate-900 w-4">1.</span>
            <span><strong>Bank adalah Mesin Otomatis:</strong> Bukan akun manusia atau pemain di meja.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
            <span className="font-bold text-slate-900 w-4">2.</span>
            <span><strong>Satu Akun Per Pemain:</strong> Terikat dalam satu ruang permainan.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
            <span className="font-bold text-slate-900 w-4">3.</span>
            <span><strong>Host Bukan Diktator:</strong> Hanya mengelola konfigurasi awal, tidak berhak mengedit uang sepihak.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
            <span className="font-bold text-slate-900 w-4">4.</span>
            <span><strong>Pemain sebagai Validator Fisik:</strong> Mengesahkan kejadian papan yang tidak terdeteksi gawai.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
            <span className="font-bold text-slate-900 w-4">5.</span>
            <span><strong>Transaksi Terverifikasi:</strong> Semua mutasi wajib memiliki ID unik dan status terselesaikan.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
            <span className="font-bold text-slate-900 w-4">6.</span>
            <span><strong>Bebas Campur Tangan AI:</strong> Gemini AI dilarang menghitung saldo atau mengesahkan kepemilikan.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
            <span className="font-bold text-slate-900 w-4">7.</span>
            <span><strong>Mata Uang Rupiah Bulat:</strong> Format baku Rp1.500.000 tanpa sen atau desimal.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
            <span className="font-bold text-slate-900 w-4">8.</span>
            <span><strong>Katalog Aset Fleksibel:</strong> Sesuai papan fisik dengan label jelas Data Simulasi.</span>
          </div>
        </div>
      </div>

      {/* Danger Zone: Leave / Reset */}
      <div className="pt-2">
        {confirmReset ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center space-y-3">
            <p className="text-xs font-bold text-rose-900">
              Apakah Anda yakin ingin keluar dari room dan mereset permainan ini?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                onClick={resetGame}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-xs"
              >
                Ya, Keluar Room
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Keluar dari Ruang Permainan</span>
          </button>
        )}
      </div>
    </div>
  );
};
