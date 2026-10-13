import mongoose from 'mongoose';

export async function connectDb(uri: string) {
  // Falla rápido si no hay base de datos, en vez de esperar 30 s.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
