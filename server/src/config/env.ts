import { z } from 'zod';
import { normalize } from '../text.js';

const DEV_MONGODB_URI = 'mongodb://127.0.0.1:27017/hearteats';

const schema = z
  .object({
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
    // Cadena de conexión de MongoDB (Atlas en producción).
    MONGODB_URI: z
      .string()
      .regex(
        /^mongodb(\+srv)?:\/\//,
        'debe empezar por mongodb:// o mongodb+srv://',
      )
      .optional(),
    // Saltos de proxy delante del servidor (en Railway, 1). Hace falta para
    // que el límite de envíos vea la IP real y no la del proxy.
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    // Límite de envíos por IP (docs/02_API_SPEC.md; propuesta, sin cerrar).
    SUBMISSIONS_PER_HOUR: z.coerce.number().int().min(1).default(5),
    SUBMISSIONS_PER_DAY: z.coerce.number().int().min(1).default(20),
    // Nombres de grandes cadenas, separados por comas. Una propuesta que los
    // contiene recibe el aviso «chain». Es configuración, no vive en el repo.
    KNOWN_CHAINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((name) => normalize(name).replace(/\s+/g, ' '))
          .filter(Boolean),
      ),
  })
  // En producción no hay valor por defecto: un servidor sin base de datos
  // configurada no debe arrancar apuntando a un Mongo local por descuido.
  .refine((env) => env.NODE_ENV !== 'production' || env.MONGODB_URI, {
    path: ['MONGODB_URI'],
    message: 'es obligatoria en producción',
  })
  .transform((env) => ({
    ...env,
    MONGODB_URI: env.MONGODB_URI ?? DEV_MONGODB_URI,
  }));

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
