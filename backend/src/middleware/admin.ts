import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest } from './auth';

export const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ message: 'Access denied: Admin role required' });
      return;
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error authorizing admin role' });
  }
};

export default adminMiddleware;
