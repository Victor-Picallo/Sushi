import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { roomPlayersTable, roomsTable } from '../db/schema.js';

export interface Player {
  id: string;
  name: string;
  score: number;
  playerToken?: string;
}

export interface Room {
  id: string;
  players: Player[];
  creatorId: string;
  creatorName: string;
  creatorToken: string;
  isClosed: boolean;
}

export async function loadRoomFromDb(roomId: string): Promise<Room | null> {
  if (!db) return null;
  const rows = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId)).limit(1);
  const roomRow = rows[0];
  if (!roomRow) return null;

  const playerRows = await db
    .select()
    .from(roomPlayersTable)
    .where(eq(roomPlayersTable.roomId, roomId));

  return {
    id: roomRow.id,
    creatorId: roomRow.creatorId,
    creatorName: roomRow.creatorName,
    creatorToken: roomRow.creatorToken,
    isClosed: roomRow.isClosed,
    players: playerRows.map((p) => ({
      id: p.socketId,
      name: p.name,
      score: p.score,
      playerToken: p.playerToken,
    })),
  };
}

export async function upsertRoomInDb(room: Room): Promise<void> {
  if (!db) return;
  await db
    .insert(roomsTable)
    .values({
      id: room.id,
      creatorId: room.creatorId,
      creatorName: room.creatorName,
      creatorToken: room.creatorToken,
      isClosed: room.isClosed,
    })
    .onConflictDoUpdate({
      target: roomsTable.id,
      set: {
        creatorId: room.creatorId,
        creatorName: room.creatorName,
        isClosed: room.isClosed,
      },
    });
}

export async function upsertPlayerInDb(roomId: string, player: Player): Promise<void> {
  if (!db) return;
  const token = player.playerToken || player.id;
  await db
    .insert(roomPlayersTable)
    .values({
      roomId,
      socketId: player.id,
      playerToken: token,
      name: player.name,
      score: player.score,
    })
    .onConflictDoUpdate({
      target: [roomPlayersTable.roomId, roomPlayersTable.playerToken],
      set: {
        socketId: player.id,
        name: player.name,
        score: player.score,
        updatedAt: new Date(),
      },
    });
}

export async function markRoomClosedInDb(roomId: string): Promise<void> {
  if (!db) return;
  await db
    .update(roomsTable)
    .set({ isClosed: true, closedAt: new Date() })
    .where(eq(roomsTable.id, roomId));
}

export async function deletePlayerFromDb(roomId: string, playerToken: string): Promise<void> {
  if (!db) return;
  await db
    .delete(roomPlayersTable)
    .where(and(eq(roomPlayersTable.roomId, roomId), eq(roomPlayersTable.playerToken, playerToken)));
}

export async function deleteRoomFromDb(roomId: string): Promise<void> {
  if (!db) return;
  await db.delete(roomsTable).where(eq(roomsTable.id, roomId));
}

export async function loadRoomsSummaryFromDb(
  roomIds: string[],
): Promise<Record<string, { id: string; isClosed: boolean; players: { name: string; score: number }[] }>> {
  const result: Record<string, { id: string; isClosed: boolean; players: { name: string; score: number }[] }> = {};
  if (!db || roomIds.length === 0) return result;

  const rooms = await db.select().from(roomsTable).where(inArray(roomsTable.id, roomIds));
  if (rooms.length === 0) return result;

  const players = await db
    .select()
    .from(roomPlayersTable)
    .where(inArray(roomPlayersTable.roomId, roomIds));

  for (const r of rooms) {
    result[r.id] = {
      id: r.id,
      isClosed: r.isClosed,
      players: players
        .filter((p) => p.roomId === r.id)
        .map((p) => ({ name: p.name, score: p.score })),
    };
  }
  return result;
}

export async function loadPlayerHistoryFromDb(playerToken: string) {
  if (!db || !playerToken) return [];
  const memberships = await db
    .select()
    .from(roomPlayersTable)
    .where(eq(roomPlayersTable.playerToken, playerToken))
    .orderBy(desc(roomPlayersTable.updatedAt))
    .limit(25);

  const roomIds = [...new Set(memberships.map((m) => m.roomId))];
  if (roomIds.length === 0) return [];

  const summaryMap = await loadRoomsSummaryFromDb(roomIds);
  return memberships
    .map((m) => {
      const summary = summaryMap[m.roomId];
      if (!summary) return null;
      return {
        roomId: m.roomId,
        userName: m.name,
        lastJoinedAt: m.updatedAt.getTime(),
        isClosed: summary.isClosed,
        finalPlayers: summary.players,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
