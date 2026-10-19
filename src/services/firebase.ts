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
  GameMember,
  AssetItem,
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
import firebaseConfig from '../../firebase-applet-config.json';
import { getDocFromServer } from 'firebase/firestore';

export const isFirebaseConfigured = Boolean(
  firebaseConfig?.projectId && 
  firebaseConfig?.apiKey
);

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

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
 * Create Game Room on Cloud Firestore via trusted backend:
 * Atomic creation of room + host member + initial catalog
 */
export async function createGameViaBackend(
  hostUser: { uid: string; displayName: string; email?: string; photoURL?: string },
  pawnColor: PawnColor,
  settings: {
    initialBalance: number;
    passStartReward: number;
    maxPlayers: number;
    catalogPreset: 'custom_abcd' | 'simulation_indonesia_legacy';
  }
): Promise<{ gameId: string; roomCode: string }> {
  const token = await getAuthToken();

  const res = await fetch('/api/rooms/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      displayName: hostUser.displayName,
      pawnColor,
      initialBalance: settings.initialBalance,
      passStartReward: settings.passStartReward,
      maxPlayers: settings.maxPlayers,
      catalogPreset: settings.catalogPreset,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal membuat room permainan.');
  }

  return res.json();
}

/**
 * Host creates a property in catalog A, B, C, D
 */
export async function createAssetViaBackend(
  gameId: string,
  property: Partial<AssetItem>
): Promise<AssetItem> {
  const token = await getAuthToken();

  const res = await fetch('/api/assets/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gameId,
      property,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal menyimpan properti.');
  }

  const data = await res.json();
  return data.asset;
}

/**
 * Host updates a property in catalog
 */
export async function updateAssetViaBackend(
  gameId: string,
  assetId: string,
  property: Partial<AssetItem>
): Promise<AssetItem> {
  const token = await getAuthToken();

  const res = await fetch('/api/assets/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gameId,
      assetId,
      property,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal memperbarui properti.');
  }

  const data = await res.json();
  return data.asset;
}

/**
 * Host deletes a property from catalog
 */
export async function deleteAssetViaBackend(
  gameId: string,
  assetId: string
): Promise<void> {
  const token = await getAuthToken();

  const res = await fetch('/api/assets/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gameId,
      assetId,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal menghapus properti.');
  }
}

/**
 * Host confirms or unconfirms group A/B/C/D
 */
export async function confirmGroupViaBackend(
  gameId: string,
  groupId: 'A' | 'B' | 'C' | 'D',
  isConfirmed: boolean
): Promise<any> {
  const token = await getAuthToken();

  const res = await fetch('/api/rooms/confirm-group', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gameId,
      groupId,
      isConfirmed,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal mengubah status kelompok.');
  }

  return res.json();
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
