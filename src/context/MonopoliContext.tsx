import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  GameRoom, 
  GameMember, 
  AssetItem, 
  LedgerEntry, 
  ApprovalRequest, 
  PawnColor,
  RequestType,
  VoteDecision
} from '../types/monopoli';
import { SIMULASI_INDONESIA_ASSETS } from '../data/mockIndonesianAssets';
import { generateRoomCode } from '../utils/formatters';
import { 
  auth, 
  db, 
  isFirebaseConfigured, 
  signInWithGoogle, 
  signOutUser,
  createGameInFirestore,
  findGameByRoomCode,
  joinGameInFirestore,
  distributeInitialBalanceAtomic,
  submitRequestToFirestore,
  castVoteInFirestore
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
    catalogPreset: 'simulation_indonesia' | 'custom_blank'
  ) => Promise<void>;
  joinGame: (roomCode: string, playerName: string, pawnColor: PawnColor) => Promise<boolean>;
  startGame: () => Promise<void>;
  castVote: (requestId: string, decision: 'approved' | 'rejected') => Promise<void>;
  submitRequest: (type: RequestType, title: string, detail: string, amount: number) => Promise<void>;
  resetGame: () => void;
}

const MonopoliContext = createContext<MonopoliContextType | undefined>(undefined);

const LOCAL_STORAGE_ROOM_KEY = 'monopoli_bank_active_room_id';
const LOCAL_STORAGE_PAWN_KEY = 'monopoli_bank_pawn_color';

