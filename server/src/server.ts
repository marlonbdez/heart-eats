import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { connectDb, disconnectDb } from './db.js';
import { ensureAdmin } from './services/ensure-admin.js';
import { consoleMailer, resendMailer } from './services/mailer.js';

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

const server = createApp(config, { mailer }).listen(config.PORT, () => {
  console.log(`API escuchando en el puerto ${config.PORT}`);
});

// El hosting avisa con SIGTERM al reiniciar o desplegar: se termina lo que
// está en curso antes de salir.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void disconnectDb().finally(() => process.exit(0));
    });
  });
}
