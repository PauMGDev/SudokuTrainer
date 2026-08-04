import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import type { NextConfig } from 'next';

/**
 * Next solo carga el `.env` del directorio de la app, pero en este monorepo el
 * `.env` vive en la raíz (una sola copia para engine, web y el CLI de Prisma).
 * Sin esta línea, `ANTHROPIC_API_KEY` y `DATABASE_URL` no existen en `next dev`
 * y la app se degrada en silencio: explicación de reserva y caché caída.
 */
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const nextConfig: NextConfig = {
  // El engine se publica como TypeScript sin compilar (`exports` apunta a src/index.ts),
  // así que Next tiene que transpilarlo él mismo.
  transpilePackages: ['engine'],
};

export default nextConfig;
