import { BOX_SIZE, UNIT_SIZE, type CellIndex, type Cell as CellModel, type CellRef } from 'engine';

import { copy } from '../copy';

interface CellProps {
  readonly cell: CellModel;
  readonly index: CellIndex;
  /** Notación R#C#. No se llama `ref`: React reserva ese nombre de prop. */
  readonly cellRef: CellRef;
  readonly row: number;
  readonly col: number;
  readonly selected: boolean;
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

export function Cell({
  cell,
  index,
  cellRef,
  row,
  col,
  selected,
  conflict,
  tabbable,
  onSelect,
}: CellProps) {
  return (
    <div
      role="gridcell"
      tabIndex={tabbable ? 0 : -1}
      aria-label={copy.board.cell(cellRef, cell.value, cell.given)}
      aria-readonly={cell.given}
      aria-selected={selected}
      onClick={() => onSelect(index)}
      // Enfocar y seleccionar son lo mismo aquí: así entrar con Tab deja la
      // selección visible, y el anillo nunca desaparece teniendo el foco.
      onFocus={() => onSelect(index)}
      className={[
        'flex cursor-pointer select-none items-center justify-center border-line font-mono tabular-nums',
        'text-[clamp(1rem,4.2vw,1.5rem)] outline-none',
        borders(row, col),
        // La pista es el dato inmutable: máximo contraste. Lo que pone el jugador
        // se distingue por peso y tono, no por color: el color queda reservado
        // para dónde estás (accent) y qué está mal (danger).
        cell.given ? 'font-medium' : '',
        // Excluyentes a propósito: dos utilidades de color en la misma clase no
        // tienen orden garantizado, gana la última definida en la hoja, no la
        // última escrita aquí.
        conflict ? 'text-danger' : cell.given ? 'text-ink' : 'text-ink-muted',
        conflict ? 'bg-danger/10' : selected ? 'bg-accent/10' : '',
        selected ? 'z-10 ring-2 ring-inset ring-accent' : '',
      ].join(' ')}
    >
      {cell.value ?? ''}
    </div>
  );
}
