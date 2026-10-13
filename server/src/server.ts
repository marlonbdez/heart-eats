import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { connectDb, disconnectDb } from './db.js';

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

const server = createApp(config).listen(config.PORT, () => {
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
