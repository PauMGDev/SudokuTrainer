import { BOX_SIZE, UNIT_SIZE, type Cell as CellModel, type CellRef } from 'engine';

import { copy } from '../copy';

interface CellProps {
  readonly cell: CellModel;
  /** Notación R#C#. No se llama `ref`: React reserva ese nombre de prop. */
  readonly cellRef: CellRef;
  readonly row: number;
  readonly col: number;
}

/**
 * Las líneas de caja se dibujan con bordes por celda, no con un contenedor por
 * caja: así el grid ve 81 hijos directos y las celdas quedan cuadradas solas.
 */
function borders(row: number, col: number): string {
  const right = col === UNIT_SIZE - 1 ? '' : col % BOX_SIZE === BOX_SIZE - 1 ? 'border-r-2' : 'border-r';
  const bottom = row === UNIT_SIZE - 1 ? '' : row % BOX_SIZE === BOX_SIZE - 1 ? 'border-b-2' : 'border-b';
  return `${right} ${bottom}`;
}

export function Cell({ cell, cellRef, row, col }: CellProps) {
  return (
    <div
      role="gridcell"
      aria-label={copy.board.cell(cellRef, cell.value, cell.given)}
      aria-readonly={cell.given}
      className={[
        'flex select-none items-center justify-center border-line font-mono tabular-nums',
        'text-[clamp(1rem,4.2vw,1.5rem)]',
        borders(row, col),
        // La pista es el dato inmutable: máximo contraste. Lo que pone el jugador
        // se distingue por peso y tono, no por color: el color queda reservado
        // para dónde estás (accent) y qué está mal (danger).
        cell.given ? 'font-medium text-ink' : 'text-ink-muted',
      ].join(' ')}
    >
      {cell.value ?? ''}
    </div>
  );
}
