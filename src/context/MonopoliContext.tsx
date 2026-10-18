import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  GameRoom, 
  GameMember, 
  AssetItem, 
  LedgerEntry, 
  ApprovalRequest, 
  PawnColor,
  VoteDecision
} from '../types/monopoli';
import { SIMULASI_INDONESIA_ASSETS } from '../data/mockIndonesianAssets';
import { generateRoomCode } from '../utils/formatters';

interface MonopoliContextType {
  room: GameRoom | null;
  members: GameMember[];
  assets: AssetItem[];
  transactions: LedgerEntry[];
  requests: ApprovalRequest[];
  currentMember: GameMember | null;
  isHost: boolean;
  activeTab: 'home' | 'assets' | 'requests' | 'activity' | 'settings';
  setActiveTab: (tab: 'home' | 'assets' | 'requests' | 'activity' | 'settings') => void;
  createGame: (hostName: string, pawnColor: PawnColor, initialBalance: number, passStartReward: number, maxPlayers: number, catalogPreset: 'simulation_indonesia' | 'custom_blank') => void;
  joinGame: (roomCode: string, playerName: string, pawnColor: PawnColor) => boolean;
  startGame: () => void;
  addSimulationMember: (name: string, pawnColor: PawnColor) => void;
  castVote: (requestId: string, decision: 'approved' | 'rejected') => void;
  submitRequest: (type: ApprovalRequest['type'], title: string, detail: string, amount: number, targetAssetId?: string) => void;
  resetGame: () => void;
}

const MonopoliContext = createContext<MonopoliContextType | undefined>(undefined);

