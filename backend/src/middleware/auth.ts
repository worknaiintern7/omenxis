import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ message: 'Server misconfiguration' });
    return;
  }
  try {
    const decoded = jwt.verify(token, secret) as { userId: string };
    if (!decoded?.userId) {
      res.status(401).json({ message: 'Invalid token payload' });
      return;
    }
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export default authMiddleware;
