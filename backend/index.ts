import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

interface Player {
  id: string;
  name: string;
  score: number;
}

interface Room {
  id: string;
  players: Player[];
  creatorId: string;
  creatorName: string;
  creatorToken: string;
  isClosed: boolean;
}

type Rooms = Record<string, Room>;

const app = express();
app.use(cors());

app.get('/ping', (req, res) => res.send('pong'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const rooms: Rooms = {};

io.on('connection', (socket: Socket) => {
  console.log('Usuario conectado:', socket.id);

socket.on(
      'join_room',
      (
        {
          roomId,
          userName,
          creatorToken,
        }: { roomId: string; userName: string; creatorToken?: string },
        callback?: (room: Room) => void,
      ) => {
        socket.join(roomId);
        const normalizedName = userName.trim();
        socket.data.userName = normalizedName;
        socket.data.roomId = roomId;

        if (!rooms[roomId]) {
          rooms[roomId] = {
            id: roomId,
            players: [],
            creatorId: socket.id,
            creatorName: normalizedName,
            creatorToken: creatorToken || crypto.randomUUID(),
            isClosed: false,
          };
        } else if (creatorToken && rooms[roomId].creatorToken === creatorToken) {
          rooms[roomId].creatorId = socket.id;
        }

        const existingPlayer = rooms[roomId].players.find(
          (player) => player.id === socket.id || player.name.trim().toLowerCase() === normalizedName.toLowerCase(),
        );

        if (!existingPlayer) {
          rooms[roomId].players.push({ id: socket.id, name: normalizedName, score: 0 });
        } else {
          if (existingPlayer.id !== socket.id) {
            existingPlayer.id = socket.id;
          }
          existingPlayer.name = normalizedName;
        }

        if (creatorToken && rooms[roomId].creatorToken === creatorToken) {
          rooms[roomId].creatorName = userName;
        }

        io.to(roomId).emit('room_data', rooms[roomId]);
        if (callback) callback(rooms[roomId]);
      },
    );

  socket.on('update_score', ({ roomId, amount }: { roomId: string; amount: number }) => {
    const room = rooms[roomId];
    if (!room || room.isClosed) return;

    const currentName = String(socket.data.userName || '').trim();
    const player = room.players.find(
      (p) => p.id === socket.id || (currentName && p.name.trim().toLowerCase() === currentName.toLowerCase()),
    );

    if (player) {
      player.id = socket.id;
      player.name = player.name.trim() || currentName || player.name;
      player.score += amount;
      if (player.score < 0) player.score = 0;

      io.to(roomId).emit('room_data', room);
    }
  });

  socket.on(
    'finish_count',
    (
      { roomId }: { roomId: string },
      callback?: (room: Room) => void,
    ) => {
      const room = rooms[roomId];
      if (!room) return;

      const currentName = String(socket.data.userName || '').trim();
      const player = room.players.find(
        (p) => p.id === socket.id || (currentName && p.name.trim().toLowerCase() === currentName.toLowerCase()),
      );
      if (!player) {
        return;
      }

      room.isClosed = true;
      io.to(roomId).emit('room_data', room);
      if (callback) callback(room);
    },
  );

  socket.on('leave_room', ({ roomId }: { roomId: string }) => {
    const room = rooms[roomId];
    if (!room) return;

    const currentName = String(socket.data.userName || '').trim();
    const playerIndex = room.players.findIndex(
      (player) => player.id === socket.id || (currentName && player.name.trim().toLowerCase() === currentName.toLowerCase()),
    );
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
    }

    if (room.players.length === 0) {
      delete rooms[roomId];
    } else {
      io.to(roomId).emit('room_data', room);
    }
  });

  socket.on('disconnect', () => {
    const currentName = String(socket.data.userName || '').trim();
    const roomId = String(socket.data.roomId || '');

    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(
        (player) => player.id === socket.id || (currentName && player.name.trim().toLowerCase() === currentName.toLowerCase()),
      );

      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        if (player) {
          player.id = player.id;
          player.name = player.name.trim() || currentName || player.name;
        }
      }

      io.to(roomId).emit('room_data', room);
      return;
    }

    for (const roomId of Object.keys(rooms)) {
      const room = rooms[roomId];
      if (!room) continue;

      const playerIndex = room.players.findIndex(
        (player) => player.id === socket.id || (currentName && player.name.trim().toLowerCase() === currentName.toLowerCase()),
      );

      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        if (player) {
          player.name = player.name.trim() || currentName || player.name;
        }
      }

      io.to(roomId).emit('room_data', room);
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