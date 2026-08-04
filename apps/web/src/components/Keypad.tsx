import { DIGITS, type Digit } from 'engine';

import { copy } from '../copy';
import { BUTTON } from './button';

interface KeypadProps {
  /** `null` borra la celda seleccionada, o sus notas en modo notas. */
  readonly onInput: (digit: Digit | null) => void;
  readonly notes: boolean;
  readonly onToggleNotes: () => void;
  readonly onUndo: () => void;
  readonly canUndo: boolean;
  readonly onHint: () => void;
  readonly disabled: boolean;
}

/**
 * Entrada para dedo y ratón. Diez botones en dos filas de cinco: en un móvil de
 * 375 px eso da objetivos de ~66 px, mientras que una sola fila de diez daría 34.
 */
export function Keypad({
  onInput,
  notes,
  onToggleNotes,
  onUndo,
  canUndo,
  onHint,
  disabled,
}: KeypadProps) {
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

      <div className="grid grid-cols-3 gap-2">
        {/* Ninguno de los tres depende de la selección: el modo se arma antes de
            elegir celda, deshacer mira el historial y la pista mira el tablero. */}
        <button
          type="button"
          aria-pressed={notes}
          onClick={onToggleNotes}
          className={`${BUTTON} text-base ${notes ? 'border-accent text-accent' : 'text-ink-muted'}`}
        >
          {copy.keypad.notes}
          <kbd className="ml-2 text-xs text-ink-faint">{copy.keypad.notesKey}</kbd>
        </button>
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className={`${BUTTON} text-base text-ink-muted`}
        >
          <span aria-hidden className="mr-2">
            {copy.keypad.undoGlyph}
          </span>
          {copy.keypad.undo}
        </button>
        <button type="button" onClick={onHint} className={`${BUTTON} text-base text-ink-muted`}>
          {copy.hint.action}
        </button>
      </div>
    </div>
  );
}
