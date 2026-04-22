import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 to avoid IPv6 DNS issues
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
