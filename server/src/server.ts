import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { connectDb, disconnectDb } from './db.js';
import { ensureAdmin } from './services/ensure-admin.js';
import { nominatimGeocoder } from './services/geocoder.js';
import { startMaintenanceJob } from './services/maintenance.js';
import { consoleMailer, resendMailer } from './services/mailer.js';
import { r2PhotoStore } from './services/photo-store.js';

const config = loadConfig();
try {
  await connectDb(config.MONGODB_URI);
} catch (err) {
  // Sin base de datos no se arranca; el mensaje no incluye la cadena de conexión.
  console.error(
    'No se pudo conectar a MongoDB:',
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
}

if (config.ADMIN_EMAIL) await ensureAdmin(config.ADMIN_EMAIL);

const mailer = config.RESEND_API_KEY
  ? resendMailer({
      apiKey: config.RESEND_API_KEY,
      from: config.MAIL_FROM,
      replyTo: config.MAIL_REPLY_TO,
    })
  : consoleMailer;

// Sin las claves de R2 no hay dónde guardar fotos y la subida responde 503.
const photoStore =
  config.R2_ACCOUNT_ID &&
  config.R2_ACCESS_KEY_ID &&
  config.R2_SECRET_ACCESS_KEY &&
  config.R2_PHOTOS_BUCKET
    ? r2PhotoStore({
        accountId: config.R2_ACCOUNT_ID,
        accessKeyId: config.R2_ACCESS_KEY_ID,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY,
        bucket: config.R2_PHOTOS_BUCKET,
        jurisdiction: config.R2_JURISDICTION,
      })
    : undefined;

const server = createApp(config, {
  mailer,
  photoStore,
  geocoder: nominatimGeocoder({
    baseUrl: config.NOMINATIM_URL,
    userAgent: config.GEOCODER_USER_AGENT,
  }),
}).listen(config.PORT, () => {
  console.log(`API escuchando en el puerto ${config.PORT}`);
});

const stopMaintenanceJob = startMaintenanceJob(photoStore);

// El hosting avisa con SIGTERM al reiniciar o desplegar: se termina lo que
// está en curso antes de salir.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    stopMaintenanceJob();
    server.close(() => {
      void disconnectDb().finally(() => process.exit(0));
    });
  });
}
