// Pone fotos a los locales de ejemplo que no tienen (isDemo), con las que ya
// están en el almacén de fotos (R2). Sirve para recuperar las fotos de los
// locales de prueba tras recrearlos con `npm run seed`, o para estrenar un
// entorno. No sube nada, no toca los locales reales, y los que ya tienen fotos
// se quedan como están: se puede repetir sin riesgo.
//
// Hace falta en server/.env la cadena de MongoDB y las R2_* del almacén
// (docs/14_PRODUCCION.md §3.3). Uso: npm run seed:photos
// Dice la base, cuántas fotos hay y a cuántos locales se las pondrá, y pide
// confirmación (--yes la salta).
import { createInterface } from 'node:readline/promises';
import { AwsClient } from 'aws4fetch';
import { loadConfig } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/db.js';
import { Restaurant } from '../src/models/restaurant.js';
import { Team } from '../src/models/team.js';
import { planPhotos, usablePhotos } from './photos-plan.js';

const config = loadConfig();
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = config;
if (
  !config.MONGODB_URI ||
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !config.R2_PHOTOS_BUCKET
) {
  console.error(
    'Faltan MONGODB_URI y las cuatro R2_* (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,\n' +
      'R2_SECRET_ACCESS_KEY, R2_PHOTOS_BUCKET; y R2_JURISDICTION=eu si el bucket es de la UE) en server/.env.',
  );
  process.exit(1);
}
const bucket = config.R2_PHOTOS_BUCKET;

// Los nombres de lo que hay en `p/`, página a página (S3 ListObjectsV2).
async function listPublished(): Promise<string[]> {
  const client = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
    service: 's3',
    region: 'auto',
  });
  const host = config.R2_JURISDICTION
    ? `${R2_ACCOUNT_ID}.${config.R2_JURISDICTION}.r2.cloudflarestorage.com`
    : `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const files: string[] = [];
  let token: string | undefined;
  do {
    const query = new URLSearchParams({ 'list-type': '2', prefix: 'p/' });
    if (token) query.set('continuation-token', token);
    const res = await client.fetch(`https://${host}/${bucket}?${query}`);
    if (!res.ok) throw new Error(`R2 respondió ${res.status} al listar`);
    const xml = await res.text();
    for (const [, key] of xml.matchAll(/<Key>p\/([^<]+)<\/Key>/g)) {
      files.push(key!);
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1]
      : undefined;
  } while (token);
  return files;
}

await connectDb(config.MONGODB_URI);
await Restaurant.init();
await Team.init();

// Lo que ya usa algo real: fotos de locales que no son de ejemplo y de personas
// del equipo. Esas no se reparten.
const taken = new Set<string>();
const real = await Restaurant.find({ isDemo: { $ne: true } })
  .select('photos signatureDishes')
  .lean();
for (const place of real) {
  for (const photo of place.photos ?? []) taken.add(photo.file);
  for (const dish of place.signatureDishes ?? []) {
    if (dish.photo) taken.add(dish.photo);
  }
}
for (const team of await Team.find().select('stories').lean()) {
  for (const story of team.stories ?? []) {
    if (story.photo) taken.add(story.photo);
  }
}

const pool = usablePhotos(await listPublished(), taken);
const empty = await Restaurant.find({
  isDemo: true,
  status: 'published',
  $or: [{ photos: { $exists: false } }, { photos: { $size: 0 } }],
})
  .select('slug')
  .sort({ slug: 1 })
  .lean();
const plan = planPhotos(
  empty.map((place) => place.slug),
  pool,
);

const db = new URL(config.MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:'));
console.log(
  `Base de datos: ${db.hostname}${db.pathname}\n` +
    `Fotos disponibles en R2 (con miniatura y sin usar en algo real): ${pool.length}\n` +
    `Locales de ejemplo sin fotos: ${empty.length}`,
);
if (plan.size === 0) {
  console.log('No hay nada que repartir.');
  await disconnectDb();
  process.exit(0);
}
if (!process.argv.includes('--yes')) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `Se pondrán fotos a ${plan.size} locales. Escribe "repartir" para continuar: `,
  );
  rl.close();
  if (answer.trim() !== 'repartir') {
    console.log('No se ha cambiado nada.');
    await disconnectDb();
    process.exit(0);
  }
}

const BATCH = 200;
const writes = [...plan].map(([slug, files]) => ({
  updateOne: {
    filter: { slug, isDemo: true },
    update: { $set: { photos: files.map((file) => ({ file })) } },
  },
}));
for (let i = 0; i < writes.length; i += BATCH) {
  await Restaurant.bulkWrite(writes.slice(i, i + BATCH));
}
console.log(`${plan.size} locales con fotos`);
await disconnectDb();
