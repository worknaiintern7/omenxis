import { Router, Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import User from '../models/User';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) { res.status(400).json({ message: 'All fields are required' }); return; }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ message: 'Invalid email format' }); return;
    }
    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' }); return;
    }
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) { res.status(400).json({ message: 'User already exists' }); return; }
    const user = await User.create({ username, email, password, role: 'user' });
    const secret = process.env.JWT_SECRET;
    if (!secret) { res.status(500).json({ message: 'Server misconfiguration' }); return; }
    const opts: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? '7d' };
    const token = jwt.sign({ userId: user._id }, secret, opts);
    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ message: 'Email and password are required' }); return; }
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) { res.status(401).json({ message: 'Invalid credentials' }); return; }
    const secret = process.env.JWT_SECRET;
    if (!secret) { res.status(500).json({ message: 'Server misconfiguration' }); return; }
    const opts: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? '7d' };
    const token = jwt.sign({ userId: user._id }, secret, opts);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Get profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('-password').populate('friends', 'username elo');
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json(user);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Update profile (avatar, bio)
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { avatar, bio, username } = req.body;
    const update: any = {};
    if (avatar !== undefined) update.avatar = avatar;
    if (bio !== undefined) update.bio = bio;
    if (username) {
      const exists = await User.findOne({ username, _id: { $ne: req.userId } });
      if (exists) { res.status(400).json({ message: 'Username taken' }); return; }
      update.username = username;
    }
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select('-password');
    res.json(user);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Change password
router.put('/change-password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) { res.status(400).json({ message: 'All fields required' }); return; }
    if (newPassword.length < 6) { res.status(400).json({ message: 'Password must be at least 6 characters' }); return; }
    const user = await User.findById(req.userId);
    if (!user || !(await user.comparePassword(currentPassword))) {
      res.status(401).json({ message: 'Current password is incorrect' }); return;
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Delete account
router.delete('/account', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.findByIdAndDelete(req.userId);
    res.json({ message: 'Account deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Leaderboard
router.get('/leaderboard', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().sort({ elo: -1 }).limit(50)
      .select('username elo gamesPlayed gamesWon winStreak avatar');
    res.json(users);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Search users
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') { res.json([]); return; }
    const sanitized = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({ username: { $regex: sanitized, $options: 'i' }, _id: { $ne: req.userId } })
      .select('username elo avatar').limit(10);
    res.json(users);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Send friend request
router.post('/friend-request/:targetId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const target = await User.findById(req.params.targetId);
    if (!target) { res.status(404).json({ message: 'User not found' }); return; }
    const alreadyFriend = target.friends.some(f => f.toString() === req.userId);
    const alreadyRequested = target.friendRequests.some(f => f.toString() === req.userId);
    if (alreadyFriend || alreadyRequested) { res.status(400).json({ message: 'Already sent or friends' }); return; }
    await User.findByIdAndUpdate(req.params.targetId, {
      $push: { friendRequests: req.userId },
    });
    res.json({ message: 'Friend request sent' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Accept friend request
router.post('/friend-accept/:requesterId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      $pull: { friendRequests: req.params.requesterId },
      $push: { friends: req.params.requesterId },
    });
    await User.findByIdAndUpdate(req.params.requesterId, {
      $push: { friends: req.userId },
    });
    res.json({ message: 'Friend added' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Decline friend request
router.post('/friend-decline/:requesterId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      $pull: { friendRequests: req.params.requesterId },
    });
    res.json({ message: 'Request declined' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Remove friend
router.delete('/friend/:friendId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.userId, { $pull: { friends: req.params.friendId } });
    await User.findByIdAndUpdate(req.params.friendId, { $pull: { friends: req.userId } });
    res.json({ message: 'Friend removed' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Update FCM token
router.put('/fcm-token', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.userId, { fcmToken: req.body.fcmToken });
    res.json({ message: 'FCM token updated' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

export default router;
