import { UNIT_SIZE, type Board as BoardModel } from 'engine';

import { copy } from '../copy';
import { CELL_REFS } from '../lib/game';
import { Cell } from './Cell';

/**
 * El patrón ARIA grid exige filas entre la rejilla y las celdas, pero un
 * contenedor por fila rompería el `grid-cols-9`. `display: contents` resuelve
 * las dos cosas: la semántica ve 9 filas, el layout sigue viendo 81 hijos.
 */
export function Board({ board }: { readonly board: BoardModel }) {
  return (
    <div
      role="grid"
      aria-label={copy.board.label}
      className="grid aspect-square w-full grid-cols-9 rounded-sm border-2 border-line"
    >
      {Array.from({ length: UNIT_SIZE }, (_, row) => (
        <div key={row} role="row" className="contents">
          {Array.from({ length: UNIT_SIZE }, (_, col) => {
            const index = row * UNIT_SIZE + col;
            return (
              <Cell
                key={index}
                cell={board.cells[index]}
                cellRef={CELL_REFS[index]}
                row={row}
                col={col}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
