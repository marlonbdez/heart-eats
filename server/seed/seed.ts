// Carga los locales de ejemplo ([DEMO], ficticios) en la base de datos.
// Es idempotente: borra solo lo marcado isDemo y lo vuelve a crear, sin tocar
// datos reales. Uso: npm run seed
import { readFileSync } from 'node:fs';
import { loadConfig } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/db.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Team } from '../src/models/team.js';

type SeedEntry = Record<string, unknown> & { team?: Record<string, unknown> };

const entries = JSON.parse(
  readFileSync(new URL('./restaurants.json', import.meta.url), 'utf-8'),
) as SeedEntry[];

const config = loadConfig();
await connectDb(config.MONGODB_URI);
await Restaurant.init();
await Team.init();

const demoIds = await Restaurant.find({ isDemo: true }).distinct('_id');
await Team.deleteMany({ restaurantId: { $in: demoIds } });
await Restaurant.deleteMany({ isDemo: true });

for (const { team, ...data } of entries) {
  const restaurant = await Restaurant.create(data);
  if (team) await Team.create({ ...team, restaurantId: restaurant._id });
}

console.log(`${entries.length} locales de ejemplo cargados`);
await disconnectDb();
