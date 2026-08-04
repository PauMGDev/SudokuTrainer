import { DIGITS, type Digit } from 'engine';

import { copy } from '../copy';

interface KeypadProps {
  /** `null` borra la celda seleccionada, o sus notas en modo notas. */
  readonly onInput: (digit: Digit | null) => void;
  readonly notes: boolean;
  readonly onToggleNotes: () => void;
  readonly disabled: boolean;
}

const BUTTON =
  'flex min-h-12 items-center justify-center rounded-sm border border-line font-mono text-lg ' +
  'tabular-nums transition-colors hover:border-accent-deep active:border-accent active:text-accent ' +
  'disabled:opacity-40 disabled:hover:border-line';

/**
 * Entrada para dedo y ratón. Diez botones en dos filas de cinco: en un móvil de
 * 375 px eso da objetivos de ~66 px, mientras que una sola fila de diez daría 34.
 */
export function Keypad({ onInput, notes, onToggleNotes, disabled }: KeypadProps) {
  return (
    <div
      role="group"
      aria-label={copy.keypad.label}
      className="flex flex-col gap-2"
      // Los botones no roban el foco: la rejilla lo conserva y el teclado
      // físico sigue funcionando después de haber tocado uno.
      onPointerDown={(event) => event.preventDefault()}
    >
      <div className="grid grid-cols-5 gap-2">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            aria-label={copy.keypad.digit(digit)}
            disabled={disabled}
            onClick={() => onInput(digit)}
            className={BUTTON}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          aria-label={copy.keypad.erase}
          disabled={disabled}
          onClick={() => onInput(null)}
          className={`${BUTTON} text-ink-muted`}
        >
          {copy.keypad.eraseGlyph}
        </button>
      </div>

      {/* El modo notas no depende de la selección: se arma antes de elegir celda. */}
      <button
        type="button"
        aria-pressed={notes}
        onClick={onToggleNotes}
        className={`${BUTTON} text-base ${notes ? 'border-accent text-accent' : 'text-ink-muted'}`}
      >
        {copy.keypad.notes}
        <kbd className="ml-2 text-xs text-ink-faint">{copy.keypad.notesKey}</kbd>
      </button>
    </div>
  );
}
