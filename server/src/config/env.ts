import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  // Orígenes de la web que pueden llamar a la API, separados por comas.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
});

export type Config = z.infer<typeof schema>;

// Valida las variables de entorno una sola vez, al arrancar. Si algo falta o
// está mal, el servidor no arranca y dice qué variable es.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Configuración no válida:\n${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
}
