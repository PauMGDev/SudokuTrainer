import { copy } from '../copy';
import type { Explanation as ExplanationModel } from '../lib/game';
import { BUTTON } from './button';

interface ExplanationProps {
  /** La técnica detectada, o `null` mientras no hay pista en pantalla. */
  readonly explanation: ExplanationModel | null;
  /** El texto que se lee: el de Claude, el del límite diario o el de reserva. */
  readonly body: string;
  /** La petición sigue en vuelo. */
  readonly loading: boolean;
  /** Presente solo en el paso intermedio: hay patrón y aún no se ha explicado. */
  readonly onExplain?: () => void;
}

/**
 * El porqué de la pista. El nombre de la técnica y las celdas los pone el
 * engine, el texto lo escribe Claude en servidor: aquí no se razona sobre
 * sudoku, solo se presenta.
 *
 * El panel está montado toda la partida, también vacío. Antes aparecía con la
 * primera pista y hasta entonces la columna derecha era un hueco: la página
 * nacía descuadrada y se recolocaba sola a mitad de partida.
 */
export function Explanation({ explanation, body, loading, onExplain }: ExplanationProps) {
  return (
    <section
      aria-label={copy.explanation.label}
      className="flex flex-col gap-2 rounded-sm border border-line p-4"
    >
      {/* Ámbar como el patrón en el tablero: el mismo color dice "esto es lo
          que te está enseñando". En gris hasta que hay algo que enseñar. */}
      <h2
        className={`font-mono text-xs uppercase tracking-[0.2em] ${
          explanation === null ? 'text-ink-faint' : 'text-hint'
        }`}
      >
        {explanation?.name ?? copy.explanation.label}
      </h2>
      {explanation !== null && (
        <p className="font-mono text-xs text-ink-faint">
          {copy.explanation.pattern(explanation.pattern)}
        </p>
      )}
      {(loading || body !== '') && (
        <p aria-busy={loading} className="text-sm leading-relaxed text-ink-muted">
          {loading ? copy.explanation.loading : body}
        </p>
      )}
      {/* Dos pasos, no uno: la pista dice dónde mirar y solo si el jugador
          insiste se le explica por qué. Este clic es el que cuesta dinero. */}
      {onExplain !== undefined && (
        <button type="button" onClick={onExplain} className={`${BUTTON} mt-1 text-base`}>
          {copy.explanation.action}
        </button>
      )}
    </section>
  );
}
