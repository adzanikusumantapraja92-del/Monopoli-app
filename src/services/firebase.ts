import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  limit, 
  onSnapshot, 
  runTransaction, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid,
      email: currentAuth?.currentUser?.email,
      emailVerified: currentAuth?.currentUser?.emailVerified,
      isAnonymous: currentAuth?.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Config resolution: environment variables
const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

export const isFirebaseConfigured = Boolean(
  envApiKey && 
  envProjectId && 
  envApiKey !== 'MY_FIREBASE_API_KEY' &&
  envProjectId !== 'MY_FIREBASE_PROJECT_ID'
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.firebasestorage.app`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
    dbInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    authInstance = getAuth(app);
  } catch (err) {
    console.warn('Firebase initialization error:', err);
  }
}

export const auth = authInstance;
export const db = dbInstance;

/**
 * Google Sign-In with popup
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase Auth belum dikonfigurasi.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

/**
 * Create Game Room on Cloud Firestore
 */
export async function createGameInFirestore(
  hostUser: { uid: string; displayName: string; email?: string; photoURL?: string },
  pawnColor: PawnColor,
  settings: {
    initialBalance: number;
    passStartReward: number;
    maxPlayers: number;
    catalogPreset: 'simulation_indonesia' | 'custom_blank';
  }
): Promise<{ gameId: string; roomCode: string }> {
  if (!db) {
    throw new Error('Firestore tidak aktif.');
  }

  const roomCode = generateRoomCode();
  const gameRef = doc(collection(db, 'games'));
  const gameId = gameRef.id;

  const newGame: Omit<GameRoom, 'id'> = {
    roomCode,
    hostUid: hostUser.uid,
    status: 'lobby',
    createdAt: Date.now(),
    settings: {
      ...settings,
      allowNegativeBalance: false,
    },
    initialBalanceDistributed: false,
  };

  try {
    // 1. Create Game document
    await setDoc(gameRef, {
      ...newGame,
      id: gameId,
      membersCount: 1,
    });

    // 2. Add Host to members subcollection
    const hostMemberDoc = doc(db, 'games', gameId, 'members', hostUser.uid);
    await setDoc(hostMemberDoc, {
      uid: hostUser.uid,
      displayName: hostUser.displayName || 'Host',
      email: hostUser.email || '',
      avatarUrl: hostUser.photoURL || '',
      pawnColor,
      isHost: true,
      balance: 0, // Not distributed until start
      isBankrupt: false,
      joinedAt: Date.now(),
      propertiesOwnedCount: 0,
    });

    // 3. Populate Asset Catalog subcollection
    const assetsToLoad = settings.catalogPreset === 'simulation_indonesia' 
      ? SIMULASI_INDONESIA_ASSETS 
      : [];

    for (const asset of assetsToLoad) {
      const assetDoc = doc(db, 'games', gameId, 'assets', asset.id);
      await setDoc(assetDoc, {
        ...asset,
        ownerId: null,
        isMortgaged: false,
        housesCount: 0,
        hotelsCount: 0,
      });
    }

    return { gameId, roomCode };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}`);
    throw error;
  }
}

/**
 * Find room by unique room code (case-insensitive)
 */
export async function findGameByRoomCode(roomCode: string): Promise<GameRoom | null> {
  if (!db) return null;

  try {
    const q = query(
      collection(db, 'games'),
      where('roomCode', '==', roomCode.trim().toUpperCase()),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docData = snap.docs[0].data() as GameRoom;
    return { ...docData, id: snap.docs[0].id };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'games');
    return null;
  }
}

/**
 * Join game room
 */
