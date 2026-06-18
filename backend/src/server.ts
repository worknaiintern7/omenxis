import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import connectDB from './config/db';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const io = new Server(server, { cors: { origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'] } });

const PORT = process.env.PORT || 5000;

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests, please try again later.' });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: ALLOWED_ORIGIN, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());
app.use('/api/', limiter);
connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok' }));

interface Player { socketId: string; username: string; userId?: string; timeLeft: number; }
interface Room {
  id: string;
  white: Player | null;
  black: Player | null;
  fen: string;
  moves: string[];
  pgn: string[];
  timeControl: number;
  drawOfferedBy: string | null;
  started: boolean;
  timerInterval?: ReturnType<typeof setInterval>;
  currentTurn: 'white' | 'black';
}

const rooms = new Map<string, Room>();
const waitingPlayers: { socketId: string; username: string; userId?: string; timeControl: number }[] = [];

function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function startTimer(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.timerInterval) clearInterval(room.timerInterval);

  room.timerInterval = setInterval(() => {
    const r = rooms.get(roomId);
    if (!r) return;
    const current = r.currentTurn === 'white' ? r.white : r.black;
    if (!current) return;
    current.timeLeft -= 1;
    io.to(roomId).emit('timer_update', {
      whiteTime: r.white?.timeLeft ?? 0,
      blackTime: r.black?.timeLeft ?? 0,
    });
    if (current.timeLeft <= 0) {
      clearInterval(r.timerInterval);
      const loser = r.currentTurn;
      io.to(roomId).emit('time_out', { loser });
      rooms.delete(roomId);
    }
  }, 1000);
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('find_game', ({ username, userId, timeControl = 600 }: { username: string; userId?: string; timeControl?: number }) => {
    if (!username || typeof username !== 'string') return;
    const safeTimeControl = [60, 180, 300, 600, 900].includes(timeControl) ? timeControl : 600;
    const match = waitingPlayers.findIndex(p => p.timeControl === safeTimeControl);
    if (match !== -1) {
      const opponent = waitingPlayers.splice(match, 1)[0];
      const roomId = generateRoomId();
      const room: Room = {
        id: roomId,
        white: { socketId: opponent.socketId, username: opponent.username, userId: opponent.userId, timeLeft: safeTimeControl },
        black: { socketId: socket.id, username, userId, timeLeft: safeTimeControl },
        fen: 'start', moves: [], pgn: [], timeControl: safeTimeControl,
        drawOfferedBy: null, started: true, currentTurn: 'white',
      };
      rooms.set(roomId, room);
      socket.join(roomId);
      io.sockets.sockets.get(opponent.socketId)?.join(roomId);
      io.to(roomId).emit('game_found', { roomId, white: opponent.username, black: username });
      io.to(opponent.socketId).emit('assign_color', { color: 'white', roomId });
      io.to(socket.id).emit('assign_color', { color: 'black', roomId });
      startTimer(roomId);
    } else {
      waitingPlayers.push({ socketId: socket.id, username, userId, timeControl: safeTimeControl });
      socket.emit('waiting', { message: 'Waiting for opponent...' });
    }
  });

  socket.on('create_room', ({ username, userId, timeControl = 600 }: { username: string; userId?: string; timeControl?: number }) => {
    if (!username || typeof username !== 'string') return;
    const safeTimeControl = [60, 180, 300, 600, 900].includes(timeControl) ? timeControl : 600;
    const roomId = generateRoomId();
    const room: Room = {
      id: roomId,
      white: { socketId: socket.id, username, userId, timeLeft: safeTimeControl },
      black: null, fen: 'start', moves: [], pgn: [], timeControl: safeTimeControl,
      drawOfferedBy: null, started: false, currentTurn: 'white',
    };
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit('room_created', { roomId });
  });

  socket.on('join_room', ({ roomId, username, userId }: { roomId: string; username: string; userId?: string }) => {
    const room = rooms.get(roomId);
    if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
    if (room.black) { socket.emit('error', { message: 'Room is full' }); return; }
    room.black = { socketId: socket.id, username, userId, timeLeft: room.timeControl };
    room.started = true;
    socket.join(roomId);
    io.to(roomId).emit('game_found', { roomId, white: room.white?.username, black: username });
    io.to(room.white!.socketId).emit('assign_color', { color: 'white', roomId });
    io.to(socket.id).emit('assign_color', { color: 'black', roomId });
    startTimer(roomId);
  });

  socket.on('make_move', ({ roomId, move, fen, san }: { roomId: string; move: string; fen: string; san?: string }) => {
    const room = rooms.get(roomId);
    if (!room || !roomId || !move || !fen) return;
    if (typeof move !== 'string' || move.length > 10) return;
    if (typeof fen !== 'string' || fen.length > 100) return;
    room.fen = fen;
    room.moves.push(move);
    if (san && typeof san === 'string' && san.length <= 10) room.pgn.push(san);
    room.currentTurn = room.currentTurn === 'white' ? 'black' : 'white';
    room.drawOfferedBy = null;
    socket.to(roomId).emit('opponent_move', { move, fen });
  });

  // Draw offer
  socket.on('offer_draw', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.drawOfferedBy = socket.id;
    socket.to(roomId).emit('draw_offered');
  });

  socket.on('accept_draw', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.timerInterval) clearInterval(room.timerInterval);
    io.to(roomId).emit('game_ended', { result: 'draw', pgn: room.pgn.join(' ') });
    rooms.delete(roomId);
  });

  socket.on('decline_draw', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.drawOfferedBy = null;
    socket.to(roomId).emit('draw_declined');
  });

  // Resign
  socket.on('resign', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.timerInterval) clearInterval(room.timerInterval);
    const isWhite = room.white?.socketId === socket.id;
    socket.to(roomId).emit('opponent_resigned', { winner: isWhite ? 'black' : 'white' });
    socket.emit('you_resigned');
    io.to(roomId).emit('game_ended', { result: isWhite ? 'black_wins' : 'white_wins', pgn: room.pgn.join(' ') });
    rooms.delete(roomId);
  });

  // Chat
  socket.on('send_chat', ({ roomId, message, username }: { roomId: string; message: string; username: string }) => {
    if (!roomId || !message || !username) return;
    const sanitized = String(message).slice(0, 200).replace(/[<>]/g, '');
    io.to(roomId).emit('chat_message', { username: String(username).slice(0, 30), message: sanitized, time: Date.now() });
  });

  socket.on('game_over', ({ roomId, result, pgn }: { roomId: string; result: string; pgn?: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.timerInterval) clearInterval(room.timerInterval);
    socket.to(roomId).emit('game_ended', { result, pgn: pgn || room.pgn.join(' ') });
    rooms.delete(roomId);
  });

  socket.on('disconnect', () => {
    const idx = waitingPlayers.findIndex(p => p.socketId === socket.id);
    if (idx !== -1) waitingPlayers.splice(idx, 1);
    rooms.forEach((room, roomId) => {
      if (room.white?.socketId === socket.id || room.black?.socketId === socket.id) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        socket.to(roomId).emit('opponent_disconnected');
        rooms.delete(roomId);
      }
    });
    console.log(`Player disconnected: ${socket.id}`);
  });
});

server.listen(Number(PORT), '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
