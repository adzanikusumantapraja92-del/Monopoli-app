import { PawnColor } from '../types/monopoli';

/**
 * Format integer into standard Indonesian Rupiah format: 'Rp1.500.000'
 * Strict integer, no decimals.
 */
export function formatRupiah(amount: number | null | undefined, emptyLabel: string = '-'): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return emptyLabel;
  }
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(Math.abs(rounded));

  if (rounded < 0) {
    return `-Rp${formatted}`;
  }
  return `Rp${formatted}`;
}

/**
 * Short representation for mobile summaries, e.g. Rp15 Jt
 */
export function formatRupiahShort(amount: number | null | undefined, emptyLabel: string = '-'): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return emptyLabel;
  }
  const rounded = Math.round(amount);
  if (Math.abs(rounded) >= 1_000_000) {
    const jt = (rounded / 1_000_000).toFixed(1).replace('.0', '');
    return `Rp${jt} Jt`;
  }
  if (Math.abs(rounded) >= 1_000) {
    const rb = (rounded / 1_000).toFixed(0);
    return `Rp${rb} Rb`;
  }
  return formatRupiah(rounded, emptyLabel);
}

/**
 * Format timestamp to WIB time string (HH:mm:ss atau DD MMM YYYY, HH:mm WIB)
 */
export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date) + ' WIB';
}

/**
 * Generate 6-character room code, e.g., 'MNP-8492'
 */
export function generateRoomCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MNP-${num}`;
}

export function getPawnBadge(color: PawnColor): {
  name: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (color) {
    case 'red':
      return { name: 'Pion Merah', badgeClass: 'bg-red-50 text-red-700 border-red-200', dotClass: 'bg-red-500' };
    case 'blue':
      return { name: 'Pion Biru', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-500' };
    case 'green':
      return { name: 'Pion Hijau', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500' };
    case 'yellow':
      return { name: 'Pion Kuning', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-500' };
    case 'purple':
      return { name: 'Pion Ungu', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', dotClass: 'bg-purple-500' };
    case 'orange':
      return { name: 'Pion Oranye', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200', dotClass: 'bg-orange-500' };
    case 'cyan':
      return { name: 'Pion Cyan', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200', dotClass: 'bg-cyan-500' };
    case 'rose':
      return { name: 'Pion Mawar', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', dotClass: 'bg-rose-500' };
    default:
      return { name: 'Pion Netral', badgeClass: 'bg-slate-50 text-slate-700 border-slate-200', dotClass: 'bg-slate-500' };
  }
}
