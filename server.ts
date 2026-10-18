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

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (projectId && projectId !== 'MY_FIREBASE_PROJECT_ID') {
  try {
    const adminApp: App = getApps().length === 0 ? initializeApp({ projectId }) : getApps()[0];
    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    console.log(`[Firebase Admin] Initialized for project: ${projectId}`);
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

    // Return strictly sanitized public room info
    res.json({
      gameId: docSnap.id,
      roomCode: data.roomCode,
      status: data.status,
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
