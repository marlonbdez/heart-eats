import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AuditLog } from '../../src/models/audit-log.js';
import { LoginToken } from '../../src/models/login-token.js';
import { Restaurant } from '../../src/models/restaurant.js';
import { Session } from '../../src/models/session.js';
import { Suggestion } from '../../src/models/suggestion.js';
import { Team } from '../../src/models/team.js';
import { Upload } from '../../src/models/upload.js';
import { User } from '../../src/models/user.js';

let mongo: MongoMemoryServer | undefined;

// Arranca un MongoDB en memoria y se conecta. Los índices (sobre todo el
// 2dsphere, necesario para «near») se crean antes de la primera consulta.
export async function startTestDb() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Restaurant.init();
  await Team.init();
  await Suggestion.init();
  await User.init();
  await LoginToken.init();
  await Session.init();
  await Upload.init();
}

export async function stopTestDb() {
  await mongoose.disconnect();
  await mongo?.stop();
}

export async function clearTestDb() {
  await Restaurant.deleteMany({});
  await Team.deleteMany({});
  await Suggestion.deleteMany({});
  await User.deleteMany({});
  await LoginToken.deleteMany({});
  await Session.deleteMany({});
  await AuditLog.deleteMany({});
  await Upload.deleteMany({});
}
