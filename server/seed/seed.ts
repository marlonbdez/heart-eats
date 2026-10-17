// Carga los locales de ejemplo ([DEMO], ficticios) en la base de datos.
// Es idempotente: borra solo lo marcado isDemo y lo vuelve a crear, sin tocar
// datos reales. Uso: npm run seed
//
// Para quitar los de ejemplo sin volver a crearlos (p. ej. en producción, antes
// de abrir al público): npm run seed -- --clear. Dice en qué base está y cuántos
// borrará, y pide confirmación (--yes la salta).
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
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

if (process.argv.includes('--clear')) {
  const db = new URL(config.MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:'));
  console.log(
    `Base de datos: ${db.hostname}${db.pathname}\nLocales de ejemplo que se borrarán: ${demoIds.length}`,
  );
  if (demoIds.length > 0 && !process.argv.includes('--yes')) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question('Escribe "borrar" para continuar: ');
    rl.close();
    if (answer.trim() !== 'borrar') {
      console.log('No se ha borrado nada.');
      await disconnectDb();
      process.exit(0);
    }
  }
  await Team.deleteMany({ restaurantId: { $in: demoIds } });
  const { deletedCount } = await Restaurant.deleteMany({ isDemo: true });
  console.log(`${deletedCount} locales de ejemplo borrados`);
  await disconnectDb();
  process.exit(0);
}

await Team.deleteMany({ restaurantId: { $in: demoIds } });
await Restaurant.deleteMany({ isDemo: true });

for (const { team, ...data } of entries) {
  const restaurant = await Restaurant.create(data);
  if (team) await Team.create({ ...team, restaurantId: restaurant._id });
}

console.log(`${entries.length} locales de ejemplo cargados`);
await disconnectDb();
