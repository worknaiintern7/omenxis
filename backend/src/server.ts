import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// --- Multiplayer Room Logic ---
interface Room {
  id: string;
  white: { socketId: string; username: string } | null;
  black: { socketId: string; username: string } | null;
  fen: string;
  moves: string[];
}

const rooms = new Map<string, Room>();
const waitingPlayers: { socketId: string; username: string }[] = [];

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Find or create a room (matchmaking)
  socket.on('find_game', ({ username }: { username: string }) => {
    if (waitingPlayers.length > 0) {
      // Match with waiting player
      const opponent = waitingPlayers.shift()!;
      const roomId = generateRoomId();

      const room: Room = {
        id: roomId,
        white: opponent,
        black: { socketId: socket.id, username },
        fen: 'start',
        moves: [],
      };
      rooms.set(roomId, room);

      // Join both players to the room
      socket.join(roomId);
      io.sockets.sockets.get(opponent.socketId)?.join(roomId);

      // Notify both players
      io.to(roomId).emit('game_found', {
        roomId,
        white: opponent.username,
        black: username,
      });

      io.to(opponent.socketId).emit('assign_color', { color: 'white', roomId });
      io.to(socket.id).emit('assign_color', { color: 'black', roomId });

      console.log(`Room ${roomId}: ${opponent.username} (white) vs ${username} (black)`);
    } else {
      // Wait for opponent
      waitingPlayers.push({ socketId: socket.id, username });
      socket.emit('waiting', { message: 'Waiting for opponent...' });
    }
  });

  // Create private room
  socket.on('create_room', ({ username }: { username: string }) => {
    const roomId = generateRoomId();
    const room: Room = {
      id: roomId,
      white: { socketId: socket.id, username },
      black: null,
      fen: 'start',
      moves: [],
    };
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit('room_created', { roomId });
    console.log(`Room ${roomId} created by ${username}`);
  });

  // Join private room
  socket.on('join_room', ({ roomId, username }: { roomId: string; username: string }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    if (room.black) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    room.black = { socketId: socket.id, username };
    socket.join(roomId);

    io.to(roomId).emit('game_found', {
      roomId,
      white: room.white?.username,
      black: username,
    });
    io.to(room.white!.socketId).emit('assign_color', { color: 'white', roomId });
    io.to(socket.id).emit('assign_color', { color: 'black', roomId });
    console.log(`Room ${roomId}: ${room.white?.username} (white) vs ${username} (black)`);
  });

  // Handle move
  socket.on('make_move', ({ roomId, move, fen }: { roomId: string; move: string; fen: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.fen = fen;
    room.moves.push(move);
    // Broadcast move to opponent
    socket.to(roomId).emit('opponent_move', { move, fen });
  });

  // Handle game over
  socket.on('game_over', ({ roomId, result }: { roomId: string; result: string }) => {
    socket.to(roomId).emit('game_ended', { result });
    rooms.delete(roomId);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Remove from waiting list
    const idx = waitingPlayers.findIndex((p) => p.socketId === socket.id);
    if (idx !== -1) waitingPlayers.splice(idx, 1);

    // Notify opponent in room
    rooms.forEach((room, roomId) => {
      if (room.white?.socketId === socket.id || room.black?.socketId === socket.id) {
        socket.to(roomId).emit('opponent_disconnected', { message: 'Opponent disconnected' });
        rooms.delete(roomId);
      }
    });

    console.log(`Player disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
