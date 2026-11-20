import './src/config/env.js';
import crypto from 'node:crypto';
import http from 'node:http';
import cors from 'cors';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import express from 'express';
import { Server, type Socket } from 'socket.io';
import { db } from './src/db/index.js';
import {
  restaurantMenusTable,
  restaurantsTable,
  sushiReviewsTable,
  userProfilesTable,
} from './src/db/schema.js';
import {
  requireAuth,
  requireSuperuser,
  type AuthenticatedRequest,
} from './src/middleware/auth.js';
import {
  deletePlayerFromDb,
  deleteRoomFromDb,
  loadPlayerHistoryFromDb,
  loadRoomFromDb,
  loadRoomsSummaryFromDb,
  markRoomClosedInDb,
  upsertPlayerInDb,
  upsertRoomInDb,
  type Player,
  type Room,
} from './src/services/roomRepo.js';
import {
  isStorageConfigured,
  uploadWebpToBucket,
  type UploadFolder,
} from './src/services/storage.js';

type Rooms = Record<string, Room>;

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

app.get('/ping', (_req, res) => res.send('pong'));

app.get('/api/health', async (_req, res) => {
  try {
    if (!db) {
      res.status(503).json({ ok: false, db: 'not_configured', storage: isStorageConfigured() });
      return;
    }
    await db.execute(sql`SELECT 1`);
    res.json({ ok: true, db: 'connected', storage: isStorageConfigured() });
  } catch (error) {
    console.error('Healthcheck error:', error);
    res.status(500).json({ ok: false, db: 'error', storage: isStorageConfigured() });
  }
});

app.post('/api/auth/sync', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!db || !req.auth) {
      res.status(503).json({ error: 'Servicio no disponible.' });
      return;
    }
    const { playerToken } = req.body as { playerToken?: string };
    const cleanToken = String(playerToken || req.auth.userId).trim();

    const existingByAuth = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.authUserId, req.auth.userId))
      .limit(1);

    if (existingByAuth[0]) {
      res.json(existingByAuth[0]);
      return;
    }

    const [saved] = await db
      .insert(userProfilesTable)
      .values({
        playerToken: cleanToken,
        authUserId: req.auth.userId,
        displayName: req.auth.name || req.auth.email?.split('@')[0] || 'Sushi Lover',
        role: 'user',
      })
      .onConflictDoUpdate({
        target: userProfilesTable.playerToken,
        set: {
          authUserId: req.auth.userId,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json(saved);
  } catch (error) {
    console.error('POST /api/auth/sync error:', error);
    res.status(500).json({ error: 'No se pudo sincronizar el usuario.' });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const playerToken = String(req.query.playerToken || '').trim();
    if (!playerToken) {
      res.json([]);
      return;
    }
    const history = await loadPlayerHistoryFromDb(playerToken);
    res.json(history);
  } catch (error) {
    console.error('GET /api/history error:', error);
    res.status(500).json({ error: 'No se pudo cargar el historial.' });
  }
});

app.get('/api/restaurants/filters', async (_req, res) => {
  try {
    if (!db) {
      res.json({ countries: [], provinces: [], cities: [] });
      return;
    }
    const rows = await db
      .select({
        country: restaurantsTable.country,
        province: restaurantsTable.province,
        city: restaurantsTable.city,
      })
      .from(restaurantsTable);

    const countries = [...new Set(rows.map((r) => r.country).filter(Boolean))].sort();
    const provinces = [...new Set(rows.map((r) => r.province).filter(Boolean))].sort();
    const cities = [...new Set(rows.map((r) => r.city).filter(Boolean))].sort();
    res.json({ countries, provinces, cities });
  } catch (error) {
    console.error('GET /api/restaurants/filters error:', error);
    res.status(500).json({ error: 'No se pudieron cargar los filtros.' });
  }
});

