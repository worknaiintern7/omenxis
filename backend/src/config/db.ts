import mongoose from 'mongoose';
import User from '../models/User';

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';

    if (!adminEmail || !adminPassword) {
      console.log('Admin seed skipped: ADMIN_EMAIL or ADMIN_PASSWORD is not configured');
      return;
    }

    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      await User.create({
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        avatar: 'admin',
        bio: 'Chess Platform Administrator Center',
      });
      console.log('Admin user successfully seeded');
    }
  } catch (error) {
    console.error('Failed to seed admin user:', error);
  }
};

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not configured');
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