export const MonopoliProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'assets' | 'requests' | 'activity' | 'settings'>('home');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [members, setMembers] = useState<GameMember[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>(SIMULASI_INDONESIA_ASSETS);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  const currentMember = members.find(m => m.uid === currentMemberId) || null;
  const isHost = currentMember?.isHost ?? false;

  // Create a new game room
  const createGame = (
    hostName: string, 
    pawnColor: PawnColor, 
    initialBalance: number, 
    passStartReward: number, 
    maxPlayers: number,
    catalogPreset: 'simulation_indonesia' | 'custom_blank'
  ) => {
    const roomId = 'room_' + Date.now();
    const roomCode = generateRoomCode();
    const hostUid = 'user_' + Date.now();

    const hostMember: GameMember = {
      uid: hostUid,
      displayName: hostName || 'Pemain 1 (Host)',
      pawnColor,
      isHost: true,
      balance: 0, // not distributed until started
      isBankrupt: false,
      joinedAt: Date.now(),
      propertiesOwnedCount: 0,
    };

    const newRoom: GameRoom = {
      id: roomId,
      roomCode,
      hostUid,
      status: 'lobby',
      createdAt: Date.now(),
      settings: {
        initialBalance,
        passStartReward,
        maxPlayers,
        catalogPreset,
        allowNegativeBalance: false,
      },
      initialBalanceDistributed: false,
    };

    // Initialize asset list based on catalog selection
    const initialAssets: AssetItem[] = catalogPreset === 'simulation_indonesia' 
      ? SIMULASI_INDONESIA_ASSETS.map(a => ({ ...a, ownerId: null, isMortgaged: false, housesCount: 0, hotelsCount: 0 }))
      : [];

    setRoom(newRoom);
    setMembers([hostMember]);
    setAssets(initialAssets);
    setTransactions([]);
    setRequests([]);
    setCurrentMemberId(hostUid);
    setActiveTab('home');
  };

  // Join existing game room
  const joinGame = (roomCode: string, playerName: string, pawnColor: PawnColor): boolean => {
    if (!room || room.roomCode.toUpperCase() !== roomCode.toUpperCase()) {
      return false;
    }

    if (members.length >= room.settings.maxPlayers) {
      return false;
    }

    const newUid = 'user_' + Date.now();
    const newMember: GameMember = {
      uid: newUid,
      displayName: playerName || `Pemain ${members.length + 1}`,
      pawnColor,
      isHost: false,
      balance: room.status === 'active' ? room.settings.initialBalance : 0,
      isBankrupt: false,
      joinedAt: Date.now(),
      propertiesOwnedCount: 0,
    };

    setMembers(prev => [...prev, newMember]);
    setCurrentMemberId(newUid);
    return true;
  };

  // Add simulated co-player (useful for demonstrating 2-8 multiplayer setup in lobby)
  const addSimulationMember = (name: string, pawnColor: PawnColor) => {
    if (!room || members.length >= room.settings.maxPlayers) return;
    const simUid = 'sim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newMember: GameMember = {
      uid: simUid,
      displayName: name,
      pawnColor,
      isHost: false,
      balance: 0,
      isBankrupt: false,
      joinedAt: Date.now(),
      propertiesOwnedCount: 0,
    };
    setMembers(prev => [...prev, newMember]);
  };

  // Start game: Exactly once atomic initial capital distribution
  const startGame = () => {
    if (!room || room.status !== 'lobby' || room.initialBalanceDistributed) return;

    const initialAmount = room.settings.initialBalance;
    const timestamp = Date.now();
    const initialLedgerEntries: LedgerEntry[] = [];

    // Distribute starting money to each player in room
    const updatedMembers = members.map((member, index) => {
      const txId = `TX-INIT-${room.roomCode}-${index + 1}`;
      initialLedgerEntries.push({
        id: txId,
        gameId: room.id,
        timestamp,
        sourceId: 'BANK',
        sourceName: 'Bank Monopoli Sentral',
        targetId: member.uid,
        targetName: member.displayName,
        type: 'initial_capital',
        amount: initialAmount,
        status: 'settled',
        description: `Pembagian modal awal permainan (${member.displayName})`,
        referenceId: room.id,
      });

      return {
        ...member,
        balance: initialAmount,
      };
    });

    // Sample initial demo approval request for physical event validation
    const sampleRequest: ApprovalRequest = {
      id: `REQ-${Date.now()}`,
      gameId: room.id,
      requesterId: updatedMembers[0].uid,
      requesterName: updatedMembers[0].displayName,
      type: 'claim_start',
      title: 'Klaim Melewati Petak START',
      detail: `${updatedMembers[0].displayName} mendarat/melewati petak START pada papan fisik.`,
      amount: room.settings.passStartReward,
      createdAt: Date.now(),
      status: 'pending',
      validators: updatedMembers.reduce((acc, m) => {
        acc[m.uid] = {
          uid: m.uid,
          displayName: m.displayName,
          // Requester auto-approves according to rule #4
          decision: m.uid === updatedMembers[0].uid ? 'approved' : 'pending',
          decidedAt: m.uid === updatedMembers[0].uid ? Date.now() : undefined,
        };
        return acc;
      }, {} as ApprovalRequest['validators']),
    };

    setRoom(prev => prev ? {
      ...prev,
      status: 'active',
      startedAt: timestamp,
      initialBalanceDistributed: true,
    } : null);

    setMembers(updatedMembers);
    setTransactions(initialLedgerEntries);
    setRequests([sampleRequest]);
  };

  // Submit new consensus request
  const submitRequest = (
    type: ApprovalRequest['type'],
    title: string,
    detail: string,
    amount: number,
    targetAssetId?: string
  ) => {
    if (!room || !currentMember) return;

    const targetAsset = assets.find(a => a.id === targetAssetId);

    const newRequest: ApprovalRequest = {
      id: `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      gameId: room.id,
      requesterId: currentMember.uid,
      requesterName: currentMember.displayName,
      type,
      title,
      detail,
      amount,
      targetAssetId,
      targetAssetName: targetAsset?.name,
      createdAt: Date.now(),
      status: 'pending',
      validators: members.reduce((acc, m) => {
        acc[m.uid] = {
          uid: m.uid,
          displayName: m.displayName,
          decision: m.uid === currentMember.uid ? 'approved' : 'pending',
          decidedAt: m.uid === currentMember.uid ? Date.now() : undefined,
        };
        return acc;
      }, {} as ApprovalRequest['validators']),
    };

    setRequests(prev => [newRequest, ...prev]);
  };

  // Cast vote on a consensus request
  const castVote = (requestId: string, decision: 'approved' | 'rejected') => {
    if (!currentMember || !room) return;

    setRequests(prev => prev.map(req => {
      if (req.id !== requestId || req.status !== 'pending') return req;

      const updatedValidators = {
        ...req.validators,
        [currentMember.uid]: {
          ...req.validators[currentMember.uid],
          decision,
          decidedAt: Date.now(),
        },
      };

      // Rule #4: 1 rejection terminates the request as rejected immediately
      const hasRejection = Object.values(updatedValidators).some(v => v.decision === 'rejected');
      if (hasRejection) {
        return {
          ...req,
          validators: updatedValidators,
          status: 'rejected' as const,
          rejectionReason: `Ditolak oleh ${currentMember.displayName}`,
        };
      }

      // Check if all active validators have approved
      const allApproved = Object.values(updatedValidators).every(v => v.decision === 'approved');
      if (allApproved) {
        // Execute request atomically
        if (req.type === 'claim_start') {
          // Add ledger entry
          const newTx: LedgerEntry = {
            id: `TX-START-${Date.now()}`,
            gameId: room.id,
            timestamp: Date.now(),
            sourceId: 'BANK',
            sourceName: 'Bank Monopoli Sentral',
            targetId: req.requesterId,
            targetName: req.requesterName,
            type: 'pass_start',
            amount: req.amount,
            status: 'settled',
            description: `Hadiah melewati START (+${req.amount})`,
          };
          setTransactions(t => [newTx, ...t]);

          // Update member balance
          setMembers(mList => mList.map(m => m.uid === req.requesterId ? { ...m, balance: m.balance + req.amount } : m));
        }

        return {
          ...req,
          validators: updatedValidators,
          status: 'approved' as const,
        };
      }

      return {
        ...req,
        validators: updatedValidators,
      };
    }));
  };

  const resetGame = () => {
    setRoom(null);
    setMembers([]);
    setAssets(SIMULASI_INDONESIA_ASSETS);
    setTransactions([]);
    setRequests([]);
    setCurrentMemberId(null);
    setActiveTab('home');
  };

  return (
    <MonopoliContext.Provider
      value={{
        room,
        members,
        assets,
        transactions,
        requests,
        currentMember,
        isHost,
        activeTab,
        setActiveTab,
        createGame,
        joinGame,
        startGame,
        addSimulationMember,
        castVote,
        submitRequest,
        resetGame,
      }}
    >
      {children}
    </MonopoliContext.Provider>
  );
};

export const useMonopoli = () => {
  const context = useContext(MonopoliContext);
  if (!context) {
    throw new Error('useMonopoli must be used within a MonopoliProvider');
  }
  return context;
};
