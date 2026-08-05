/**
 * Sonda manual: las cuatro técnicas contra Claude de verdad, con el payload al
 * lado de su explicación, para revisarlas a ojo.
 *
 * No es un test —no afirma nada sobre el texto, que no es determinista— sino la
 * herramienta de revisión: los dos bugs factuales del prompt (geometría
 * inventada, ubicaciones inventadas) se vieron leyendo estas salidas, no
 * ejecutando la suite. Por eso vive fuera de `pnpm test`, en `pnpm probe:explain`.
 *
 * Cuesta cuatro llamadas reales (~0,004 $) y salta la caché: llama a
 * `writeExplanation` directamente, sin pasar por la route.
 */

import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { test } from 'vitest';
import {
  TECHNIQUES,
  detectAll,
  explainData,
  generate,
  type Board,
  type Detection,
  type TechniqueId,
} from 'engine';

import { writeExplanation } from './explanations';
import { userPrompt } from './prompt';

config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

/**
 * Tableros del generador, con semillas medidas: entre los tres salen las cuatro
 * técnicas. Se construyen aquí en vez de importar los fixtures del engine
 * porque el paquete solo publica su `index`, y abrirle una entrada nueva para
 * una sonda sería pagar superficie pública por una herramienta de andar por casa.
 */
const BOARDS: readonly Board[] = [
  generate({ seed: 0, difficulty: 'easy' }).puzzle,
  generate({ seed: 3 }).puzzle,
  generate({ seed: 0, difficulty: 'hard' }).puzzle,
];

/** La primera detección de esa técnica en cualquiera de los tableros. */
function findCase(technique: TechniqueId): { board: Board; detection: Detection } | null {
  for (const board of BOARDS) {
    const detection = detectAll(board).find((found) => found.technique === technique);
    if (detection !== undefined) return { board, detection };
  }
  return null;
}

test('las cuatro técnicas, payload y explicación', { timeout: 120_000 }, async () => {
  for (const technique of TECHNIQUES) {
    const found = findCase(technique);
    if (found === null) {
      console.log(`\n──── ${technique}: ningún fixture la contiene ────`);
      continue;
    }

    const data = explainData(found.board, found.detection);
    const explanation = await writeExplanation(data);

    console.log(`\n──────── ${technique} ────────`);
    console.log('payload:', userPrompt(data));
    console.log('salida :', explanation.text);
  }
});
