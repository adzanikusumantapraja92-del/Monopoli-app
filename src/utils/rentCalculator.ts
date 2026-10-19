import { AssetItem, PropertyGroupConfig, GroupId } from '../types/monopoli';

export interface RentCalculationResult {
  rentAmount: number;
  isMonopolyBonus: boolean;
  isMortgaged: boolean;
  rateType: 'mortgaged' | 'empty_land' | 'empty_land_monopoly' | 'house_1' | 'house_2' | 'house_3' | 'house_4' | 'hotel';
  description: string;
}

/**
 * Pure function penghitung tarif sewa properti Monopoli Bank Indonesia.
 * Tidak melakukan mutasi saldo atau efek samping (side effects).
 * 
 * Aturan:
 * 1. Aset digadaikan: sewa = 0 (tidak dapat ditagih).
 * 2. Memiliki Hotel: gunakan rentHotel.
 * 3. Memiliki 1–4 Rumah: gunakan rentOneHouse s/d rentFourHouses.
 * 4. Tanah kosong (0 rumah & 0 hotel):
 *    - Cek apakah pemilik memiliki SELURUH aset dalam kelompok A/B/C/D yang sama.
 *    - Cek apakah kelompok telah dikonfirmasi lengkap oleh host.
 *    - Jika seluruh aset kelompok dimiliki dan kelompok dikonfirmasi lengkap: sewa tanah dasar × 2.
 *    - Jika kelompok belum dikonfirmasi atau belum lengkap dimiliki: sewa dasar normal.
 */
export function calculateRent(
  targetAsset: AssetItem,
  allAssets: AssetItem[],
  groupsConfig?: Record<GroupId, PropertyGroupConfig>
): RentCalculationResult {
  // 1. Aset digadaikan: tidak dapat ditagih
  if (targetAsset.isMortgaged) {
    return {
      rentAmount: 0,
      isMonopolyBonus: false,
      isMortgaged: true,
      rateType: 'mortgaged',
      description: 'Properti sedang digadaikan ke Bank (bebas biaya sewa).',
    };
  }

  // 2. Hotel
  if (targetAsset.hotelsCount > 0) {
    const amount = Math.max(0, Math.round(targetAsset.rentHotel || 0));
    return {
      rentAmount: amount,
      isMonopolyBonus: false,
      isMortgaged: false,
      rateType: 'hotel',
      description: `Tarif sewa dengan 1 Hotel.`,
    };
  }

  // 3. 1–4 Rumah
  if (targetAsset.housesCount > 0) {
    let amount = 0;
    let rateType: RentCalculationResult['rateType'] = 'house_1';
    switch (targetAsset.housesCount) {
      case 1:
        amount = targetAsset.rentOneHouse || 0;
        rateType = 'house_1';
        break;
      case 2:
        amount = targetAsset.rentTwoHouses || 0;
        rateType = 'house_2';
        break;
      case 3:
        amount = targetAsset.rentThreeHouses || 0;
        rateType = 'house_3';
        break;
      case 4:
      default:
        amount = targetAsset.rentFourHouses || 0;
        rateType = 'house_4';
        break;
    }
    return {
      rentAmount: Math.max(0, Math.round(amount)),
      isMonopolyBonus: false,
      isMortgaged: false,
      rateType,
      description: `Tarif sewa dengan ${targetAsset.housesCount} Rumah.`,
    };
  }

  // 4. Tanah Kosong (0 Rumah & 0 Hotel)
  const baseRent = Math.max(0, Math.round(targetAsset.rentBase || 0));
  const groupId = targetAsset.groupId;

  // Cek kelengkapan kelompok berdasarkan data aset dan pemilik aktual
  if (targetAsset.ownerId && groupId) {
    const groupAssets = allAssets.filter(a => a.groupId === groupId && a.status === 'ready');
    const groupConfig = groupsConfig ? groupsConfig[groupId] : undefined;
    const isGroupConfirmed = groupConfig?.isConfirmed ?? false;

    // Kelompok dianggap memiliki bonus set hanya jika:
    // a. Minimal ada 1 aset di kelompok tersebut
    // b. Kelompok telah dikonfirmasi host
    // c. Seluruh aset di kelompok tersebut dimiliki oleh pemain yang sama
    const hasAssets = groupAssets.length > 0;
    const allOwnedBySamePlayer = hasAssets && groupAssets.every(a => a.ownerId === targetAsset.ownerId);

    if (isGroupConfirmed && allOwnedBySamePlayer) {
      const multiplier = groupConfig?.rentMultiplier || 2;
      const boostedRent = baseRent * multiplier;
      return {
        rentAmount: boostedRent,
        isMonopolyBonus: true,
        isMortgaged: false,
        rateType: 'empty_land_monopoly',
        description: `Sewa tanah kosong × ${multiplier} (Monopoli penuh Kelompok ${groupId}).`,
      };
    }
  }

  return {
    rentAmount: baseRent,
    isMonopolyBonus: false,
    isMortgaged: false,
    rateType: 'empty_land',
    description: `Tarif sewa tanah kosong normal.`,
  };
}

/**
 * Helper untuk menghitung statistik kelompok A, B, C, D
 */
export function getGroupStatistics(groupId: GroupId, allAssets: AssetItem[]) {
  const groupAssets = allAssets.filter(a => a.groupId === groupId);
  const readyCount = groupAssets.filter(a => a.status === 'ready').length;
  const draftCount = groupAssets.filter(a => a.status === 'draft').length;
  
  return {
    total: groupAssets.length,
    ready: readyCount,
    draft: draftCount,
    assets: groupAssets,
  };
}
