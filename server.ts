import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore, Transaction, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Firebase Admin SDK
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

import firebaseConfig from './firebase-applet-config.json';
import { PRESET_LEGACY_SIMULASI_ASSETS } from './src/data/mockIndonesianAssets.ts';
import { DEFAULT_GROUPS_CONFIG } from './src/types/monopoli.ts';

function generateRoomCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MNP-${num}`;
}

const projectId = firebaseConfig?.projectId || process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (projectId && projectId !== 'MY_FIREBASE_PROJECT_ID') {
  try {
    const adminApp: App = getApps().length === 0 ? initializeApp({ projectId }) : getApps()[0];
    adminDb = firebaseConfig?.firestoreDatabaseId ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId) : getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    console.log(`[Firebase Admin] Initialized for project: ${projectId}, database: ${firebaseConfig?.firestoreDatabaseId || '(default)'}`);
  } catch (err) {
    console.warn('[Firebase Admin] Initialization failed:', err);
  }
} else {
  console.log('[Firebase Admin] Project ID not configured. Running in unconfigured preview mode.');
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    displayName?: string;
  };
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token autentikasi tidak ditemukan.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // If in unconfigured mode, reject financial mutations
  if (!adminDb || !adminAuth) {
    res.status(503).json({ 
      error: 'Firebase belum dikonfigurasi. Tindakan finansial dinonaktifkan dalam mode preview tanpa backend.' 
    });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name,
    };
    next();
  } catch (error) {
    // If running in development emulator or testing token
    if (process.env.NODE_ENV !== 'production' && token.startsWith('dev_token_')) {
      const uid = token.replace('dev_token_', '');
      req.user = { uid, displayName: 'Dev Player' };
      next();
      return;
    }
    res.status(401).json({ error: 'Token autentikasi tidak valid atau sudah kedaluwarsa.' });
  }
}

// ==========================================
// API ROUTES
// ==========================================

/**
 * Comprehensive rollback helper to prevent orphaned rooms, members, assets, reservations, or idempotency keys.
 * ONLY deletes failed initialization attempts; aborts if room is already ready or in use.
 */
async function cleanupOrphanedGame(gameId: string, roomCode?: string, hostUid?: string, idempotencyKey?: string) {
  if (!adminDb || !gameId) return;
  try {
    const gameRef = adminDb.collection('games').doc(gameId);
    const gameSnap = await gameRef.get();

    // 1. SAFETY GUARD: NEVER delete a room that was successfully initialized or is already in use
    if (gameSnap.exists) {
      const gData = gameSnap.data();
      if (gData?.initStatus === 'ready' || gData?.status === 'active' || gData?.status === 'finished') {
        console.warn(`Safety guard: cleanupOrphanedGame aborted. Room ${gameId} is ready/active (initStatus: ${gData?.initStatus}).`);
        return;
      }
    }

    // 2. Mark initStatus as failed first so concurrent checks know it was terminated
    try {
      await gameRef.update({ initStatus: 'failed' });
    } catch {
      // ignore update error if doc missing
    }

    // 3. Delete all assets in subcollection
    const assetsSnap = await gameRef.collection('assets').get();
    const batch = adminDb.batch();
    assetsSnap.forEach((docSnap) => batch.delete(docSnap.ref));

    // 4. Delete all members in subcollection
    const membersSnap = await gameRef.collection('members').get();
    membersSnap.forEach((docSnap) => batch.delete(docSnap.ref));

    // 5. Delete room document
    batch.delete(gameRef);

    // 6. Delete room code reservation ONLY if it belongs to this specific failed gameId
    if (roomCode) {
      const codeRef = adminDb.collection('room_codes').doc(roomCode);
      const codeSnap = await codeRef.get();
      if (codeSnap.exists && codeSnap.data()?.gameId === gameId) {
        batch.delete(codeRef);
      }
    }

    // 7. Delete idempotency record ONLY if it belongs to this specific failed gameId
    if (idempotencyKey && hostUid) {
      const idempRef = adminDb.collection('room_idempotency').doc(`${hostUid}_${idempotencyKey}`);
      const idempSnap = await idempRef.get();
      if (idempSnap.exists && idempSnap.data()?.gameId === gameId) {
        batch.delete(idempRef);
      }
    }

    await batch.commit();
  } catch (cleanErr) {
    console.error('Error in cleanupOrphanedGame:', cleanErr);
  }
}

/**
 * 0. POST /api/rooms/create
 * Trusted backend endpoint for atomic room and host member creation
 */
app.post('/api/rooms/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (!adminDb) {
    res.status(503).json({ error: 'Backend Firebase belum aktif. Mode preview tanpa server.' });
    return;
  }

  const { 
    displayName, 
    pawnColor = 'red', 
    initialBalance = 15000000, 
    passStartReward = 2000000, 
    maxPlayers = 4, 
    catalogPreset = 'custom_abcd',
    idempotencyKey 
  } = req.body;

  if (!pawnColor) {
    res.status(400).json({ error: 'Warna pion wajib dipilih.' });
    return;
  }

  // Sanitize idempotency key if provided
  const cleanIdempKey = typeof idempotencyKey === 'string' && idempotencyKey.trim().length > 0
    ? idempotencyKey.trim().slice(0, 64)
    : null;
  const idempDocRef = cleanIdempKey 
    ? adminDb.collection('room_idempotency').doc(`${user.uid}_${cleanIdempKey}`)
    : null;

  try {
    // 1. Early check for idempotency record
    if (idempDocRef) {
      const existingIdemp = await idempDocRef.get();
      if (existingIdemp.exists) {
        const idData = existingIdemp.data()!;
        if (idData.initStatus === 'ready') {
          res.json({ success: true, gameId: idData.gameId, roomCode: idData.roomCode, idempotent: true });
          return;
        } else if (idData.initStatus === 'initializing') {
          // Poll for completion (up to 8 seconds) so parallel requests / retries don't receive an incomplete room
          let ready = false;
          for (let p = 0; p < 16; p++) {
            await new Promise((r) => setTimeout(r, 500));
            const gSnap = await adminDb.collection('games').doc(idData.gameId).get();
            if (gSnap.exists) {
              const gData = gSnap.data();
              if (gData?.initStatus === 'ready') {
                ready = true;
                break;
              } else if (gData?.initStatus === 'failed') {
                throw new Error('Inisialisasi room sebelumnya gagal. Silakan coba lagi.');
              }
            } else {
              break;
            }
          }
          if (ready) {
            res.json({ success: true, gameId: idData.gameId, roomCode: idData.roomCode, idempotent: true });
            return;
          }
          res.status(409).json({ error: 'Room sedang dalam proses inisialisasi katalog. Silakan coba sesaat lagi.' });
          return;
        }
        // If initStatus === 'failed', proceed to allow a new attempt
      }
    }

    let createdGameId = '';
    let reservedRoomCode = '';
    let reservationSuccess = false;

    // 2. Atomic reservation loop for unique room code with collision prevention
    for (let attempts = 0; attempts < 10; attempts++) {
      const candidateCode = generateRoomCode();
      const codeRef = adminDb.collection('room_codes').doc(candidateCode);
      const gameRef = adminDb.collection('games').doc();
      const gameId = gameRef.id;
      const hostMemberRef = gameRef.collection('members').doc(user.uid);

      try {
        await adminDb.runTransaction(async (tx: Transaction) => {
          // 1. ALL READS FIRST
          if (idempDocRef) {
            const idempSnap = await tx.get(idempDocRef);
            if (idempSnap.exists) {
              const d = idempSnap.data()!;
              if (d.initStatus === 'ready') {
                createdGameId = d.gameId;
                reservedRoomCode = d.roomCode;
                return;
              } else if (d.initStatus === 'initializing') {
                throw new Error('PARALLEL_INITIALIZATION');
              }
            }
          }

          const codeSnap = await tx.get(codeRef);
          if (codeSnap.exists) {
            throw new Error('CODE_COLLISION');
          }

          const hostSnap = await tx.get(hostMemberRef);
          if (hostSnap.exists) {
            throw new Error('Host sudah terdaftar dalam sesi ini.');
          }

          // 2. ALL WRITES AFTER READS
          // Reserve the unique room code atomically with initStatus: 'initializing'
          tx.set(codeRef, {
            roomCode: candidateCode,
            gameId,
            hostUid: user.uid,
            initStatus: 'initializing',
            createdAt: Date.now(),
          });

          if (idempDocRef) {
            tx.set(idempDocRef, {
              gameId,
              roomCode: candidateCode,
              hostUid: user.uid,
              initStatus: 'initializing',
              createdAt: Date.now(),
            });
          }

          tx.set(gameRef, {
            id: gameId,
            roomCode: candidateCode,
            hostUid: user.uid,
            status: 'lobby',
            initStatus: 'initializing',
            createdAt: Date.now(),
            settings: {
              initialBalance: Math.max(0, Math.round(Number(initialBalance) || 15000000)),
              passStartReward: Math.max(0, Math.round(Number(passStartReward) || 2000000)),
              maxPlayers: Math.min(8, Math.max(2, Math.round(Number(maxPlayers) || 4))),
              catalogPreset: catalogPreset || 'custom_abcd',
              allowNegativeBalance: false,
            },
            groupsConfig: {
              A: { id: 'A', label: 'Kelompok A', rentMultiplier: 2, isConfirmed: false },
              B: { id: 'B', label: 'Kelompok B', rentMultiplier: 2, isConfirmed: false },
              C: { id: 'C', label: 'Kelompok C', rentMultiplier: 2, isConfirmed: false },
              D: { id: 'D', label: 'Kelompok D', rentMultiplier: 2, isConfirmed: false },
            },
            initialBalanceDistributed: false,
            membersCount: 1,
          });

          tx.set(hostMemberRef, {
            uid: user.uid,
            displayName: displayName || user.displayName || 'Host Permainan',
            email: user.email || '',
            avatarUrl: '',
            pawnColor,
            isHost: true,
            balance: 0,
            isBankrupt: false,
            joinedAt: Date.now(),
            propertiesOwnedCount: 0,
          });

          createdGameId = gameId;
          reservedRoomCode = candidateCode;
        });

        reservationSuccess = true;
        break;
      } catch (txErr: any) {
        if (txErr.message === 'CODE_COLLISION') {
          continue;
        }
        if (txErr.message === 'PARALLEL_INITIALIZATION') {
          res.status(409).json({ error: 'Room sedang dalam proses inisialisasi. Silakan tunggu sesaat.' });
          return;
        }
        throw txErr;
      }
    }

    if (!reservationSuccess || !createdGameId || !reservedRoomCode) {
      throw new Error('Gagal menghasilkan kode room unik. Silakan coba lagi.');
    }

    // 3. Populate legacy simulation preset if explicitly chosen.
    // If populating fails, delete all associated docs so no partial/orphaned game room is left active.
    if (catalogPreset === 'simulation_indonesia_legacy') {
      const gameRef = adminDb.collection('games').doc(createdGameId);
      try {
        const batch = adminDb.batch();
        for (const asset of PRESET_LEGACY_SIMULASI_ASSETS) {
          const assetRef = gameRef.collection('assets').doc(asset.id);
          batch.set(assetRef, {
            ...asset,
            ownerId: null,
            isMortgaged: false,
            housesCount: 0,
            hotelsCount: 0,
            createdAt: Date.now(),
          });
        }
        await batch.commit();
      } catch (legacyErr: any) {
        console.error('Failed to populate legacy catalog, cleaning up orphaned game:', legacyErr);
        await cleanupOrphanedGame(createdGameId, reservedRoomCode, user.uid, cleanIdempKey || undefined);
        throw new Error('Gagal menginisialisasi katalog preset legacy: ' + (legacyErr.message || 'Error'));
      }
    }

    // 4. Mark room and records as READY so parallel requests can now safely consume it
    const readyUpdates = { initStatus: 'ready' };
    const finalizeBatch = adminDb.batch();
    finalizeBatch.update(adminDb.collection('games').doc(createdGameId), readyUpdates);
    finalizeBatch.update(adminDb.collection('room_codes').doc(reservedRoomCode), readyUpdates);
    if (idempDocRef) {
      finalizeBatch.update(idempDocRef, readyUpdates);
    }
    await finalizeBatch.commit();

    res.json({ success: true, gameId: createdGameId, roomCode: reservedRoomCode });
  } catch (err: any) {
    console.error('Create room error:', err);
    res.status(400).json({ error: err.message || 'Gagal membuat room permainan.' });
  }
});

/**
 * 1. POST /api/rooms/lookup
 * Secure room lookup for prospective members: only returns public metadata
 * Does NOT leak players' emails, balances, or private room state
 */
app.post('/api/rooms/lookup', async (req: Request, res: Response) => {
  const { roomCode } = req.body;
  if (!roomCode || typeof roomCode !== 'string') {
    res.status(400).json({ error: 'Kode room harus diisi.' });
    return;
  }

  if (!adminDb) {
    res.status(503).json({ 
      error: 'Backend Firebase belum aktif. Mode preview tanpa server.' 
    });
    return;
  }

  try {
    const q = await adminDb
      .collection('games')
      .where('roomCode', '==', roomCode.trim().toUpperCase())
      .limit(1)
      .get();

    if (q.empty) {
      res.status(404).json({ error: 'Room dengan kode tersebut tidak ditemukan.' });
      return;
    }

    const docSnap = q.docs[0];
    const data = docSnap.data();

    if (data.initStatus === 'initializing') {
      res.status(409).json({ error: 'Room sedang dalam proses inisialisasi katalog. Silakan coba sesaat lagi.' });
      return;
    }
    if (data.initStatus === 'failed') {
      res.status(404).json({ error: 'Room tidak valid atau gagal dibuat.' });
      return;
    }

    // Return strictly sanitized public room info
    res.json({
      gameId: docSnap.id,
      roomCode: data.roomCode,
      status: data.status,
      initStatus: data.initStatus || 'ready',
      maxPlayers: data.settings?.maxPlayers || 4,
      membersCount: data.membersCount || 1,
      catalogPreset: data.settings?.catalogPreset,
    });
  } catch (err: any) {
    console.error('Room lookup error:', err);
    res.status(500).json({ error: 'Gagal melakukan lookup room.' });
  }
});

/**
 * 2. POST /api/rooms/join
 * Atomic validation of lobby status, capacity, and UID identity
 */
app.post('/api/rooms/join', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { gameId, displayName, pawnColor, avatarUrl } = req.body;
  const user = req.user!;

  if (!gameId || !pawnColor) {
    res.status(400).json({ error: 'gameId dan pawnColor wajib diisi.' });
    return;
  }

  if (!adminDb) {
    res.status(503).json({ error: 'Backend Firebase belum aktif.' });
    return;
  }

  const gameRef = adminDb.collection('games').doc(gameId);
  const memberRef = gameRef.collection('members').doc(user.uid);

  try {
    const result = await adminDb.runTransaction(async (tx: Transaction) => {
      // 1. ALL READS FIRST (Strict Firestore atomic requirement)
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists) {
        throw new Error('Room tidak ditemukan.');
      }

      const gameData = gameSnap.data()!;
      if (gameData.initStatus === 'initializing') {
        throw new Error('Room sedang dalam proses inisialisasi katalog. Silakan tunggu sesaat lagi.');
      }
      if (gameData.initStatus === 'failed') {
        throw new Error('Room ini gagal diinisialisasi dan tidak dapat dimasuki.');
      }

      const existingMemberSnap = await tx.get(memberRef);
      
      // If already a member, return success (session restoration)
      if (existingMemberSnap.exists) {
        return { restored: true };
      }

      // Check lobby state
      if (gameData.status !== 'lobby') {
        throw new Error('Permainan sudah dimulai. Tidak dapat menambah pemain baru.');
      }

      // Read current members to check capacity and pawn color conflict
      const membersSnap = await tx.get(gameRef.collection('members'));
      const currentCount = membersSnap.size;
      const maxPlayers = gameData.settings?.maxPlayers || 4;

      if (currentCount >= maxPlayers) {
        throw new Error('Kapasitas room sudah penuh.');
      }

      const isPawnTaken = membersSnap.docs.some((doc: QueryDocumentSnapshot) => doc.data().pawnColor === pawnColor);
      if (isPawnTaken) {
        throw new Error('Warna pion ini sudah dipilih oleh pemain lain.');
      }

      // 2. ALL WRITES AFTER READS
      tx.set(memberRef, {
        uid: user.uid,
        displayName: displayName || user.displayName || `Pemain ${currentCount + 1}`,
        email: user.email || '',
        avatarUrl: avatarUrl || '',
        pawnColor,
        isHost: false,
        balance: 0, // Balance is 0 until atomic start by host
        isBankrupt: false,
        joinedAt: Date.now(),
        propertiesOwnedCount: 0,
      });

      tx.update(gameRef, {
        membersCount: currentCount + 1,
      });

      return { joined: true };
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Join room error:', err);
    res.status(400).json({ error: err.message || 'Gagal bergabung ke room.' });
  }
});

/**
 * 3. POST /api/rooms/start
 * Host initiates game. Entirely executed on trusted backend!
 * Atomically checks status, reads all members, credits starting balance,
 * creates ledger records, and activates room. Idempotent & rollback-safe.
 */
app.post('/api/rooms/start', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { gameId } = req.body;
  const user = req.user!;

  if (!gameId) {
    res.status(400).json({ error: 'gameId wajib diisi.' });
    return;
  }

  if (!adminDb) {
    res.status(503).json({ error: 'Backend Firebase belum aktif.' });
    return;
  }

  const gameRef = adminDb.collection('games').doc(gameId);
  const membersColRef = gameRef.collection('members');

  try {
    await adminDb.runTransaction(async (tx: Transaction) => {
      // 1. ALL READS FIRST
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists) {
        throw new Error('Room tidak ditemukan.');
      }

      const gameData = gameSnap.data()!;

      // Verify caller is the host
      if (gameData.hostUid !== user.uid) {
        throw new Error('Hanya Host yang memiliki otoritas untuk memulai permainan.');
      }

      // Idempotency: verify initial balance has NOT been distributed yet
      if (gameData.initialBalanceDistributed) {
        throw new Error('Modal awal sudah pernah dibagikan. Transaksi tidak dapat diulang.');
      }

      if (gameData.status !== 'lobby') {
        throw new Error('Status room tidak valid untuk pembagian modal awal.');
      }

      const membersSnap = await tx.get(membersColRef);
      if (membersSnap.size < 2) {
        throw new Error('Minimal 2 pemain diperlukan untuk memulai permainan.');
      }

      const initialBalance = gameData.settings?.initialBalance || 15000000;
      const timestamp = Date.now();
      const roomCode = gameData.roomCode;

      // 2. ALL WRITES AFTER READS
      membersSnap.forEach((memberDoc: QueryDocumentSnapshot) => {
        const memberData = memberDoc.data();
        tx.update(memberDoc.ref, {
          balance: initialBalance,
        });

        const txRef = gameRef.collection('transactions').doc(`TX-INIT-${roomCode}-${memberData.uid}`);
        tx.set(txRef, {
          id: `TX-INIT-${roomCode}-${memberData.uid}`,
          gameId,
          timestamp,
          sourceId: 'BANK',
          sourceName: 'Bank Monopoli Sentral',
          targetId: memberData.uid,
          targetName: memberData.displayName,
          type: 'initial_capital',
          amount: initialBalance,
          status: 'settled',
          description: `Pembagian modal awal permainan (${memberData.displayName})`,
          referenceId: gameId,
        });
      });

      // Update game status
      tx.update(gameRef, {
        status: 'active',
        startedAt: timestamp,
        initialBalanceDistributed: true,
      });
    });

    res.json({ success: true, message: 'Permainan berhasil dimulai dan modal awal dibagikan.' });
  } catch (err: any) {
    console.error('Start game error:', err);
    res.status(400).json({ error: err.message || 'Gagal memulai permainan.' });
  }
});

/**
 * Helper to validate property nominals
 * - Distinguishes undefined/empty string/null from valid 0 (Rp0 is permitted if explicitly provided as a non-negative number)
 * - In 'ready' status, all nominal fields are required to be non-negative integers
 * - In 'draft' status, fields may be omitted/null, but if provided must be non-negative integers
 */
function parseNominalField(value: any, fieldLabel: string, isRequired: boolean): number | null {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    if (isRequired) {
      throw new Error(`Kolom ${fieldLabel} wajib diisi dengan angka nonnegatif untuk status Siap (Ready).`);
    }
    return null;
  }

  const num = Number(value);
  if (isNaN(num) || !isFinite(num) || num < 0 || !Number.isInteger(num)) {
    throw new Error(`Kolom ${fieldLabel} harus berupa bilangan bulat (integer) nonnegatif.`);
  }

  return num;
}

function validateAndFormatProperty(raw: any): {
  name: string;
  groupId: 'A' | 'B' | 'C' | 'D';
  boardPosition: number | null;
  category: 'property';
  buyPrice: number | null;
  mortgageValue: number | null;
  rentBase: number | null;
  rentOneHouse: number | null;
  rentTwoHouses: number | null;
  rentThreeHouses: number | null;
  rentFourHouses: number | null;
  rentHotel: number | null;
  houseCost: number | null;
  hotelCost: number | null;
  status: 'ready' | 'draft';
} {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) {
    throw new Error('Nama properti wajib diisi.');
  }

  const groupId = raw.groupId;
  if (!['A', 'B', 'C', 'D'].includes(groupId)) {
    throw new Error('Kelompok properti harus A, B, C, atau D.');
  }

  const status: 'ready' | 'draft' = raw.status === 'ready' ? 'ready' : 'draft';
  const isRequiredForReady = status === 'ready';

  let boardPosition: number | null = null;
  if (raw.boardPosition !== undefined && raw.boardPosition !== null && raw.boardPosition !== '') {
    const pos = Number(raw.boardPosition);
    if (isNaN(pos) || pos < 1 || !Number.isInteger(pos)) {
      throw new Error('Posisi petak harus berupa integer positif.');
    }
    boardPosition = pos;
  }

  const buyPrice = parseNominalField(raw.buyPrice, 'Harga Beli Tanah', isRequiredForReady);
  const mortgageValue = parseNominalField(raw.mortgageValue, 'Nilai Agunan (Hipotek)', isRequiredForReady);
  const rentBase = parseNominalField(raw.rentBase, 'Sewa Tanah Kosong', isRequiredForReady);
  const rentOneHouse = parseNominalField(raw.rentOneHouse, 'Sewa 1 Rumah', isRequiredForReady);
  const rentTwoHouses = parseNominalField(raw.rentTwoHouses, 'Sewa 2 Rumah', isRequiredForReady);
  const rentThreeHouses = parseNominalField(raw.rentThreeHouses, 'Sewa 3 Rumah', isRequiredForReady);
  const rentFourHouses = parseNominalField(raw.rentFourHouses, 'Sewa 4 Rumah', isRequiredForReady);
  const rentHotel = parseNominalField(raw.rentHotel, 'Sewa Hotel', isRequiredForReady);
  const houseCost = parseNominalField(raw.houseCost, 'IMB per Rumah', isRequiredForReady);
  const hotelCost = parseNominalField(raw.hotelCost, 'IMB Hotel', isRequiredForReady);

  return {
    name,
    groupId,
    boardPosition,
    category: 'property',
    buyPrice,
    mortgageValue,
    rentBase,
    rentOneHouse,
    rentTwoHouses,
    rentThreeHouses,
    rentFourHouses,
    rentHotel,
    houseCost,
    hotelCost,
    status,
  };
}

/**
 * 3a. POST /api/assets/create
 * Host creates property in catalog A, B, C, D during lobby
 */
app.post('/api/assets/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { gameId, property } = req.body;
  const user = req.user!;

  if (!gameId || !property) {
    res.status(400).json({ error: 'Data properti dan gameId wajib diisi.' });
    return;
  }

  if (!adminDb) {
    res.status(503).json({ error: 'Backend Firebase belum aktif.' });
    return;
  }

  try {
    const formatted = validateAndFormatProperty(property);
    const gameRef = adminDb.collection('games').doc(gameId);

    const assetId = `prop-${formatted.groupId.toLowerCase()}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const assetRef = gameRef.collection('assets').doc(assetId);

    const newAsset = {
      id: assetId,
      ...formatted,
      ownerId: null,
      isMortgaged: false,
      housesCount: 0,
      hotelsCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await adminDb.runTransaction(async (tx: Transaction) => {
      // 1. ALL READS FIRST
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists) {
        throw new Error('Room tidak ditemukan.');
      }
      const gameData = gameSnap.data()!;
      if (gameData.hostUid !== user.uid) {
        throw new Error('Hanya Host yang dapat mengelola katalog properti.');
      }
      if (gameData.status !== 'lobby') {
        throw new Error('Katalog hanya dapat diubah saat room berstatus Lobby.');
      }

      // 2. UNCONFIRM AFFECTED GROUP
      const currentGroups = gameData.groupsConfig || {
        A: { id: 'A', label: 'Kelompok A', rentMultiplier: 2, isConfirmed: false },
        B: { id: 'B', label: 'Kelompok B', rentMultiplier: 2, isConfirmed: false },
        C: { id: 'C', label: 'Kelompok C', rentMultiplier: 2, isConfirmed: false },
        D: { id: 'D', label: 'Kelompok D', rentMultiplier: 2, isConfirmed: false },
      };

      if (currentGroups[formatted.groupId]?.isConfirmed) {
        currentGroups[formatted.groupId] = {
          ...currentGroups[formatted.groupId],
          isConfirmed: false,
        };
        tx.update(gameRef, { groupsConfig: currentGroups });
      }

      // 3. SET NEW ASSET
      tx.set(assetRef, newAsset);
    });

    res.json({ success: true, asset: newAsset });
  } catch (err: any) {
    console.error('Create asset error:', err);
    res.status(400).json({ error: err.message || 'Gagal menyimpan properti.' });
  }
});

