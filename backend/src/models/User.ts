import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  fcmToken?: string;
  role: 'user' | 'admin';
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  elo: number;
  winStreak: number;
  bestStreak: number;
  bestWinLevel: number;
  avatar: string;
  bio: string;
  friends: mongoose.Types.ObjectId[];
  friendRequests: mongoose.Types.ObjectId[];
  createdAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fcmToken: { type: String },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  elo: { type: Number, default: 1200 },
  winStreak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  bestWinLevel: { type: Number, default: 0 },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (this.password.length < 6) {
    return next(new Error('Password must be at least 6 characters'));
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
