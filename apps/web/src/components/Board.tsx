import { useEffect, useRef, type KeyboardEvent } from 'react';
import { UNIT_SIZE, type Board as BoardModel, type CellIndex } from 'engine';

import { copy } from '../copy';
import { CELL_REFS } from '../lib/game';
import { Cell } from './Cell';

interface BoardProps {
  readonly board: BoardModel;
  readonly selected: CellIndex | null;
  /** Celdas que comparten fila, columna o caja con la seleccionada. */
  readonly peers: ReadonlySet<CellIndex>;
  readonly conflicts: ReadonlySet<CellIndex>;
  readonly onSelect: (index: CellIndex) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * El patrón ARIA grid exige filas entre la rejilla y las celdas, pero un
 * contenedor por fila rompería el `grid-cols-9`. `display: contents` resuelve
 * las dos cosas: la semántica ve 9 filas, el layout sigue viendo 81 hijos.
 */
export function Board({ board, selected, peers, conflicts, onSelect, onKeyDown }: BoardProps) {
  const grid = useRef<HTMLDivElement>(null);

  // Roving tabindex: la rejilla entera es una sola parada de tabulador, y el
  // foco real sigue a la selección. No corre mientras `selected` es null, para
  // no robarle el foco a la página al cargar.
  useEffect(() => {
    if (selected === null) return;
    grid.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [selected]);

  const tabbable = selected ?? 0;

  return (
    <div
      ref={grid}
      role="grid"
      aria-label={copy.board.label}
      onKeyDown={onKeyDown}
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
                index={index}
                cellRef={CELL_REFS[index]}
                row={row}
                col={col}
                selected={selected === index}
                peer={peers.has(index)}
                conflict={conflicts.has(index)}
                tabbable={tabbable === index}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