/**
 * 3b. POST /api/assets/update
 * Host edits property in catalog before game starts.
 * Unconfirms both previous and new group if groupId was changed.
 */
app.post('/api/assets/update', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { gameId, assetId, property } = req.body;
  const user = req.user!;

  if (!gameId || !assetId || !property) {
    res.status(400).json({ error: 'Parameter tidak lengkap.' });
    return;
  }

  if (!adminDb) {
    res.status(503).json({ error: 'Backend Firebase belum aktif.' });
    return;
  }

  try {
    const gameRef = adminDb.collection('games').doc(gameId);
    const assetRef = gameRef.collection('assets').doc(assetId);
    let resultAsset: any = null;

    await adminDb.runTransaction(async (tx: Transaction) => {
      // 1. ALL READS FIRST
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists) {
        throw new Error('Room tidak ditemukan.');
      }
      const gameData = gameSnap.data()!;
      if (gameData.hostUid !== user.uid) {
        throw new Error('Hanya Host yang dapat mengedit properti.');
      }
      if (gameData.status !== 'lobby') {
        throw new Error('Katalog tidak dapat diubah setelah permainan dimulai.');
      }

      const assetSnap = await tx.get(assetRef);
      if (!assetSnap.exists) {
        throw new Error('Properti tidak ditemukan.');
      }
      const existingAsset = assetSnap.data()!;
      if (existingAsset.ownerId) {
        throw new Error('Properti yang sudah dimiliki pemain tidak dapat diedit.');
      }

      // Merge omitted fields so valid saved nominals are preserved
      const mergedInput = {
        name: property.name !== undefined ? property.name : existingAsset.name,
        groupId: property.groupId !== undefined ? property.groupId : existingAsset.groupId,
        boardPosition: property.boardPosition !== undefined ? property.boardPosition : existingAsset.boardPosition,
        buyPrice: property.buyPrice !== undefined ? property.buyPrice : existingAsset.buyPrice,
        mortgageValue: property.mortgageValue !== undefined ? property.mortgageValue : existingAsset.mortgageValue,
        rentBase: property.rentBase !== undefined ? property.rentBase : existingAsset.rentBase,
        rentOneHouse: property.rentOneHouse !== undefined ? property.rentOneHouse : existingAsset.rentOneHouse,
        rentTwoHouses: property.rentTwoHouses !== undefined ? property.rentTwoHouses : existingAsset.rentTwoHouses,
        rentThreeHouses: property.rentThreeHouses !== undefined ? property.rentThreeHouses : existingAsset.rentThreeHouses,
        rentFourHouses: property.rentFourHouses !== undefined ? property.rentFourHouses : existingAsset.rentFourHouses,
        rentHotel: property.rentHotel !== undefined ? property.rentHotel : existingAsset.rentHotel,
        houseCost: property.houseCost !== undefined ? property.houseCost : existingAsset.houseCost,
        hotelCost: property.hotelCost !== undefined ? property.hotelCost : existingAsset.hotelCost,
        status: property.status !== undefined ? property.status : existingAsset.status,
      };

      const formatted = validateAndFormatProperty(mergedInput);
      const updatedData = {
        ...formatted,
        updatedAt: Date.now(),
      };

      const oldGroupId: 'A' | 'B' | 'C' | 'D' = existingAsset.groupId || 'A';
      const newGroupId = formatted.groupId;

      // 2. UNCONFIRM AFFECTED GROUPS (both old and new group if moved)
      const currentGroups = gameData.groupsConfig || {
        A: { id: 'A', label: 'Kelompok A', rentMultiplier: 2, isConfirmed: false },
        B: { id: 'B', label: 'Kelompok B', rentMultiplier: 2, isConfirmed: false },
        C: { id: 'C', label: 'Kelompok C', rentMultiplier: 2, isConfirmed: false },
        D: { id: 'D', label: 'Kelompok D', rentMultiplier: 2, isConfirmed: false },
      };

      let groupsChanged = false;
      if (currentGroups[oldGroupId]?.isConfirmed) {
        currentGroups[oldGroupId] = { ...currentGroups[oldGroupId], isConfirmed: false };
        groupsChanged = true;
      }
      if (oldGroupId !== newGroupId && currentGroups[newGroupId]?.isConfirmed) {
        currentGroups[newGroupId] = { ...currentGroups[newGroupId], isConfirmed: false };
        groupsChanged = true;
      }

      if (groupsChanged) {
        tx.update(gameRef, { groupsConfig: currentGroups });
      }

      // 3. UPDATE ASSET
      tx.update(assetRef, updatedData);
      resultAsset = { id: assetId, ...updatedData };
    });

    res.json({ success: true, asset: resultAsset });
  } catch (err: any) {
    console.error('Update asset error:', err);
    res.status(400).json({ error: err.message || 'Gagal memperbarui properti.' });
  }
});