app.get('/api/restaurants', async (req, res) => {
  try {
    if (!db) {
      res.json([]);
      return;
    }
    const country = String(req.query.country || '').trim();
    const province = String(req.query.province || '').trim();
    const city = String(req.query.city || '').trim();

    const conditions = [];
    if (country) conditions.push(sql`lower(${restaurantsTable.country}) = ${country.toLowerCase()}`);
    if (province) conditions.push(sql`lower(${restaurantsTable.province}) = ${province.toLowerCase()}`);
    if (city) conditions.push(sql`lower(${restaurantsTable.city}) = ${city.toLowerCase()}`);

    const restaurants = await db
      .select()
      .from(restaurantsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(restaurantsTable.name);

    if (restaurants.length === 0) {
      res.json([]);
      return;
    }

    const ids = restaurants.map((r) => r.id);
    const menus = await db
      .select()
      .from(restaurantMenusTable)
      .where(inArray(restaurantMenusTable.restaurantId, ids))
      .orderBy(restaurantMenusTable.priceCents);

    const enriched = restaurants.map((r) => ({
      ...r,
      menus: menus.filter((m) => m.restaurantId === r.id),
    }));

    res.json(enriched);
  } catch (error) {
    console.error('GET /api/restaurants error:', error);
    res.status(500).json({ error: 'No se pudieron cargar los restaurantes.' });
  }
});

app.post('/api/restaurants', requireAuth, requireSuperuser, async (req, res) => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Base de datos no configurada.' });
      return;
    }
    const {
      name,
      country = 'España',
      province = '',
      city = '',
      photoDataUrl,
    } = req.body as Record<string, unknown>;

    const cleanName = String(name || '').trim();
    if (!cleanName) {
      res.status(400).json({ error: 'El nombre del restaurante es obligatorio.' });
      return;
    }

    let photoUrl: string | null = null;
    if (
      typeof photoDataUrl === 'string' &&
      photoDataUrl.startsWith('data:image/') &&
      isStorageConfigured()
    ) {
      photoUrl = await uploadWebpToBucket(photoDataUrl, 'locales');
    }

    const [created] = await db
      .insert(restaurantsTable)
      .values({
        name: cleanName,
        country: String(country || 'España').trim() || 'España',
        province: String(province || '').trim(),
        city: String(city || '').trim(),
        photoUrl,
      })
      .returning();

    res.status(201).json({ ...created, menus: [] });
  } catch (error) {
    console.error('POST /api/restaurants error:', error);
    res.status(500).json({ error: 'No se pudo crear el restaurante.' });
  }
});

app.post('/api/restaurants/:id/menus', requireAuth, requireSuperuser, async (req, res) => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Base de datos no configurada.' });
      return;
    }
    const restaurantId = Number(req.params.id);
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurante inválido.' });
      return;
    }

    const { name, priceEuros, currency = 'EUR', notes = '' } = req.body as Record<string, unknown>;
    const cleanName = String(name || '').trim();
    const numericPrice = Number(priceEuros);
    if (!cleanName || Number.isNaN(numericPrice) || numericPrice <= 0) {
      res.status(400).json({ error: 'Nombre de menú y precio válido son obligatorios.' });
      return;
    }

    const [created] = await db
      .insert(restaurantMenusTable)
      .values({
        restaurantId,
        name: cleanName,
        priceCents: Math.round(numericPrice * 100),
        currency: String(currency || 'EUR').trim().toUpperCase(),
        notes: String(notes || '').trim(),
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/restaurants/:id/menus error:', error);
    res.status(500).json({ error: 'No se pudo añadir el menú.' });
  }
});

