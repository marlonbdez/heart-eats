import { createApp } from './app.js';
import { loadConfig } from './config/env.js';

const config = loadConfig();
const server = createApp(config).listen(config.PORT, () => {
  console.log(`API escuchando en el puerto ${config.PORT}`);
});

// El hosting avisa con SIGTERM al reiniciar o desplegar: se termina lo que
// está en curso antes de salir.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