/**
 * 3c. POST /api/assets/delete
 * Host deletes property from catalog before game starts.
 * Unconfirms the group of the deleted asset.
 */
app.post('/api/assets/delete', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { gameId, assetId } = req.body;
  const user = req.user!;

  if (!gameId || !assetId) {
    res.status(400).json({ error: 'gameId dan assetId wajib diisi.' });
    return;
  }

  if (!adminDb) {
    res.status(503).json({ error: 'Backend Firebase belum aktif.' });
    return;
  }

  const gameRef = adminDb.collection('games').doc(gameId);
  const assetRef = gameRef.collection('assets').doc(assetId);

  try {
    await adminDb.runTransaction(async (tx: Transaction) => {
      // 1. ALL READS FIRST
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists) {
        throw new Error('Room tidak ditemukan.');
      }
      const gameData = gameSnap.data()!;
      if (gameData.hostUid !== user.uid) {
        throw new Error('Hanya Host yang dapat menghapus properti.');
      }
      if (gameData.status !== 'lobby') {
        throw new Error('Katalog tidak dapat diubah setelah permainan dimulai.');
      }

      const assetSnap = await tx.get(assetRef);
      if (!assetSnap.exists) {
        throw new Error('Properti tidak ditemukan.');
      }
      const assetData = assetSnap.data()!;
      if (assetData.ownerId) {
        throw new Error('Properti yang sudah dimiliki pemain tidak dapat dihapus.');
      }

      const targetGroupId: 'A' | 'B' | 'C' | 'D' = assetData.groupId || 'A';

      // 2. UNCONFIRM AFFECTED GROUP
      const currentGroups = gameData.groupsConfig || {
        A: { id: 'A', label: 'Kelompok A', rentMultiplier: 2, isConfirmed: false },
        B: { id: 'B', label: 'Kelompok B', rentMultiplier: 2, isConfirmed: false },
        C: { id: 'C', label: 'Kelompok C', rentMultiplier: 2, isConfirmed: false },
        D: { id: 'D', label: 'Kelompok D', rentMultiplier: 2, isConfirmed: false },
      };

      if (currentGroups[targetGroupId]?.isConfirmed) {
        currentGroups[targetGroupId] = { ...currentGroups[targetGroupId], isConfirmed: false };
        tx.update(gameRef, { groupsConfig: currentGroups });
      }

      // 3. DELETE ASSET
      tx.delete(assetRef);
    });

    res.json({ success: true, message: 'Properti berhasil dihapus dan status konfirmasi kelompok disinkronkan.' });
  } catch (err: any) {
    console.error('Delete asset error:', err);
    res.status(400).json({ error: err.message || 'Gagal menghapus properti.' });
  }
});

