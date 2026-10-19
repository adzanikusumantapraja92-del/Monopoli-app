import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  GameRoom, 
  GameMember, 
  AssetItem, 
  LedgerEntry, 
  ApprovalRequest, 
  PawnColor,
  RequestType,
  VoteDecision,
  GroupId,
  DEFAULT_GROUPS_CONFIG
} from '../types/monopoli';
import { PRESET_LEGACY_SIMULASI_ASSETS } from '../data/mockIndonesianAssets';
import { generateRoomCode } from '../utils/formatters';
import { 
  auth, 
  db, 
  isFirebaseConfigured, 
  signInWithGoogle, 
  signOutUser,
  createGameViaBackend,
  lookupRoomByCode,
  joinGameViaBackend,
  distributeInitialBalanceViaBackend,
  submitRequestViaBackend,
  castVoteViaBackend,
  createAssetViaBackend,
  updateAssetViaBackend,
  deleteAssetViaBackend,
  confirmGroupViaBackend
} from '../services/firebase';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';

interface MonopoliContextType {
  room: GameRoom | null;
  members: GameMember[];
  assets: AssetItem[];
  transactions: LedgerEntry[];
  requests: ApprovalRequest[];
  currentMember: GameMember | null;
  currentUser: User | null;
  isHost: boolean;
  isLoading: boolean;
  isFirebaseConfigured: boolean;
  activeTab: 'home' | 'assets' | 'requests' | 'activity' | 'settings';
  setActiveTab: (tab: 'home' | 'assets' | 'requests' | 'activity' | 'settings') => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  createGame: (
    hostName: string, 
    pawnColor: PawnColor, 
    initialBalance: number, 
    passStartReward: number, 
    maxPlayers: number, 
    catalogPreset: 'custom_abcd' | 'simulation_indonesia_legacy'
  ) => Promise<void>;
  joinGame: (roomCode: string, playerName: string, pawnColor: PawnColor) => Promise<boolean>;
  startGame: () => Promise<void>;
  castVote: (requestId: string, decision: 'approved' | 'rejected') => Promise<void>;
  submitRequest: (type: RequestType, title: string, detail: string, amount: number) => Promise<void>;
  createProperty: (property: Partial<AssetItem>) => Promise<AssetItem>;
  updateProperty: (assetId: string, property: Partial<AssetItem>) => Promise<AssetItem>;
  deleteProperty: (assetId: string) => Promise<void>;
  confirmGroup: (groupId: GroupId, isConfirmed: boolean) => Promise<void>;
  resetGame: () => void;
}

const MonopoliContext = createContext<MonopoliContextType | undefined>(undefined);

const LOCAL_STORAGE_ROOM_KEY = 'monopoli_bank_active_room_id';
const LOCAL_STORAGE_PAWN_KEY = 'monopoli_bank_pawn_color';