app.get('/api/reviews', async (_req, res) => {
  try {
    if (!db) {
      res.json([]);
      return;
    }
    const rows = await db
      .select({
        id: sushiReviewsTable.id,
        restaurantId: sushiReviewsTable.restaurantId,
        restaurantName: restaurantsTable.name,
        playerToken: sushiReviewsTable.playerToken,
        authorName: sushiReviewsTable.authorName,
        pieceName: sushiReviewsTable.pieceName,
        tasteScore: sushiReviewsTable.tasteScore,
        sizeScore: sushiReviewsTable.sizeScore,
        presentationScore: sushiReviewsTable.presentationScore,
        comment: sushiReviewsTable.comment,
        photoUrl: sushiReviewsTable.photoUrl,
        createdAt: sushiReviewsTable.createdAt,
      })
      .from(sushiReviewsTable)
      .innerJoin(restaurantsTable, eq(sushiReviewsTable.restaurantId, restaurantsTable.id))
      .orderBy(desc(sushiReviewsTable.createdAt))
      .limit(50);
    res.json(rows);
  } catch (error) {
    console.error('GET /api/reviews error:', error);
    res.status(500).json({ error: 'No se pudieron cargar las valoraciones.' });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Base de datos no configurada.' });
      return;
    }
    const {
      playerToken = 'anonymous',
      authorName = 'Anónimo',
      pieceName,
      restaurantId,
      tasteScore,
      sizeScore,
      presentationScore,
      comment = '',
      photoDataUrl,
    } = req.body as Record<string, unknown>;

    const cleanPiece = String(pieceName || '').trim();
    const parsedRestaurantId = Number(restaurantId);
    if (!cleanPiece) {
      res.status(400).json({ error: 'El nombre de la pieza es obligatorio.' });
      return;
    }
    if (!parsedRestaurantId) {
      res.status(400).json({ error: 'Debes seleccionar un restaurante existente.' });
      return;
    }

    const restRows = await db
      .select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, parsedRestaurantId))
      .limit(1);
    const rest = restRows[0];
    if (!rest) {
      res.status(404).json({ error: 'El restaurante seleccionado no existe.' });
      return;
    }

    let photoUrl: string | null = null;
    if (
      typeof photoDataUrl === 'string' &&
      photoDataUrl.startsWith('data:image/') &&
      isStorageConfigured()
    ) {
      photoUrl = await uploadWebpToBucket(photoDataUrl, 'sushis');
    }

    const [created] = await db
      .insert(sushiReviewsTable)
      .values({
        restaurantId: rest.id,
        playerToken: String(playerToken),
        authorName: String(authorName).trim() || 'Anónimo',
        pieceName: cleanPiece,
        tasteScore: Math.min(5, Math.max(1, Number(tasteScore) || 5)),
        sizeScore: Math.min(5, Math.max(1, Number(sizeScore) || 4)),
        presentationScore: Math.min(5, Math.max(1, Number(presentationScore) || 4)),
        comment: String(comment || '').trim(),
        photoUrl,
      })
      .returning();

    res.status(201).json({ ...created, restaurantName: rest.name });
  } catch (error) {
    console.error('POST /api/reviews error:', error);
    res.status(500).json({ error: 'No se pudo guardar la valoración.' });
  }
});

app.get('/api/profile/:playerToken', async (req, res) => {
  try {
    if (!db) {
      res.json(null);
      return;
    }
    const token = String(req.params.playerToken || '').trim();
    const rows = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.playerToken, token))
      .limit(1);
    res.json(rows[0] ?? null);
  } catch (error) {
    console.error('GET /api/profile error:', error);
    res.status(500).json({ error: 'No se pudo cargar el perfil.' });
  }
});