/**
 * 3d. POST /api/rooms/confirm-group
 * Host confirms or unconfirms group A/B/C/D completeness.
 * Strictly prevents confirmation if the group has 0 properties or has any draft properties.
 */
app.post('/api/rooms/confirm-group', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { gameId, groupId, isConfirmed } = req.body;
  const user = req.user!;

  if (!gameId || !['A', 'B', 'C', 'D'].includes(groupId)) {
    res.status(400).json({ error: 'gameId dan groupId (A/B/C/D) wajib diisi.' });
    return;
  }

  if (!adminDb) {
    res.status(503).json({ error: 'Backend Firebase belum aktif.' });
    return;
  }

  const gameRef = adminDb.collection('games').doc(gameId);

  try {
    let finalGroupsConfig: any = null;

    await adminDb.runTransaction(async (tx: Transaction) => {
      // 1. ALL READS FIRST (Strict Firestore atomic requirement)
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists) {
        throw new Error('Room tidak ditemukan.');
      }
      const gameData = gameSnap.data()!;
      if (gameData.hostUid !== user.uid) {
        throw new Error('Hanya Host yang dapat mengonfirmasi kelengkapan kelompok.');
      }
      if (gameData.status !== 'lobby') {
        throw new Error('Kelompok tidak dapat diubah setelah permainan dimulai.');
      }

      const wantToConfirm = Boolean(isConfirmed);

      if (wantToConfirm) {
        // Query assets in this group inside transaction
        const assetsQuery = gameRef.collection('assets').where('groupId', '==', groupId);
        const assetsSnap = await tx.get(assetsQuery);

        if (assetsSnap.empty) {
          throw new Error(`Kelompok ${groupId} tidak dapat dikonfirmasi karena belum memiliki properti sama sekali. Tambahkan minimal 1 properti.`);
        }

        const draftAssets: string[] = [];
        assetsSnap.forEach((docSnap) => {
          const item = docSnap.data();
          if (item.status === 'draft') {
            draftAssets.push(item.name || docSnap.id);
          }
        });

        if (draftAssets.length > 0) {
          throw new Error(
            `Kelompok ${groupId} belum dapat dikonfirmasi karena masih memiliki ${draftAssets.length} properti berstatus draft: (${draftAssets.slice(0, 3).join(', ')}${draftAssets.length > 3 ? '...' : ''}). Selesaikan kelengkapan data properti menjadi 'Siap' terlebih dahulu.`
          );
        }
      }

      // 2. ALL WRITES AFTER READS
      const currentGroups = gameData.groupsConfig || {
        A: { id: 'A', label: 'Kelompok A', rentMultiplier: 2, isConfirmed: false },
        B: { id: 'B', label: 'Kelompok B', rentMultiplier: 2, isConfirmed: false },
        C: { id: 'C', label: 'Kelompok C', rentMultiplier: 2, isConfirmed: false },
        D: { id: 'D', label: 'Kelompok D', rentMultiplier: 2, isConfirmed: false },
      };

      currentGroups[groupId] = {
        ...currentGroups[groupId],
        isConfirmed: wantToConfirm,
      };

      tx.update(gameRef, {
        groupsConfig: currentGroups,
      });

      finalGroupsConfig = currentGroups;
    });

    res.json({ success: true, groupsConfig: finalGroupsConfig });
  } catch (err: any) {
    console.error('Confirm group error:', err);
    res.status(400).json({ error: err.message || 'Gagal mengubah status kelompok.' });
  }
});