export const MonopoliProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'assets' | 'requests' | 'activity' | 'settings'>('home');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [members, setMembers] = useState<GameMember[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active room ID stored in localStorage for session restoration across refresh
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    return localStorage.getItem(LOCAL_STORAGE_ROOM_KEY);
  });

  // Track Firebase Auth state
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Restore and attach real-time Firestore listeners when room ID is present
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !activeRoomId) {
      return;
    }

    const gameDocRef = doc(db, 'games', activeRoomId);

    // 1. Listen to Game Room doc
    const unsubGame = onSnapshot(gameDocRef, (snap) => {
      if (snap.exists()) {
        setRoom(snap.data() as GameRoom);
      } else {
        setRoom(null);
        localStorage.removeItem(LOCAL_STORAGE_ROOM_KEY);
        setActiveRoomId(null);
      }
    }, (error) => {
      console.warn('Game room listener access error (membership required):', error);
    });

    // 2. Listen to Members subcollection
    const membersColRef = collection(db, 'games', activeRoomId, 'members');
    const unsubMembers = onSnapshot(membersColRef, (snap) => {
      const memberList: GameMember[] = [];
      snap.forEach((docSnap) => {
        memberList.push(docSnap.data() as GameMember);
      });
      memberList.sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));
      setMembers(memberList);
    }, (error) => {
      console.warn('Members listener error:', error);
    });

    // 3. Listen to Assets subcollection (Single Source of Truth)
    const assetsColRef = collection(db, 'games', activeRoomId, 'assets');
    const unsubAssets = onSnapshot(assetsColRef, (snap) => {
      const assetList: AssetItem[] = [];
      snap.forEach((docSnap) => {
        assetList.push(docSnap.data() as AssetItem);
      });
      // Sort by boardPosition if available, otherwise by groupId then createdAt
      assetList.sort((a, b) => {
        if (a.boardPosition && b.boardPosition) return a.boardPosition - b.boardPosition;
        if (a.groupId !== b.groupId) return a.groupId.localeCompare(b.groupId);
        return a.name.localeCompare(b.name);
      });
      setAssets(assetList);
    }, (error) => {
      console.warn('Assets listener error:', error);
    });

    // 4. Listen to Transactions subcollection (Append-only Ledger)
    const txColRef = query(
      collection(db, 'games', activeRoomId, 'transactions'),
      orderBy('timestamp', 'desc')
    );
    const unsubTx = onSnapshot(txColRef, (snap) => {
      const txList: LedgerEntry[] = [];
      snap.forEach((docSnap) => {
        txList.push(docSnap.data() as LedgerEntry);
      });
      setTransactions(txList);
    }, (error) => {
      console.warn('Transactions listener error:', error);
    });

    // 5. Listen to Consensus Requests subcollection
    const reqColRef = query(
      collection(db, 'games', activeRoomId, 'requests'),
      orderBy('createdAt', 'desc')
    );
    const unsubReq = onSnapshot(reqColRef, (snap) => {
      const reqList: ApprovalRequest[] = [];
      snap.forEach((docSnap) => {
        reqList.push(docSnap.data() as ApprovalRequest);
      });
      setRequests(reqList);
    }, (error) => {
      console.warn('Requests listener error:', error);
    });

    return () => {
      unsubGame();
      unsubMembers();
      unsubAssets();
      unsubTx();
      unsubReq();
    };
  }, [activeRoomId]);

  // Identify current member in room
  const currentMember = members.find(m => {
    if (currentUser) {
      return m.uid === currentUser.uid;
    }
    return m.isHost;
  }) || (members.length > 0 ? members[0] : null);

  const isHost = currentMember?.isHost ?? false;

  const loginWithGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
      alert('Gagal melakukan Google Sign-In. Pastikan konfigurasi Firebase Auth telah diaktifkan.');
    }
  };

  const logout = async () => {
    await signOutUser();
    setCurrentUser(null);
  };

  // Host creates game room via trusted backend
  const createGame = async (
    hostName: string, 
    pawnColor: PawnColor, 
    initialBalance: number, 
    passStartReward: number, 
    maxPlayers: number,
    catalogPreset: 'custom_abcd' | 'simulation_indonesia_legacy'
  ) => {
    if (isFirebaseConfigured && db) {
      let user = currentUser;
      if (!user) {
        user = await signInWithGoogle();
        if (!user) return;
      }

      const { gameId } = await createGameViaBackend(
        {
          uid: user.uid,
          displayName: hostName || user.displayName || 'Host Permainan',
          email: user.email || undefined,
          photoURL: user.photoURL || undefined,
        },
        pawnColor,
        {
          initialBalance,
          passStartReward,
          maxPlayers,
          catalogPreset,
        }
      );

      localStorage.setItem(LOCAL_STORAGE_ROOM_KEY, gameId);
      localStorage.setItem(LOCAL_STORAGE_PAWN_KEY, pawnColor);
      setActiveRoomId(gameId);
      setActiveTab('home');
    } else {
      // Local preview room (read-only financial mode)
      const roomId = 'room_preview_' + Date.now();
      const roomCode = generateRoomCode();
      const mockHost: GameMember = {
        uid: 'user_preview_host',
        displayName: hostName || 'Pemain (Host)',
        pawnColor,
        isHost: true,
        balance: 0,
        isBankrupt: false,
        joinedAt: Date.now(),
        propertiesOwnedCount: 0,
      };

      const newRoom: GameRoom = {
        id: roomId,
        roomCode,
        hostUid: mockHost.uid,
        status: 'lobby',
        createdAt: Date.now(),
        settings: {
          initialBalance,
          passStartReward,
          maxPlayers,
          catalogPreset,
          allowNegativeBalance: false,
        },
        groupsConfig: DEFAULT_GROUPS_CONFIG,
        initialBalanceDistributed: false,
      };

      setRoom(newRoom);
      setMembers([mockHost]);
      setAssets(catalogPreset === 'simulation_indonesia_legacy' ? PRESET_LEGACY_SIMULASI_ASSETS : []);
      setTransactions([]);
      setRequests([]);
      setActiveTab('home');
    }
  };

  // Join existing game room
  const joinGame = async (roomCode: string, playerName: string, pawnColor: PawnColor): Promise<boolean> => {
    if (isFirebaseConfigured && db) {
      let user = currentUser;
      if (!user) {
        user = await signInWithGoogle();
        if (!user) return false;
      }

      // 1. Secure lookup via backend
      const lookupResult = await lookupRoomByCode(roomCode);
      if (!lookupResult) {
        return false;
      }

      // 2. Atomic join via backend
      await joinGameViaBackend(
        lookupResult.gameId,
        playerName || user.displayName || 'Pemain',
        pawnColor
      );

      localStorage.setItem(LOCAL_STORAGE_ROOM_KEY, lookupResult.gameId);
      localStorage.setItem(LOCAL_STORAGE_PAWN_KEY, pawnColor);
      setActiveRoomId(lookupResult.gameId);
      setActiveTab('home');
      return true;
    } else {
      if (!room || room.roomCode.toUpperCase() !== roomCode.toUpperCase()) {
        return false;
      }
      const newMember: GameMember = {
        uid: 'user_preview_' + Date.now(),
        displayName: playerName || `Pemain ${members.length + 1}`,
        pawnColor,
        isHost: false,
        balance: 0,
        isBankrupt: false,
        joinedAt: Date.now(),
        propertiesOwnedCount: 0,
      };
      setMembers(prev => [...prev, newMember]);
      return true;
    }
  };

  // Start game: atomic server-side distribution and ledger generation
  const startGame = async () => {
    if (!room || room.status !== 'lobby') return;

    if (isFirebaseConfigured && db) {
      await distributeInitialBalanceViaBackend(room.id);
    } else {
      alert('Tindakan finansial dinonaktifkan dalam mode preview tanpa backend. Harap konfigurasikan Firebase untuk memulai permainan multiplayer nyata.');
    }
  };

  // Submit consensus request
  const submitRequest = async (
    type: RequestType,
    title: string,
    detail: string,
    amount: number
  ) => {
    if (!room || !currentMember) return;

    if (isFirebaseConfigured && db) {
      await submitRequestViaBackend(
        room.id,
        type,
        title,
        detail,
        amount
      );
    } else {
      alert('Tindakan finansial dinonaktifkan dalam mode preview tanpa backend.');
    }
  };

  // Cast consensus vote: verified by backend
  const castVote = async (requestId: string, decision: 'approved' | 'rejected') => {
    if (!currentMember || !room) return;

    if (isFirebaseConfigured && db) {
      await castVoteViaBackend(room.id, requestId, decision);
    } else {
      alert('Tindakan finansial dinonaktifkan dalam mode preview tanpa backend.');
    }
  };

  // Create Property in Catalog
  const createProperty = async (property: Partial<AssetItem>): Promise<AssetItem> => {
    if (!room) throw new Error('Room tidak ditemukan.');

    if (isFirebaseConfigured && db) {
      return await createAssetViaBackend(room.id, property);
    } else {
      const assetId = `prop-${(property.groupId || 'A').toLowerCase()}-${Date.now().toString(36)}`;
      const newAsset: AssetItem = {
        id: assetId,
        name: property.name || 'Properti Baru',
        groupId: property.groupId || 'A',
        boardPosition: property.boardPosition,
        category: 'property',
        buyPrice: Number(property.buyPrice) || 0,
        mortgageValue: Number(property.mortgageValue) || 0,
        rentBase: Number(property.rentBase) || 0,
        rentOneHouse: Number(property.rentOneHouse) || 0,
        rentTwoHouses: Number(property.rentTwoHouses) || 0,
        rentThreeHouses: Number(property.rentThreeHouses) || 0,
        rentFourHouses: Number(property.rentFourHouses) || 0,
        rentHotel: Number(property.rentHotel) || 0,
        houseCost: Number(property.houseCost) || 0,
        hotelCost: Number(property.hotelCost) || 0,
        status: property.status === 'ready' ? 'ready' : 'draft',
        ownerId: null,
        isMortgaged: false,
        housesCount: 0,
        hotelsCount: 0,
      };
      setAssets(prev => [...prev, newAsset]);
      return newAsset;
    }
  };

  // Update Property in Catalog
  const updateProperty = async (assetId: string, property: Partial<AssetItem>): Promise<AssetItem> => {
    if (!room) throw new Error('Room tidak ditemukan.');

    if (isFirebaseConfigured && db) {
      return await updateAssetViaBackend(room.id, assetId, property);
    } else {
      let updated: AssetItem | null = null;
      setAssets(prev => prev.map(a => {
        if (a.id === assetId) {
          updated = { ...a, ...property } as AssetItem;
          return updated;
        }
        return a;
      }));
      return updated!;
    }
  };

  // Delete Property from Catalog
  const deleteProperty = async (assetId: string): Promise<void> => {
    if (!room) throw new Error('Room tidak ditemukan.');

    if (isFirebaseConfigured && db) {
      await deleteAssetViaBackend(room.id, assetId);
    } else {
      setAssets(prev => prev.filter(a => a.id !== assetId));
    }
  };

  // Confirm or Unconfirm Group A/B/C/D
  const confirmGroup = async (groupId: GroupId, isConfirmed: boolean): Promise<void> => {
    if (!room) throw new Error('Room tidak ditemukan.');

    if (isFirebaseConfigured && db) {
      const res = await confirmGroupViaBackend(room.id, groupId, isConfirmed);
      if (res?.groupsConfig) {
        setRoom(prev => prev ? { ...prev, groupsConfig: res.groupsConfig } : null);
      }
    } else {
      setRoom(prev => {
        if (!prev) return null;
        const updated = {
          ...prev.groupsConfig,
          [groupId]: {
            ...prev.groupsConfig[groupId],
            isConfirmed,
          },
        };
        return { ...prev, groupsConfig: updated };
      });
    }
  };

  const resetGame = () => {
    localStorage.removeItem(LOCAL_STORAGE_ROOM_KEY);
    setActiveRoomId(null);
    setRoom(null);
    setMembers([]);
    setAssets([]);
    setTransactions([]);
    setRequests([]);
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
        currentUser,
        isHost,
        isLoading,
        isFirebaseConfigured,
        activeTab,
        setActiveTab,
        loginWithGoogle,
        logout,
        createGame,
        joinGame,
        startGame,
        castVote,
        submitRequest,
        createProperty,
        updateProperty,
        deleteProperty,
        confirmGroup,
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
