/**
 * Cuota diaria de explicaciones por sesión anónima.
 *
 * Lo que se cuenta son redacciones, no peticiones: un acierto de caché no
 * cuesta nada y por tanto no descuenta. Así el límite mide exactamente lo que
 * paga el proyecto, y quien juega patrones comunes casi no lo toca.
 */

import { db } from './db';

const DEFAULT_LIMIT = 10;
const SECONDS_PER_DAY = 24 * 60 * 60;

export interface Quota {
  readonly allowed: boolean;
  readonly used: number;
  readonly limit: number;
}

/** El tope del día. `EXPLAIN_DAILY_LIMIT` manda; si falta o es basura, 10. */
export function dailyLimit(): number {
  const configured = Number(process.env['EXPLAIN_DAILY_LIMIT']);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_LIMIT;
}

/** Día natural en UTC, `YYYY-MM-DD`. La ventana del contador. */
export function today(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Segundos hasta la medianoche UTC, para la cabecera `Retry-After`. */
export function secondsUntilReset(now: Date = new Date()): number {
  const elapsed = Math.floor((now.getTime() - Date.parse(`${today(now)}T00:00:00Z`)) / 1000);
  return SECONDS_PER_DAY - elapsed;
}

/**
 * Descuenta una redacción y dice si estaba permitida.
 *
 * Incrementa primero y decide después, en una sola consulta: dos pestañas a la
 * vez no pueden colarse por el hueco entre leer y escribir. Que el contador
 * siga subiendo por encima del tope es irrelevante — solo se compara.
 */
export async function consumeQuota(sessionId: string, limit: number = dailyLimit()): Promise<Quota> {
  const day = today();
  const { used } = await db().explainQuota.upsert({
    where: { sessionId_day: { sessionId, day } },
    create: { sessionId, day, used: 1 },
    update: { used: { increment: 1 } },
    select: { used: true },
  });
  return { allowed: used <= limit, used, limit };
}
