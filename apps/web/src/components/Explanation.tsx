import { copy } from '../copy';
import type { Explanation as ExplanationModel } from '../lib/game';

interface ExplanationProps {
  readonly explanation: ExplanationModel;
  /**
   * Todavía no hay texto que mostrar. Hoy nunca es `true` — el mock es
   * síncrono —, pero es el hueco por el que 5.4 enchufa la espera de la API sin
   * rediseñar el panel.
   */
  readonly loading: boolean;
}

/**
 * El porqué de la pista. El nombre de la técnica lo pone el engine y el texto
 * lo pondrá Claude en 5.4: aquí no se razona sobre sudoku, solo se presenta.
 */
export function Explanation({ explanation, loading }: ExplanationProps) {
  return (
    <section
      aria-label={copy.explanation.label}
      className="flex flex-col gap-2 rounded-sm border border-line p-4"
    >
      <h2 className="font-mono text-sm tracking-tight text-accent">{explanation.name}</h2>
      <p className="font-mono text-xs text-ink-faint">
        {copy.explanation.pattern(explanation.pattern)}
      </p>
      <p aria-busy={loading} className="text-sm leading-relaxed text-ink-muted">
        {loading ? copy.explanation.loading : explanation.body}
      </p>
    </section>
  );
}
