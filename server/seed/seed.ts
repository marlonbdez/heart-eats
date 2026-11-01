// Carga los locales de ejemplo ([DEMO], ficticios) en la base de datos.
// Es idempotente: borra solo lo marcado isDemo y lo vuelve a crear, sin tocar
// datos reales. Uso: npm run seed
//
// Para ponerlos al día en su sitio sin borrar nada (p. ej. en producción, donde
// hay más locales de ejemplo, como los de seed:stress): npm run seed -- --refresh.
// Solo toca los de este archivo, por su slug. Dice en qué base está y pide
// confirmación (--yes la salta).
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
import { requireSafeDatabase } from './database-guard.js';
import { refreshDemoPlaces, type SeedEntry } from './refresh.js';

const entries = JSON.parse(
  readFileSync(new URL('./restaurants.json', import.meta.url), 'utf-8'),
) as SeedEntry[];

const config = loadConfig();
requireSafeDatabase(config.MONGODB_URI);
await connectDb(config.MONGODB_URI);
await Restaurant.init();
await Team.init();

const demoIds = await Restaurant.find({ isDemo: true }).distinct('_id');

const database = () => {
  const db = new URL(config.MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:'));
  return `${db.hostname}${db.pathname}`;
};

// Pide escribir la palabra para seguir; --yes lo salta.
async function confirmed(word: string) {
  if (process.argv.includes('--yes')) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Escribe "${word}" para continuar: `);
  rl.close();
  return answer.trim() === word;
}

if (process.argv.includes('--refresh')) {
  console.log(
    `Base de datos: ${database()}\nLocales de ejemplo de este archivo que se pondrán al día: ${entries.length} (los demás no se tocan)`,
  );
  if (!(await confirmed('actualizar'))) {
    console.log('No se ha cambiado nada.');
    await disconnectDb();
    process.exit(0);
  }
  const { created, updated, skipped } = await refreshDemoPlaces(entries);
  console.log(`${updated} actualizados, ${created} creados`);
  if (skipped.length > 0) {
    console.log(`Sin tocar, porque no son de ejemplo: ${skipped.join(', ')}`);
  }
  await disconnectDb();
  process.exit(0);
}

if (process.argv.includes('--clear')) {
  console.log(
    `Base de datos: ${database()}\nLocales de ejemplo que se borrarán: ${demoIds.length}`,
  );
  if (demoIds.length > 0 && !(await confirmed('borrar'))) {
    console.log('No se ha borrado nada.');
    await disconnectDb();
    process.exit(0);
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
