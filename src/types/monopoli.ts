export type GameStatus = 'lobby' | 'active' | 'finished';

export type PawnColor = 
  | 'red' 
  | 'blue' 
  | 'green' 
  | 'yellow' 
  | 'purple' 
  | 'orange' 
  | 'cyan' 
  | 'rose';

export interface GameMember {
  uid: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  pawnColor: PawnColor;
  isHost: boolean;
  balance: number;
  isBankrupt: boolean;
  joinedAt: number;
  propertiesOwnedCount: number;
}

export type AssetCategory = 'property' | 'transport' | 'utility';

export type GroupId = 'A' | 'B' | 'C' | 'D';

export interface PropertyGroupConfig {
  id: GroupId;
  label: string;
  rentMultiplier: number; // 2
  isConfirmed: boolean;
}

export const DEFAULT_GROUPS_CONFIG: Record<GroupId, PropertyGroupConfig> = {
  A: { id: 'A', label: 'Kelompok A', rentMultiplier: 2, isConfirmed: false },
  B: { id: 'B', label: 'Kelompok B', rentMultiplier: 2, isConfirmed: false },
  C: { id: 'C', label: 'Kelompok C', rentMultiplier: 2, isConfirmed: false },
  D: { id: 'D', label: 'Kelompok D', rentMultiplier: 2, isConfirmed: false },
};

// Legacy color group for backward compatibility with existing simulation preset
export type ColorGroup = 
  | 'brown' 
  | 'lightblue' 
  | 'pink' 
  | 'orange' 
  | 'red' 
  | 'yellow' 
  | 'green' 
  | 'darkblue' 
  | 'transport' 
  | 'utility';

export type PropertyStatus = 'draft' | 'ready';

export interface AssetItem {
  id: string;
  name: string;
  groupId: GroupId;
  group?: ColorGroup | string; // legacy support
  boardPosition?: number;
  category: AssetCategory;
  buyPrice: number;
  mortgageValue: number;
  rentBase: number;
  rentOneHouse: number;
  rentTwoHouses: number;
  rentThreeHouses: number;
  rentFourHouses: number;
  rentHotel: number;
  houseCost: number; // IMB per rumah
  hotelCost: number; // IMB hotel
  status: PropertyStatus;
  // Dynamic state
  ownerId: string | null;
  isMortgaged: boolean;
  housesCount: number;
  hotelsCount: number;
  createdAt?: number;
  updatedAt?: number;
}

export type TransactionType = 
  | 'initial_capital' 
  | 'pass_start' 
  | 'asset_purchase' 
  | 'rent_payment' 
  | 'tax_penalty' 
  | 'card_reward' 
  | 'mortgage' 
  | 'unmortgage' 
  | 'transfer' 
  | 'reversal';

export type TransactionStatus = 'settled' | 'pending' | 'failed' | 'reversed';

export interface LedgerEntry {
  id: string;
  gameId: string;
  timestamp: number;
  sourceId: string; // UID or 'BANK'
  sourceName: string;
  targetId: string; // UID or 'BANK'
  targetName: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string;
  referenceId?: string;
}

export type RequestType = 
  | 'buy_asset' 
  | 'claim_start' 
  | 'card_reward' 
  | 'disputed_penalty' 
  | 'reversal_correction';

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'failed_execution';

export type VoteDecision = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  gameId: string;
  requesterId: string;
  requesterName: string;
  type: RequestType;
  title: string;
  detail: string;
  amount: number;
  targetAssetId?: string;
  targetAssetName?: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  createdAt: number;
  status: RequestStatus;
  // Snapshot of active members required to vote
  validators: Record<string, {
    uid: string;
    displayName: string;
    decision: VoteDecision;
    decidedAt?: number;
  }>;
  rejectionReason?: string;
}

export interface GameRoom {
  id: string;
  roomCode: string;
  hostUid: string;
  status: GameStatus;
  createdAt: number;
  startedAt?: number;
  settings: {
    initialBalance: number;
    passStartReward: number;
    maxPlayers: number;
    catalogPreset: 'custom_abcd' | 'simulation_indonesia_legacy';
    allowNegativeBalance: boolean; // default false (strictly forbidden)
  };
  groupsConfig: Record<GroupId, PropertyGroupConfig>;
  initialBalanceDistributed: boolean;
  membersCount?: number;
}
