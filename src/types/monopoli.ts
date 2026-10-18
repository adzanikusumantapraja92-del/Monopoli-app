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

export interface AssetItem {
  id: string;
  name: string;
  group: ColorGroup;
  category: AssetCategory;
  buyPrice: number;
  mortgageValue: number;
  rentBase: number;
  rentOneHouse?: number;
  rentTwoHouses?: number;
  rentThreeHouses?: number;
  rentFourHouses?: number;
  rentHotel?: number;
  houseCost?: number;
  hotelCost?: number;
  // Dynamic state
  ownerId: string | null;
  isMortgaged: boolean;
  housesCount: number;
  hotelsCount: number;
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
    catalogPreset: 'simulation_indonesia' | 'custom_blank';
    allowNegativeBalance: boolean; // default false (strictly forbidden)
  };
  initialBalanceDistributed: boolean;
}