/**
 * 4. POST /api/requests/create
 * Submits consensus proposal for physical board event
 */
app.post('/api/requests/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { gameId, type, title, detail, amount, targetAssetId } = req.body;
  const user = req.user!;

  if (!gameId || !type || !title || amount === undefined) {
    res.status(400).json({ error: 'Parameter permintaan tidak lengkap.' });
    return;
  }

  if (!adminDb) {
    res.status(503).json({ error: 'Backend Firebase belum aktif.' });
    return;
  }

  const gameRef = adminDb.collection('games').doc(gameId);

  try {
    const gameSnap = await gameRef.get();
    if (!gameSnap.exists) {
      res.status(404).json({ error: 'Room tidak ditemukan.' });
      return;
    }

    // Verify caller is a member
    const memberSnap = await gameRef.collection('members').doc(user.uid).get();
    if (!memberSnap.exists) {
      res.status(403).json({ error: 'Anda bukan anggota room ini.' });
      return;
    }

    const requesterData = memberSnap.data()!;
    const membersSnap = await gameRef.collection('members').get();

    // Snapshot of active validators
    const validators: Record<string, any> = {};
    membersSnap.forEach((mDoc: QueryDocumentSnapshot) => {
      const m = mDoc.data();
      validators[m.uid] = {
        uid: m.uid,
        displayName: m.displayName,
        decision: m.uid === user.uid ? 'approved' : 'pending',
        decidedAt: m.uid === user.uid ? Date.now() : null,
      };
    });

    const reqRef = gameRef.collection('requests').doc();
    await reqRef.set({
      id: reqRef.id,
      gameId,
      requesterId: user.uid,
      requesterName: requesterData.displayName,
      type,
      title,
      detail: detail || '',
      amount: Number(amount),
      targetAssetId: targetAssetId || null,
      createdAt: Date.now(),
      status: 'pending',
      validators,
    });

    res.json({ success: true, requestId: reqRef.id });
  } catch (err: any) {
    console.error('Create request error:', err);
    res.status(500).json({ error: err.message || 'Gagal mengajukan permintaan.' });
  }
});

