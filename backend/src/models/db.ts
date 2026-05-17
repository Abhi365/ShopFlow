import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/shopflow';
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
