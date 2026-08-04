/**
 * Cliente de Prisma, uno por proceso.
 *
 * Perezoso a propósito: `next build` importa los módulos de las rutas para
 * analizarlas y no hay base de datos en ese momento, así que conectarse al
 * importar reventaría la compilación en CI. Se conecta en la primera consulta.
 *
 * El guard sobre `globalThis` es por `next dev`: cada recarga en caliente
 * reevalúa el módulo y sin él se acumularía un pool por edición.
 *
 * En Prisma 7 la cadena de conexión no puede vivir en el schema: entra por
 * adaptador, aquí, que es el único sitio del proyecto que lee `DATABASE_URL`.
 */

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export function db(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing !== undefined) return existing;

  const connectionString = process.env['DATABASE_URL'];
  if (connectionString === undefined || connectionString === '') {
    throw new Error('Falta DATABASE_URL: la caché de explicaciones no puede arrancar');
  }

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  globalForPrisma.prisma = client;
  return client;
}