app.put('/api/profile/:playerToken', async (req, res) => {
  try {
    if (!db) {
      res.status(503).json({ error: 'Base de datos no configurada.' });
      return;
    }
    const token = String(req.params.playerToken || '').trim();
    const { displayName, avatarDataUrl } = req.body as Record<string, unknown>;

    let avatarUrl: string | undefined;
    if (
      typeof avatarDataUrl === 'string' &&
      avatarDataUrl.startsWith('data:image/') &&
      isStorageConfigured()
    ) {
      avatarUrl = await uploadWebpToBucket(avatarDataUrl, 'avatars');
    }

    const existing = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.playerToken, token))
      .limit(1);

    const nextAvatarUrl = avatarUrl ?? existing[0]?.avatarUrl ?? null;

    const [saved] = await db
      .insert(userProfilesTable)
      .values({
        playerToken: token,
        displayName: String(displayName || '').trim() || 'Sushi Lover',
        avatarUrl: nextAvatarUrl,
      })
      .onConflictDoUpdate({
        target: userProfilesTable.playerToken,
        set: {
          displayName: String(displayName || '').trim() || 'Sushi Lover',
          avatarUrl: nextAvatarUrl,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json(saved);
  } catch (error) {
    console.error('PUT /api/profile error:', error);
    res.status(500).json({ error: 'No se pudo guardar el perfil.' });
  }
});

app.post('/api/upload', async (req, res) => {
  try {
    const { dataUrl, folder = 'sushis' } = req.body as {
      dataUrl?: string;
      folder?: UploadFolder;
    };
    if (!dataUrl) {
      res.status(400).json({ error: 'Falta dataUrl.' });
      return;
    }
    const safeFolder: UploadFolder =
      folder === 'avatars' || folder === 'locales' ? folder : 'sushis';
    const url = await uploadWebpToBucket(dataUrl, safeFolder);
    res.json({ url });
  } catch (error) {
    console.error('POST /api/upload error:', error);
    res.status(500).json({ error: 'No se pudo subir la imagen.' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const rooms: Rooms = {};

const normalizeToken = (value?: string): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

async function getOrLoadRoom(roomId: string): Promise<Room | undefined> {
  if (rooms[roomId]) return rooms[roomId];
  const fromDb = await loadRoomFromDb(roomId).catch((err) => {
    console.error('loadRoomFromDb error:', err);
    return null;
  });
  if (fromDb) {
    rooms[roomId] = fromDb;
    return fromDb;
  }
  return undefined;
}

function findPlayerInRoom(
  room: Room,
  socketId: string,
  currentToken: string,
  currentName: string,
): Player | undefined {
  return room.players.find(
    (p) =>
      (currentToken && normalizeToken(p.playerToken) === currentToken) ||
      p.id === socketId ||
      (currentName && p.name.trim().toLowerCase() === currentName.toLowerCase()),
  );
}

io.on('connection', (socket: Socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on(
    'join_room',
    async (
      {
        roomId,
        userName,
        creatorToken,
        playerToken,
      }: { roomId: string; userName: string; creatorToken?: string; playerToken?: string },
      callback?: (room: Room) => void,
    ) => {
      try {
        await socket.join(roomId);
        const normalizedName = userName.trim();
        const normalizedCreatorToken = normalizeToken(creatorToken);
        const normalizedToken =
          normalizeToken(playerToken) || normalizeToken(socket.data.playerToken) || socket.id;
        socket.data.userName = normalizedName;
        socket.data.roomId = roomId;
        socket.data.playerToken = normalizedToken;

        let room = await getOrLoadRoom(roomId);
        if (!room) {
          room = {
            id: roomId,
            players: [],
            creatorId: socket.id,
            creatorName: normalizedName,
            creatorToken: normalizedCreatorToken || crypto.randomUUID(),
            isClosed: false,
          };
          rooms[roomId] = room;
        } else if (normalizedCreatorToken && room.creatorToken === normalizedCreatorToken) {
          room.creatorId = socket.id;
          room.creatorName = normalizedName;
        }

        let player = findPlayerInRoom(room, socket.id, normalizedToken, normalizedName);
        if (!player) {
          player = {
            id: socket.id,
            name: normalizedName,
            score: 0,
            playerToken: normalizedToken,
          };
          room.players.push(player);
        } else {
          player.id = socket.id;
          player.playerToken = normalizedToken;
          player.name = normalizedName;
        }

        await upsertRoomInDb(room).catch((err) => console.error('upsertRoomInDb error:', err));
        await upsertPlayerInDb(roomId, player).catch((err) =>
          console.error('upsertPlayerInDb error:', err),
        );

        io.to(roomId).emit('room_data', room);
        if (callback) callback(room);
      } catch (err) {
        console.error('join_room error:', err);
      }
    },
  );

  socket.on('update_score', async ({ roomId, amount }: { roomId: string; amount: number }) => {
    const room = await getOrLoadRoom(roomId);
    if (!room || room.isClosed) return;

    const currentName = String(socket.data.userName || '').trim();
    const currentToken = normalizeToken(socket.data.playerToken) || '';
    const player = findPlayerInRoom(room, socket.id, currentToken, currentName);

    if (player) {
      player.id = socket.id;
      player.name = player.name.trim() || currentName || player.name;
      player.score = Math.max(0, player.score + amount);

      io.to(roomId).emit('room_data', room);
      upsertPlayerInDb(roomId, player).catch((err) =>
        console.error('upsertPlayerInDb score error:', err),
      );
    }
  });

  socket.on(
    'finish_count',
    async ({ roomId }: { roomId: string }, callback?: (room: Room) => void) => {
      const room = await getOrLoadRoom(roomId);
      if (!room) return;

      const currentName = String(socket.data.userName || '').trim();
      const currentToken = normalizeToken(socket.data.playerToken) || '';
      const player = findPlayerInRoom(room, socket.id, currentToken, currentName);
      if (!player) return;

      room.isClosed = true;
      await markRoomClosedInDb(roomId).catch((err) =>
        console.error('markRoomClosedInDb error:', err),
      );

      io.to(roomId).emit('room_data', room);
      if (callback) callback(room);
    },
  );

  socket.on('leave_room', async ({ roomId }: { roomId: string }) => {
    const room = await getOrLoadRoom(roomId);
    if (!room) return;

    const currentName = String(socket.data.userName || '').trim();
    const currentToken = normalizeToken(socket.data.playerToken) || '';
    const playerIndex = room.players.findIndex(
      (player) =>
        (currentToken && normalizeToken(player.playerToken) === currentToken) ||
        player.id === socket.id ||
        (currentName && player.name.trim().toLowerCase() === currentName.toLowerCase()),
    );

    if (playerIndex !== -1) {
      const removed = room.players[playerIndex];
      room.players.splice(playerIndex, 1);
      if (removed) {
        deletePlayerFromDb(roomId, removed.playerToken || removed.id).catch((err) =>
          console.error('deletePlayerFromDb error:', err),
        );
      }
    }

    if (room.players.length === 0) {
      delete rooms[roomId];
      deleteRoomFromDb(roomId).catch((err) => console.error('deleteRoomFromDb error:', err));
    } else {
      io.to(roomId).emit('room_data', room);
    }
  });

  socket.on(
    'get_rooms_summary',
    async (
      roomIds: string[],
      callback?: (
        summary: Record<
          string,
          { id: string; isClosed: boolean; players: { name: string; score: number }[] }
        >,
      ) => void,
    ) => {
      const summary: Record<
        string,
        { id: string; isClosed: boolean; players: { name: string; score: number }[] }
      > = {};

      if (Array.isArray(roomIds) && roomIds.length > 0) {
        const missingIds: string[] = [];
        for (const id of roomIds) {
          const r = rooms[id];
          if (r) {
            summary[id] = {
              id: r.id,
              isClosed: r.isClosed,
              players: r.players.map((p) => ({ name: p.name, score: p.score })),
            };
          } else {
            missingIds.push(id);
          }
        }
        if (missingIds.length > 0) {
          const fromDb = await loadRoomsSummaryFromDb(missingIds).catch(() => ({}));
          Object.assign(summary, fromDb);
        }
      }

      if (callback) callback(summary);
    },
  );

  socket.on('disconnect', () => {
    const currentName = String(socket.data.userName || '').trim();
    const currentToken = normalizeToken(socket.data.playerToken) || '';
    const roomId = String(socket.data.roomId || '');

    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      const player = findPlayerInRoom(room, socket.id, currentToken, currentName);
      if (player) {
        player.name = player.name.trim() || currentName || player.name;
        if (currentToken) player.playerToken = currentToken;
      }
      io.to(roomId).emit('room_data', room);
      return;
    }

    for (const rId of Object.keys(rooms)) {
      const room = rooms[rId];
      if (!room) continue;
      const player = findPlayerInRoom(room, socket.id, currentToken, currentName);
      if (player) {
        player.name = player.name.trim() || currentName || player.name;
        if (currentToken) player.playerToken = currentToken;
      }
      io.to(rId).emit('room_data', room);
    }
  });
});

const PORT = Number(process.env.PORT || 3002);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} 🍣`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Puerto ${PORT} ocupado. Cierra la instancia anterior o usa otro puerto.`);
    process.exit(1);
  } else {
    console.error('Error del servidor:', error);
    process.exit(1);
  }
});