/**
 * 5. POST /api/requests/vote
 * Secure consensus voting on trusted backend:
 * - Only the authentic UID owner can vote for their seat
 * - 1 rejection immediately rejects
 * - 100% consensus executes financial/asset transfer atomically
 * - If financial execution fails, request marked failed without partial corruption!
 */
app.post('/api/requests/vote', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { gameId, requestId, decision } = req.body;
  const user = req.user!;

  if (!gameId || !requestId || !['approved', 'rejected'].includes(decision)) {
    res.status(400).json({ error: 'gameId, requestId, dan decision (approved/rejected) wajib diisi.' });
    return;
  }

  if (!adminDb) {
    res.status(503).json({ error: 'Backend Firebase belum aktif.' });
    return;
  }

  const gameRef = adminDb.collection('games').doc(gameId);
  const reqRef = gameRef.collection('requests').doc(requestId);

  try {
    await adminDb.runTransaction(async (tx: Transaction) => {
      // 1. ALL READS FIRST
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists) {
        throw new Error('Permintaan tidak ditemukan.');
      }

      const reqData = reqSnap.data()!;
      if (reqData.status !== 'pending') {
        throw new Error('Permintaan ini sudah selesai diproses.');
      }

      // Check voter is an active validator in snapshot
      if (!reqData.validators || !reqData.validators[user.uid]) {
        throw new Error('Anda tidak terdaftar sebagai validator dalam permintaan ini.');
      }

      // Build updated validators map
      const updatedValidators = {
        ...reqData.validators,
        [user.uid]: {
          ...reqData.validators[user.uid],
          decision,
          decidedAt: Date.now(),
        },
      };

      // Rule: 1 rejection terminates request as rejected
      if (decision === 'rejected') {
        tx.update(reqRef, {
          validators: updatedValidators,
          status: 'rejected',
          rejectionReason: `Ditolak oleh ${reqData.validators[user.uid]?.displayName || 'Validator'}`,
        });
        return;
      }

      // Check if all validators approved
      const allApproved = Object.values(updatedValidators).every((v: any) => v.decision === 'approved');

      if (!allApproved) {
        // Still pending more votes
        tx.update(reqRef, {
          validators: updatedValidators,
        });
        return;
      }

      // ==========================================
      // EXECUTE FINANCIAL EFFECTS ATOMICALLY
      // ==========================================
      if (reqData.type === 'claim_start') {
        const memberRef = gameRef.collection('members').doc(reqData.requesterId);
        const memberSnap = await tx.get(memberRef);
        
        if (!memberSnap.exists) {
          // If member disappeared, mark failed_execution without partial change
          tx.update(reqRef, {
            validators: updatedValidators,
            status: 'failed_execution',
            rejectionReason: 'Pemain pemohon tidak ditemukan di room.',
          });
          return;
        }

        const memberData = memberSnap.data()!;
        const currentBalance = Number(memberData.balance) || 0;
        const newBalance = currentBalance + reqData.amount;

        // Perform balance update
        tx.update(memberRef, {
          balance: newBalance,
        });

        // Create settled append-only ledger transaction
        const txDocRef = gameRef.collection('transactions').doc(`TX-START-${Date.now()}`);
        tx.set(txDocRef, {
          id: txDocRef.id,
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
          referenceId: reqRef.id,
        });

        // Mark request as approved only after successful execution
        tx.update(reqRef, {
          validators: updatedValidators,
          status: 'approved',
        });
      } else {
        // Other request types (card_reward, disputed_penalty)
        tx.update(reqRef, {
          validators: updatedValidators,
          status: 'approved',
        });
      }
    });

    res.json({ success: true, message: 'Suara Anda berhasil dicatat.' });
  } catch (err: any) {
    console.error('Cast vote error:', err);
    res.status(400).json({ error: err.message || 'Gagal memproses suara.' });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    firebaseAdmin: Boolean(adminDb),
    time: new Date().toISOString(),
  });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Monopoli Bank Server] Running at http://localhost:${port}`);
  });
}

startServer().catch((err: any) => {
  console.error('Failed to start server:', err);
});
