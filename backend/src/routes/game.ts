import { Router, Response } from 'express';
import Game from '../models/Game';
import User from '../models/User';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import { sendPushNotification } from '../config/firebase';

const router = Router();

// Save game result
router.post('/save', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { result, moves, duration, pgn } = req.body;
    const game = await Game.create({ player: req.userId, result, moves, duration, pgn });

    const update: Record<string, number> = { $inc: { gamesPlayed: 1 } } as unknown as Record<string, number>;
    if (result === 'win') (update as any)['$inc'].gamesWon = 1;
    if (result === 'loss') (update as any)['$inc'].gamesLost = 1;
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });

    // Send push notification
    if (user?.fcmToken) {
      const title = result === 'win' ? '🏆 You Won!' : result === 'loss' ? '😔 Game Over' : '🤝 Draw!';
      const body = `Game completed in ${moves} moves.`;
      await sendPushNotification(user.fcmToken, title, body, { gameId: game._id.toString() });
    }

    res.status(201).json(game);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get game history
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const games = await Game.find({ player: req.userId }).sort({ playedAt: -1 }).limit(20);
    res.json(games);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get stats
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('gamesPlayed gamesWon gamesLost username');
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
