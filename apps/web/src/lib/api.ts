/**
 * Lo único que el cliente le pide al servidor durante una partida.
 *
 * Solo viajan el tablero y la clave del patrón: el servidor vuelve a detectar
 * con el engine antes de redactar nada (5.1), así que aquí no hace falta —ni
 * serviría de nada— mandar la técnica ni las celdas.
 */

const ENDPOINT = '/api/explain';

export type ExplainResult =
  | { readonly kind: 'text'; readonly text: string }
  /** 429: se acabó la cuota del día. El mensaje lo redacta el servidor. */
  | { readonly kind: 'limit'; readonly message: string }
  /** Red caída, 5xx o una respuesta que no entendemos. */
  | { readonly kind: 'error' };

function textOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const { explanation } = body as Record<string, unknown>;
  return typeof explanation === 'string' && explanation !== '' ? explanation : null;
}

function messageOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const { message } = body as Record<string, unknown>;
  return typeof message === 'string' && message !== '' ? message : null;
}

export async function fetchExplanation(
  puzzle: string,
  patternKey: string,
  signal?: AbortSignal,
): Promise<ExplainResult> {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ puzzle, patternKey }),
      signal,
    });

    const body: unknown = await response.json();

    if (response.status === 429) {
      const message = messageOf(body);
      return message === null ? { kind: 'error' } : { kind: 'limit', message };
    }
    if (!response.ok) return { kind: 'error' };

    const text = textOf(body);
    return text === null ? { kind: 'error' } : { kind: 'text', text };
  } catch {
    // Incluye el abort al pedir otra pista: quien aborta ya no mira el
    // resultado, así que no hace falta distinguirlo de un fallo de red.
    return { kind: 'error' };
  }
}
