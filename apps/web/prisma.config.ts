/**
 * Configuración del CLI de Prisma (migraciones, generate). Nada de esto corre
 * en la app: Next ya carga `.env` por su cuenta, pero el CLI no, y por eso el
 * `dotenv/config` de la primera línea.
 */

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
