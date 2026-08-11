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

        if (!rooms[roomId]) {
          rooms[roomId] = {
            id: roomId,
            players: [],
            creatorId: socket.id,
            creatorName: userName,
            creatorToken: creatorToken || crypto.randomUUID(),
            isClosed: false,
          };
        } else if (creatorToken && rooms[roomId].creatorToken === creatorToken) {
          rooms[roomId].creatorId = socket.id;
        }

        const alreadyJoined = rooms[roomId].players.some((player) => player.id === socket.id);
        if (!alreadyJoined) {
          rooms[roomId].players.push({ id: socket.id, name: userName, score: 0 });
        }

        io.to(roomId).emit('room_data', rooms[roomId]);
        if (callback) callback(rooms[roomId]);
      },
    );

  socket.on('update_score', ({ roomId, amount }: { roomId: string; amount: number }) => {
    const room = rooms[roomId];
    if (!room || room.isClosed) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
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

      const player = room.players.find((p) => p.id === socket.id);
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

    const playerIndex = room.players.findIndex((player) => player.id === socket.id);
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
    for (const roomId of Object.keys(rooms)) {
      const room = rooms[roomId];
      if (!room) continue;

      const playerIndex = room.players.findIndex((player) => player.id === socket.id);

      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);

        if (room.players.length === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit('room_data', room);
        }
      }
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