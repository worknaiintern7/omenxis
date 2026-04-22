import { Router, Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import User from '../models/User';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }
    const user = await User.create({ username, email, password });
    const opts: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? '7d' };
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET as string, opts);
    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const opts: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? '7d' };
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET as string, opts);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update FCM token
router.put('/fcm-token', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.userId, { fcmToken: req.body.fcmToken });
    res.json({ message: 'FCM token updated' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