export const MonopoliProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'assets' | 'requests' | 'activity' | 'settings'>('home');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [members, setMembers] = useState<GameMember[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>(SIMULASI_INDONESIA_ASSETS);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fallback state for unconfigured Firebase environment
  const [localRoomId, setLocalRoomId] = useState<string | null>(() => {
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

  // Restore and subscribe to Firestore room when roomId and user are available
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !localRoomId) {
      return;
    }

    const gameDocRef = doc(db, 'games', localRoomId);

    // 1. Listen to Game Room doc
    const unsubGame = onSnapshot(gameDocRef, (snap) => {
      if (snap.exists()) {
        setRoom(snap.data() as GameRoom);
      } else {
        // Room no longer exists
        setRoom(null);
        localStorage.removeItem(LOCAL_STORAGE_ROOM_KEY);
      }
    }, (error) => {
      console.warn('Game listener error:', error);
    });

    // 2. Listen to Members subcollection
    const membersColRef = collection(db, 'games', localRoomId, 'members');
    const unsubMembers = onSnapshot(membersColRef, (snap) => {
      const memberList: GameMember[] = [];
      snap.forEach((docSnap) => {
        memberList.push(docSnap.data() as GameMember);
      });
      // Sort so host is first, then by joinedAt
      memberList.sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));
      setMembers(memberList);
    }, (error) => {
      console.warn('Members listener error:', error);
    });

    // 3. Listen to Assets subcollection
    const assetsColRef = collection(db, 'games', localRoomId, 'assets');
    const unsubAssets = onSnapshot(assetsColRef, (snap) => {
      if (!snap.empty) {
        const assetList: AssetItem[] = [];
        snap.forEach((docSnap) => {
          assetList.push(docSnap.data() as AssetItem);
        });
        setAssets(assetList);
      }
    }, (error) => {
      console.warn('Assets listener error:', error);
    });

    // 4. Listen to Transactions subcollection (Append-only Ledger)
    const txColRef = query(
      collection(db, 'games', localRoomId, 'transactions'),
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
      collection(db, 'games', localRoomId, 'requests'),
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
  }, [localRoomId]);

  // Determine current member representation
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

  // Create game room
  const createGame = async (
    hostName: string, 
    pawnColor: PawnColor, 
    initialBalance: number, 
    passStartReward: number, 
    maxPlayers: number,
    catalogPreset: 'simulation_indonesia' | 'custom_blank'
  ) => {
    if (isFirebaseConfigured && db) {
      // Ensure user is authenticated, or prompt login
      let user = currentUser;
      if (!user) {
        user = await signInWithGoogle();
        if (!user) return;
      }

      const { gameId } = await createGameInFirestore(
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
      setLocalRoomId(gameId);
      setActiveTab('home');
    } else {
      // Safe preview state when Firebase unconfigured
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
        initialBalanceDistributed: false,
      };

      setRoom(newRoom);
      setMembers([mockHost]);
      setAssets(SIMULASI_INDONESIA_ASSETS);
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

      const targetGame = await findGameByRoomCode(roomCode);
      if (!targetGame) {
        return false;
      }

      const success = await joinGameInFirestore(
        targetGame.id,
        {
          uid: user.uid,
          displayName: playerName || user.displayName || 'Pemain Baru',
          email: user.email || undefined,
          photoURL: user.photoURL || undefined,
        },
        pawnColor
      );

      if (success) {
        localStorage.setItem(LOCAL_STORAGE_ROOM_KEY, targetGame.id);
        localStorage.setItem(LOCAL_STORAGE_PAWN_KEY, pawnColor);
        setLocalRoomId(targetGame.id);
        setActiveTab('home');
        return true;
      }
      return false;
    } else {
      // Unconfigured fallback
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

  // Start game with ATOMIC distribution and ledger logging
  const startGame = async () => {
    if (!room || room.status !== 'lobby') return;

    if (isFirebaseConfigured && db) {
      try {
        await distributeInitialBalanceAtomic(room.id);
      } catch (err: any) {
        alert('Gagal mendistribusikan modal awal: ' + (err?.message || 'Error'));
      }
    } else {
      // Local preview distribution
      const initialAmount = room.settings.initialBalance;
      const timestamp = Date.now();
      const ledger: LedgerEntry[] = [];

      const updatedMembers = members.map((m, idx) => {
        ledger.push({
          id: `TX-INIT-${room.roomCode}-${idx + 1}`,
          gameId: room.id,
          timestamp,
          sourceId: 'BANK',
          sourceName: 'Bank Monopoli Sentral',
          targetId: m.uid,
          targetName: m.displayName,
          type: 'initial_capital',
          amount: initialAmount,
          status: 'settled',
          description: `Pembagian modal awal permainan (${m.displayName})`,
          referenceId: room.id,
        });

        return { ...m, balance: initialAmount };
      });

      setRoom(prev => prev ? {
        ...prev,
        status: 'active',
        startedAt: timestamp,
        initialBalanceDistributed: true,
      } : null);

      setMembers(updatedMembers);
      setTransactions(ledger);
      // NOTE: Removed automatic mock request per requirement #6
      setRequests([]);
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
      await submitRequestToFirestore(
        room.id,
        { uid: currentMember.uid, displayName: currentMember.displayName },
        type,
        title,
        detail,
        amount,
        members
      );
    } else {
      const newReq: ApprovalRequest = {
        id: `REQ-${Date.now()}`,
        gameId: room.id,
        requesterId: currentMember.uid,
        requesterName: currentMember.displayName,
        type,
        title,
        detail,
        amount,
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
      setRequests(prev => [newReq, ...prev]);
    }
  };

  // Cast consensus vote
  const castVote = async (requestId: string, decision: 'approved' | 'rejected') => {
    if (!currentMember || !room) return;

    if (isFirebaseConfigured && db) {
      await castVoteInFirestore(room.id, requestId, currentMember.uid, decision);
    } else {
      // In unconfigured mode, voting that alters balance is disabled per requirement #6
      alert('Operasi konsensus multi-perangkat memerlukan integrasi Cloud Firestore aktif.');
    }
  };

  const resetGame = () => {
    localStorage.removeItem(LOCAL_STORAGE_ROOM_KEY);
    setLocalRoomId(null);
    setRoom(null);
    setMembers([]);
    setAssets(SIMULASI_INDONESIA_ASSETS);
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
