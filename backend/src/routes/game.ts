import { Router, Response } from 'express';
import Game from '../models/Game';
import User from '../models/User';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import { sendPushNotification } from '../config/firebase';

const router = Router();

function calcEloChange(result: string, opponentElo: number, myElo: number): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400));
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(K * (score - expected));
}

// Save game result
router.post('/save', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { result, moves, duration, pgn, gameType = 'vs_computer', level = 0, opponent = 'Computer', opponentElo = 1200 } = req.body;

    if (!result || !['win', 'loss', 'draw'].includes(result)) {
      res.status(400).json({ message: 'Invalid result value' }); return;
    }
    if (typeof moves !== 'number' || moves < 0) {
      res.status(400).json({ message: 'Invalid moves count' }); return;
    }

    const user = await User.findById(req.userId);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    const eloChange = calcEloChange(result, opponentElo, user.elo);
    const newElo = Math.max(100, user.elo + eloChange);

    const incUpdate: any = { gamesPlayed: 1 };
    if (result === 'win') incUpdate.gamesWon = 1;
    if (result === 'loss') incUpdate.gamesLost = 1;

    const newStreak = result === 'win' ? user.winStreak + 1 : 0;
    const newBestStreak = Math.max(user.bestStreak, newStreak);
    const newBestWinLevel = result === 'win' ? Math.max(user.bestWinLevel, level) : user.bestWinLevel;

    await User.findByIdAndUpdate(req.userId, {
      $inc: incUpdate,
      elo: newElo,
      winStreak: newStreak,
      bestStreak: newBestStreak,
      bestWinLevel: newBestWinLevel,
    });

    const game = await Game.create({
      player: req.userId, result, moves, duration, pgn,
      gameType, level, opponent, eloChange,
    });

    try {
      const updatedUser = await User.findById(req.userId);
      if (updatedUser?.fcmToken) {
        const title = result === 'win' ? '🏆 You Won!' : result === 'loss' ? '😔 Game Over' : '🤝 Draw!';
        const body = `${result === 'win' ? '+' : ''}${eloChange} ELO · ${moves} moves`;
        await sendPushNotification(updatedUser.fcmToken, title, body, { gameId: game._id.toString() });
      }
    } catch {}

    res.status(201).json({ game, eloChange, newElo });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Get game history
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const games = await Game.find({ player: req.userId }).sort({ playedAt: -1 }).limit(50);
    res.json(games);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Get stats
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId)
      .select('gamesPlayed gamesWon gamesLost username elo winStreak bestStreak bestWinLevel');
    res.json(user);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Get single game PGN for replay
router.get('/replay/:gameId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const game = await Game.findOne({ _id: req.params.gameId, player: req.userId });
    if (!game) { res.status(404).json({ message: 'Game not found' }); return; }
    res.json(game);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

export default router;
