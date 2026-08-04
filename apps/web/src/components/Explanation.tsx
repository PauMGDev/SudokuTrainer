import { copy } from '../copy';
import type { Explanation as ExplanationModel } from '../lib/game';

interface ExplanationProps {
  readonly explanation: ExplanationModel;
  /** El texto que se lee: el de Claude, el del límite diario o el de reserva. */
  readonly body: string;
  /** La petición sigue en vuelo. */
  readonly loading: boolean;
}

/**
 * El porqué de la pista. El nombre de la técnica y las celdas los pone el
 * engine, el texto lo escribe Claude en servidor: aquí no se razona sobre
 * sudoku, solo se presenta.
 */
export function Explanation({ explanation, body, loading }: ExplanationProps) {
  return (
    <section
      aria-label={copy.explanation.label}
      className="flex flex-col gap-2 rounded-sm border border-line p-4"
    >
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        {explanation.name}
      </h2>
      <p className="font-mono text-xs text-ink-faint">
        {copy.explanation.pattern(explanation.pattern)}
      </p>
      <p aria-busy={loading} className="text-sm leading-relaxed text-ink-muted">
        {loading ? copy.explanation.loading : body}
      </p>
    </section>
  );
}
