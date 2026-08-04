/**
 * Configuración del CLI de Prisma (migraciones, generate). Nada de esto corre
 * en la app: Next ya carga `.env` por su cuenta, pero el CLI no, y por eso el
 * `dotenv/config` de la primera línea.
 */

import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// El `.env` está en la raíz del monorepo, no aquí: hay uno solo para todos.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
