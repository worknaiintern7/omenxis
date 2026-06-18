import { Router, Response } from 'express';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import adminMiddleware from '../middleware/admin';
import User from '../models/User';
import Game from '../models/Game';

const router = Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// 1. Get system stats
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalGames = await Game.countDocuments({});
    
    // Average ELO calculation
    const avgEloResult = await User.aggregate([
      { $match: { role: 'user' } },
      { $group: { _id: null, avgElo: { $avg: '$elo' } } }
    ]);
    const averageElo = avgEloResult.length > 0 ? Math.round(avgEloResult[0].avgElo) : 1200;

    // AI games vs Multiplayer games
    const vsComputerGames = await Game.countDocuments({ gameType: 'vs_computer' });
    const multiplayerGames = await Game.countDocuments({ gameType: 'multiplayer' });

    res.json({
      totalUsers,
      totalAdmins,
      totalGames,
      averageElo,
      vsComputerGames,
      multiplayerGames
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
});

// 2. Get all users (students)
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// 3. Get all game logs (win logs)
router.get('/games', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const games = await Game.find({})
      .populate('player', 'username email elo')
      .sort({ playedAt: -1 })
      .limit(200);
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch game logs' });
  }
});

// 4. Update user ELO or stats
router.put('/users/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { elo, username, email } = req.body;
    const update: any = {};
    if (elo !== undefined) update.elo = Number(elo);
    if (username) update.username = username;
    if (email) update.email = email;

    const user = await User.findByIdAndUpdate(req.params.userId, update, { new: true }).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// 5. Delete user
router.delete('/users/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    // Also delete user's game records
    await Game.deleteMany({ player: req.params.userId });
    res.json({ message: 'User and all associated game records successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

export default router;
