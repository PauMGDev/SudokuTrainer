import {
  BOX_SIZE,
  DIGITS,
  UNIT_SIZE,
  type CellIndex,
  type Cell as CellModel,
  type CellRef,
} from 'engine';

import { copy } from '../copy';

interface CellProps {
  readonly cell: CellModel;
  readonly index: CellIndex;
  /** Notación R#C#. No se llama `ref`: React reserva ese nombre de prop. */
  readonly cellRef: CellRef;
  readonly row: number;
  readonly col: number;
  readonly selected: boolean;
  /** Comparte fila, columna o caja con la celda seleccionada. */
  readonly peer: boolean;
  /** Forma parte del patrón que señala la última pista. */
  readonly hinted: boolean;
  /** La explicación abierta la cita como prueba. */
  readonly evidence: boolean;
  /** Lleva el mismo dígito que la celda seleccionada. */
  readonly sameDigit: boolean;
  /** Repite valor con alguna de sus compañeras de fila, columna o caja. */
  readonly conflict: boolean;
  /** `true` en la única celda tabulable de la rejilla (roving tabindex). */
  readonly tabbable: boolean;
  readonly onSelect: (index: CellIndex) => void;
}

/**
 * Las líneas de caja se dibujan con bordes por celda, no con un contenedor por
 * caja: así el grid ve 81 hijos directos y las celdas quedan cuadradas solas.
 */
function borders(row: number, col: number): string {
  const right =
    col === UNIT_SIZE - 1 ? '' : col % BOX_SIZE === BOX_SIZE - 1 ? 'border-r-2' : 'border-r';
  const bottom =
    row === UNIT_SIZE - 1 ? '' : row % BOX_SIZE === BOX_SIZE - 1 ? 'border-b-2' : 'border-b';
  return `${right} ${bottom}`;
}

/**
 * Las notas ocupan la celda entera en una rejilla 3x3 fija: cada dígito cae
 * siempre en su misma posición, así se leen de un vistazo sin contarlos.
 */
function Notes({ candidates }: { readonly candidates: CellModel['candidates'] }) {
  return (
    <span
      aria-hidden
      className="grid h-full w-full grid-cols-3 self-stretch text-[0.4em] leading-none text-ink-muted"
    >
      {DIGITS.map((digit) => (
        <span key={digit} className="flex items-center justify-center">
          {candidates.has(digit) ? digit : ''}
        </span>
      ))}
    </span>
  );
}

export function Cell({
  cell,
  index,
  cellRef,
  row,
  col,
  selected,
  peer,
  hinted,
  evidence,
  sameDigit,
  conflict,
  tabbable,
  onSelect,
}: CellProps) {
  const notes = DIGITS.filter((digit) => cell.candidates.has(digit));

  return (
    <div
      role="gridcell"
      tabIndex={tabbable ? 0 : -1}
      aria-label={copy.board.cell(cellRef, cell.value, cell.given, notes)}
      aria-readonly={cell.given}
      aria-selected={selected}
      onClick={() => onSelect(index)}
      // Enfocar y seleccionar son lo mismo aquí: así entrar con Tab deja la
      // selección visible, y el anillo nunca desaparece teniendo el foco.
      onFocus={() => onSelect(index)}
      className={[
        'relative flex cursor-pointer select-none items-center justify-center border-line font-mono',
        'tabular-nums text-[clamp(1rem,4.2vw,1.5rem)] outline-none',
        // La prueba se marca con un punto en la esquina, no con otro fondo ni
        // otro contorno: los dos canales ya están ocupados por "dónde estás" y
        // "el patrón", y un tercero encima del mismo sitio no se leería.
        evidence
          ? 'after:absolute after:bottom-1 after:right-1 after:h-1.5 after:w-1.5 ' +
            'after:rounded-full after:bg-hint'
          : '',
        borders(row, col),
        // La pista es el dato inmutable: máximo contraste. Lo que pone el jugador
        // se distingue por peso y tono, no por color: el color queda reservado
        // para dónde estás (accent) y qué está mal (danger).
        cell.given ? 'font-medium' : '',
        // Excluyentes a propósito: dos utilidades de color en la misma clase no
        // tienen orden garantizado, gana la última definida en la hoja, no la
        // última escrita aquí.
        // Los dígitos iguales se marcan en el propio número, no en el fondo:
        // el fondo ya dice dónde estás y qué comparte unidad contigo.
        //
        // Cyan apagado, y apagado con opacidad en vez de con `accent-deep`:
        // ese sobre el fondo da 3,6:1, por debajo del mínimo AA para un dígito
        // de ~16 px en móvil. Al 70% sale 5,6:1 y se sigue leyendo como
        // secundario frente al contorno del hint, que va a plena intensidad.
        conflict
          ? 'text-danger'
          : sameDigit
            ? 'text-accent/70'
            : cell.given
              ? 'text-ink'
              : 'text-ink-muted',
        // El peer es contexto, no información: un gris, nunca el acento, o la
        // vista compite con la celda seleccionada.
        conflict
          ? 'bg-danger/10'
          : selected
            ? 'bg-accent/10'
            : hinted
              ? 'bg-hint/15'
              : peer
                ? 'bg-ink/5'
                : '',
        selected ? 'z-10 ring-2 ring-inset ring-accent' : '',
        // El hint va por `outline` porque el fondo y el `ring` ya están
        // ocupados: así se sigue viendo sobre la celda seleccionada o en
        // conflicto. Cyan y pegado al borde chocaba con el anillo de selección
        // —misma banda, mismo color, imposible saber cuál era cuál—, así que
        // ahora es ámbar y va 4 px hacia dentro: en la celda que es las dos
        // cosas se leen dos aros concéntricos, cada uno con su significado.
        hinted ? 'z-10 outline-2 -outline-offset-4 outline-hint' : '',
      ].join(' ')}
    >
      {cell.value ?? (notes.length > 0 ? <Notes candidates={cell.candidates} /> : '')}
    </div>
  );
}
