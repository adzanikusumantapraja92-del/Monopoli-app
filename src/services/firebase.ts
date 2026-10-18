import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  User,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  setDoc, 
  collection
} from 'firebase/firestore';
import { 
  GameRoom, 
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
 * Get JWT bearer token for backend server calls
 */
export async function getAuthToken(): Promise<string> {
  if (!auth?.currentUser) {
    throw new Error('Pengguna belum masuk dengan akun Google.');
  }
  return auth.currentUser.getIdToken();
}

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
 * Create Game Room on Cloud Firestore & initialize catalog
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

    // 2. Add Host to members subcollection (balance = 0 until atomic start by host)
    const hostMemberDoc = doc(db, 'games', gameId, 'members', hostUser.uid);
    await setDoc(hostMemberDoc, {
      uid: hostUser.uid,
      displayName: hostUser.displayName || 'Host',
      email: hostUser.email || '',
      avatarUrl: hostUser.photoURL || '',
      pawnColor,
      isHost: true,
      balance: 0,
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

export interface PublicRoomLookup {
  gameId: string;
  roomCode: string;
  status: string;
  maxPlayers: number;
  membersCount: number;
  catalogPreset?: string;
}

/**
 * Secure room lookup for prospective members:
 * Calls /api/rooms/lookup so unauthenticated/prospective members don't need direct read on the room
 */
export async function lookupRoomByCode(roomCode: string): Promise<PublicRoomLookup | null> {
  const res = await fetch('/api/rooms/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomCode }),
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal mencari room.');
  }

  return res.json();
}

/**
 * Join game room via trusted backend endpoint:
 * Atomically validates lobby status, capacity, and UID identity
 */
export async function joinGameViaBackend(
  gameId: string,
  displayName: string,
  pawnColor: PawnColor
): Promise<boolean> {
  const token = await getAuthToken();

  const res = await fetch('/api/rooms/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gameId,
      displayName,
      pawnColor,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal bergabung ke room.');
  }

  return true;
}

/**
 * Start game via trusted backend endpoint:
 * Atomically checks status, reads all members, credits starting balance,
 * and writes ledger records. Idempotent and rollback-safe.
 */
export async function distributeInitialBalanceViaBackend(gameId: string): Promise<void> {
  const token = await getAuthToken();

  const res = await fetch('/api/rooms/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ gameId }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal memulai permainan dan membagikan modal awal.');
  }
}

/**
 * Submit consensus request via trusted backend endpoint
 */
export async function submitRequestViaBackend(
  gameId: string,
  type: RequestType,
  title: string,
  detail: string,
  amount: number
): Promise<string> {
  const token = await getAuthToken();

  const res = await fetch('/api/requests/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gameId,
      type,
      title,
      detail,
      amount,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal mengajukan permintaan.');
  }

  const data = await res.json();
  return data.requestId;
}

/**
 * Cast consensus vote via trusted backend endpoint:
 * - Only UID owner can vote for their seat
 * - 1 rejection immediately rejects
 * - 100% consensus executes financial effect atomically before marking approved
 */
export async function castVoteViaBackend(
  gameId: string,
  requestId: string,
  decision: 'approved' | 'rejected'
): Promise<void> {
  const token = await getAuthToken();

  const res = await fetch('/api/requests/vote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gameId,
      requestId,
      decision,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal memproses suara.');
  }
}
