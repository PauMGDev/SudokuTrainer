/**
 * Cuota diaria de explicaciones por sesión anónima.
 *
 * Lo que se cuenta son redacciones, no peticiones: un acierto de caché no
 * cuesta nada y por tanto no descuenta. Así el límite mide exactamente lo que
 * paga el proyecto, y quien juega patrones comunes casi no lo toca.
 */

import { db } from './db';

const DEFAULT_LIMIT = 10;
const DEFAULT_TOTAL = 200;
const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * El contador global vive en la misma tabla, con una sesión reservada.
 *
 * Los identificadores de sesión son UUID, así que este nombre no colisiona con
 * ninguno real y el tope global sale gratis: mismo `upsert` atómico, misma
 * ventana diaria, cero migraciones.
 */
const EVERYONE = '__all__';

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

/**
 * El techo de gasto de toda la demo en un día. `EXPLAIN_DAILY_TOTAL` manda.
 *
 * Existe porque la cuota por sesión se salta borrando una cookie: en una demo
 * pública el límite por sesión ordena el uso normal, y este pone el suelo de lo
 * que puede costar el abuso. 200 explicaciones ≈ 0,20 $ al día.
 */
export function dailyTotal(): number {
  const configured = Number(process.env['EXPLAIN_DAILY_TOTAL']);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_TOTAL;
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

/**
 * Lo mismo, pero para la demo entera. Se descuenta después de la cuota de
 * sesión: quien ya ha agotado la suya no debería consumir del bote común.
 */
export async function consumeTotal(limit: number = dailyTotal()): Promise<Quota> {
  return consumeQuota(EVERYONE, limit);
}
