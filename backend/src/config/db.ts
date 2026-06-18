import mongoose from 'mongoose';
import User from '../models/User';

const seedAdmin = async () => {
  try {
    const adminEmail = 'admin@gmail.com';
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: adminEmail,
        password: 'Chess@Admin#2024!',
        role: 'admin',
        avatar: '👑',
        bio: 'Chess Platform Administrator Center',
      });
      console.log('👑 Admin user successfully seeded');
    }
  } catch (error) {
    console.error('Failed to seed admin user:', error);
  }
};

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not defined in .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log('MongoDB connected');
    await seedAdmin();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
