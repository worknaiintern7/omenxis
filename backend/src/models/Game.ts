import mongoose, { Document, Schema } from 'mongoose';

export interface IGame extends Document {
  player: mongoose.Types.ObjectId;
  result: 'win' | 'loss' | 'draw';
  moves: number;
  duration: number;
  pgn: string;
  playedAt: Date;
}

const gameSchema = new Schema<IGame>({
  player: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  result: { type: String, enum: ['win', 'loss', 'draw'], required: true },
  moves: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  pgn: { type: String, default: '' },
  playedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IGame>('Game', gameSchema);
