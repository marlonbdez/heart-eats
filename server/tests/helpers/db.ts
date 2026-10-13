import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Restaurant } from '../../src/models/restaurant.js';
import { Team } from '../../src/models/team.js';

let mongo: MongoMemoryServer | undefined;

// Arranca un MongoDB en memoria y se conecta. Los índices (sobre todo el
// 2dsphere, necesario para «near») se crean antes de la primera consulta.
export async function startTestDb() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Restaurant.init();
  await Team.init();
}

export async function stopTestDb() {
  await mongoose.disconnect();
  await mongo?.stop();
}

export async function clearTestDb() {
  await Restaurant.deleteMany({});
  await Team.deleteMany({});
}