export async function joinGameInFirestore(
  gameId: string,
  user: { uid: string; displayName: string; email?: string; photoURL?: string },
  pawnColor: PawnColor
): Promise<boolean> {
  if (!db) return false;

  const gameRef = doc(db, 'games', gameId);
  const memberRef = doc(db, 'games', gameId, 'members', user.uid);

  try {
    const gameSnap = await getDoc(gameRef);
    if (!gameSnap.exists()) return false;
    const gameData = gameSnap.data() as GameRoom;

    // Check if already a member (session restore)
    const existingMember = await getDoc(memberRef);
    if (existingMember.exists()) {
      return true;
    }

    // Check if lobby is open
    if (gameData.status !== 'lobby') {
      throw new Error('Permainan sudah dimulai. Tidak dapat menambah pemain baru.');
    }

    // Get current members count
    const membersSnap = await getDocs(collection(db, 'games', gameId, 'members'));
    if (membersSnap.size >= gameData.settings.maxPlayers) {
      throw new Error('Room sudah penuh.');
    }

    // Register new member
    await setDoc(memberRef, {
      uid: user.uid,
      displayName: user.displayName || `Pemain ${membersSnap.size + 1}`,
      email: user.email || '',
      avatarUrl: user.photoURL || '',
      pawnColor,
      isHost: false,
      balance: 0,
      isBankrupt: false,
      joinedAt: Date.now(),
      propertiesOwnedCount: 0,
    });

    await updateDoc(gameRef, {
      membersCount: membersSnap.size + 1,
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}/members/${user.uid}`);
    return false;
  }
}

/**
 * Atomic Initial Balance Distribution via Firestore Transaction
 * Enforces requirement: Exactly once distribution + append-only ledger entries
 */
export async function distributeInitialBalanceAtomic(gameId: string): Promise<void> {
  if (!db) {
    throw new Error('Firestore tidak aktif.');
  }

  const gameRef = doc(db, 'games', gameId);
  const membersCol = collection(db, 'games', gameId, 'members');

  try {
    await runTransaction(db, async (tx) => {
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists()) {
        throw new Error('Room tidak ditemukan.');
      }

      const gameData = gameSnap.data() as GameRoom;
      if (gameData.initialBalanceDistributed) {
        throw new Error('Modal awal sudah pernah dibagikan! Tidak dapat menduplikasi.');
      }
      if (gameData.status !== 'lobby') {
        throw new Error('Status room tidak valid untuk pembagian modal awal.');
      }

      const initialAmount = gameData.settings.initialBalance;
      const membersSnap = await getDocs(membersCol);
      const timestamp = Date.now();

      // For each member: credit balance and write ledger entry
      membersSnap.forEach((memberDoc) => {
        const memberData = memberDoc.data() as GameMember;
        tx.update(memberDoc.ref, {
          balance: initialAmount,
        });

        const txRef = doc(db, 'games', gameId, 'transactions', `TX-INIT-${gameData.roomCode}-${memberData.uid}`);
        tx.set(txRef, {
          id: `TX-INIT-${gameData.roomCode}-${memberData.uid}`,
          gameId,
          timestamp,
          sourceId: 'BANK',
          sourceName: 'Bank Monopoli Sentral',
          targetId: memberData.uid,
          targetName: memberData.displayName,
          type: 'initial_capital',
          amount: initialAmount,
          status: 'settled',
          description: `Pembagian modal awal permainan (${memberData.displayName})`,
          referenceId: gameId,
        });
      });

      // Update game status to active
      tx.update(gameRef, {
        status: 'active',
        startedAt: timestamp,
        initialBalanceDistributed: true,
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}/transaction`);
    throw error;
  }
}

/**
 * Submit consensus request to Firestore
 */
export async function submitRequestToFirestore(
  gameId: string,
  requester: { uid: string; displayName: string },
  type: RequestType,
  title: string,
  detail: string,
  amount: number,
  members: GameMember[]
): Promise<string> {
  if (!db) throw new Error('Firestore tidak aktif.');

  const reqRef = doc(collection(db, 'games', gameId, 'requests'));
  const requestId = reqRef.id;

  const validators = members.reduce((acc, m) => {
    acc[m.uid] = {
      uid: m.uid,
      displayName: m.displayName,
      decision: m.uid === requester.uid ? 'approved' : 'pending',
      decidedAt: m.uid === requester.uid ? Date.now() : undefined,
    };
    return acc;
  }, {} as ApprovalRequest['validators']);

  try {
    await setDoc(reqRef, {
      id: requestId,
      gameId,
      requesterId: requester.uid,
      requesterName: requester.displayName,
      type,
      title,
      detail,
      amount,
      createdAt: Date.now(),
      status: 'pending',
      validators,
    });
    return requestId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `games/${gameId}/requests/${requestId}`);
    throw error;
  }
}

/**
 * Cast consensus vote on Firestore with atomic resolution
 */
export async function castVoteInFirestore(
  gameId: string,
  requestId: string,
  voterUid: string,
  decision: 'approved' | 'rejected'
): Promise<void> {
  if (!db) throw new Error('Firestore tidak aktif.');

  const reqRef = doc(db, 'games', gameId, 'requests', requestId);

  try {
    await runTransaction(db, async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists()) throw new Error('Permintaan tidak ditemukan.');
      const reqData = reqSnap.data() as ApprovalRequest;

      if (reqData.status !== 'pending') {
        throw new Error('Permintaan sudah selesai diproses.');
      }

      const updatedValidators = {
        ...reqData.validators,
        [voterUid]: {
          ...reqData.validators[voterUid],
          decision,
          decidedAt: Date.now(),
        },
      };

      if (decision === 'rejected') {
        tx.update(reqRef, {
          validators: updatedValidators,
          status: 'rejected',
          rejectionReason: `Ditolak oleh ${reqData.validators[voterUid]?.displayName || 'Validator'}`,
        });
        return;
      }

      const allApproved = Object.values(updatedValidators).every(v => v.decision === 'approved');
      if (allApproved) {
        tx.update(reqRef, {
          validators: updatedValidators,
          status: 'approved',
        });

        // Execute pass_start claim if approved
        if (reqData.type === 'claim_start') {
          const memberRef = doc(db, 'games', gameId, 'members', reqData.requesterId);
          const memberSnap = await tx.get(memberRef);
          if (memberSnap.exists()) {
            const currentBal = memberSnap.data().balance || 0;
            tx.update(memberRef, { balance: currentBal + reqData.amount });

            const txRef = doc(db, 'games', gameId, 'transactions', `TX-START-${Date.now()}`);
            tx.set(txRef, {
              id: txRef.id,
              gameId,
              timestamp: Date.now(),
              sourceId: 'BANK',
              sourceName: 'Bank Monopoli Sentral',
              targetId: reqData.requesterId,
              targetName: reqData.requesterName,
              type: 'pass_start',
              amount: reqData.amount,
              status: 'settled',
              description: `Hadiah melewati START (+${reqData.amount})`,
            });
          }
        }
      } else {
        tx.update(reqRef, {
          validators: updatedValidators,
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `games/${gameId}/requests/${requestId}`);
    throw error;
  }
}
