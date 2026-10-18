// Carga locales ficticios por todo el mundo (seed/stress-data.ts) para probar
// la carga, el cambio de región y de idioma. Todos llevan isDemo: se quitan con
// `npm run seed -- --clear`.
//
// Uso: npm run seed:stress -- --per-city 15
// Es idempotente: antes de cargar borra los suyos (slug demo-stress-…). Dice en
// qué base está y pide confirmación (--yes la salta). No toca nada más.
import { createInterface } from 'node:readline/promises';
import { loadConfig } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/db.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Team } from '../src/models/team.js';
import { generateStress, STRESS_SLUG_PREFIX } from './stress-data.js';

const flag = process.argv.indexOf('--per-city');
const perCity = flag >= 0 ? Number(process.argv[flag + 1]) : 15;
if (!Number.isInteger(perCity) || perCity < 1 || perCity > 200) {
  console.error('--per-city debe ser un entero entre 1 y 200');
  process.exit(1);
}

const places = generateStress(perCity);
const config = loadConfig();
const db = new URL(config.MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:'));
const previous = { slug: { $regex: `^${STRESS_SLUG_PREFIX}` } };

await connectDb(config.MONGODB_URI);
await Restaurant.init();
await Team.init();

const oldCount = await Restaurant.countDocuments(previous);
console.log(
  `Base de datos: ${db.hostname}${db.pathname}\n` +
    `Se borrarán ${oldCount} locales de prueba anteriores y se cargarán ${places.length}.`,
);
if (!process.argv.includes('--yes')) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Escribe "cargar" para continuar: ');
  rl.close();
  if (answer.trim() !== 'cargar') {
    console.log('No se ha cargado nada.');
    await disconnectDb();
    process.exit(0);
  }
}

const oldIds = await Restaurant.find(previous).distinct('_id');
await Team.deleteMany({ restaurantId: { $in: oldIds } });
await Restaurant.deleteMany(previous);

const started = Date.now();
const BATCH = 200;
for (let i = 0; i < places.length; i += BATCH) {
  const chunk = places.slice(i, i + BATCH);
  const created = await Restaurant.insertMany(chunk.map((p) => p.restaurant));
  const teams = chunk.flatMap((p, index) =>
    p.team ? [{ ...p.team, restaurantId: created[index]!._id }] : [],
  );
  if (teams.length > 0) await Team.insertMany(teams);
}

console.log(
  `${places.length} locales de prueba cargados en ${((Date.now() - started) / 1000).toFixed(1)} s`,
);
await disconnectDb();
