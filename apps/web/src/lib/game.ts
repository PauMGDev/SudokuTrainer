/**
 * Estado de la partida y todo lo que llama al engine.
 *
 * Regla del proyecto: los componentes importan del engine tipos y constantes,
 * nunca funciones. Cualquier llamada al engine vive en este archivo. Así hay un
 * solo sitio donde blindar las funciones que lanzan (`setCellValue` revienta si
 * la celda es una pista) y un solo sitio que revisar para saber qué del engine
 * cruza al bundle del cliente.
 *
 * `gameReducer` es una función pura: no sabe que existe React.
 */

import {
  BOARD_SIZE,
  UNIT_SIZE,
  colOf,
  detectNext,
  formatRefs,
  fromString,
  getCell,
  isDigit,
  isSolved,
  peersOf,
  requireRef,
  rowOf,
  setCandidates,
  setCellValue,
  toIndex,
  toString as boardToString,
  toggleCandidate,
  toRef,
  type Board,
  type CellIndex,
  type CellRef,
  type Detection,
  type Digit,
} from 'engine';

import { copy } from '../copy';

/** Refs R#C# de las 81 celdas por índice. Constante: se calcula una vez al cargar. */
export const CELL_REFS: readonly CellRef[] = Array.from({ length: BOARD_SIZE }, (_, index) =>
  toRef(index),
);

/**
 * Lo que dejó el último Hint. Los tres casos son distintos para el jugador:
 * hay técnica, hay un dígito mal puesto (y entonces detectar sería mentir), o
 * el tablero exige algo que el engine todavía no sabe nombrar.
 */
export type Hint =
  | {
      readonly kind: 'found';
      readonly detection: Detection;
      /** Las celdas del patrón como índices: lo que resalta la rejilla. */
      readonly cells: readonly CellIndex[];
    }
  | { readonly kind: 'conflict' }
  | { readonly kind: 'none' };

export interface GameState {
  readonly board: Board;
  /** `null` hasta que el jugador toca la rejilla por primera vez. */
  readonly selected: CellIndex | null;
  /** Con notas activas, los dígitos se apuntan como candidatos, no se colocan. */
  readonly notes: boolean;
  /**
   * Tableros anteriores, del más antiguo al más reciente. Solo el tablero: no
   * se deshace ni la selección ni el modo, que son dónde estás y no qué hiciste.
   * Sin tope — una partida entera cabe de sobra en memoria.
   */
  readonly past: readonly Board[];
  /** `null` mientras el jugador no pide pista, y en cuanto cambia el tablero. */
  readonly hint: Hint | null;
  /**
   * El jugador ha pedido el porqué de la pista actual. Separado de `hint` porque
   * son dos decisiones distintas: mirar dónde, y que te lo expliquen — y en 5.4
   * solo la segunda cuesta una llamada a la API.
   */
  readonly explain: boolean;
}

export type GameAction =
  | { readonly type: 'select'; readonly index: CellIndex }
  | { readonly type: 'move'; readonly drow: number; readonly dcol: number }
  /** `digit: null` borra la celda, o sus notas si el modo notas está activo. */
  | { readonly type: 'input'; readonly digit: Digit | null }
  | { readonly type: 'toggle-notes' }
  | { readonly type: 'undo' }
  | { readonly type: 'hint' }
  | { readonly type: 'explain' };

/** Reconstruye el tablero desde los 81 caracteres que envía el servidor. */
export function initGame(puzzle: string): GameState {
  return {
    board: fromString(puzzle),
    selected: null,
    notes: false,
    past: [],
    hint: null,
    explain: false,
  };
}

/**
 * Único camino por el que cambia el tablero, y por tanto el que apila historial.
 * También tira la pista: un patrón calculado sobre el tablero anterior deja de
 * ser cierto en cuanto se escribe una celda.
 */
function withBoard(state: GameState, board: Board): GameState {
  return { ...state, board, past: [...state.past, state.board], hint: null, explain: false };
}

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), UNIT_SIZE - 1);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'select': {
      if (state.selected === action.index) return state;
      return { ...state, selected: action.index };
    }

    case 'move': {
      // La primera flecha entra en la rejilla por R1C1 en vez de saltar desde ella.
      if (state.selected === null) return { ...state, selected: 0 };
      // Sin envolver en los bordes: envolver desorienta, y mantener una flecha
      // pulsada teletransportaría al extremo contrario del tablero.
      const row = clamp(rowOf(state.selected) + action.drow);
      const col = clamp(colOf(state.selected) + action.dcol);
      return gameReducer(state, { type: 'select', index: toIndex(row, col) });
    }

    case 'toggle-notes': {
      return { ...state, notes: !state.notes };
    }

    case 'input': {
      if (state.selected === null) return state;
      // `setCellValue` y `setCandidates` lanzan sobre una pista, no devuelven
      // error: el guard va aquí, una vez, y no en cada handler que escriba.
      const cell = getCell(state.board, state.selected);
      if (cell.given) return state;

      if (state.notes) {
        // Una celda con valor no admite notas: apuntarlas exigiría borrarlo
        // antes, y borrarlo por sorpresa perdería trabajo del jugador.
        if (cell.value !== null) return state;
        // Borrar notas de una celda que no las tiene no cambia nada: cortar
        // aquí ahorra un render y no ensuciará el historial de deshacer.
        if (action.digit === null && cell.candidates.size === 0) return state;
        const board =
          action.digit === null
            ? setCandidates(state.board, state.selected, [])
            : toggleCandidate(state.board, state.selected, action.digit);
        return withBoard(state, board);
      }

      const board = setCellValue(state.board, state.selected, action.digit);
      // El engine devuelve el mismo board si el valor no cambia. Cortar aquí
      // ahorra un render y evita ensuciar el historial de deshacer.
      if (board === state.board) return state;
      return withBoard(state, board);
    }

    case 'undo': {
      const previous = state.past.at(-1);
      if (previous === undefined) return state;
      return {
        ...state,
        board: previous,
        past: state.past.slice(0, -1),
        hint: null,
        explain: false,
      };
    }

    case 'hint': {
      // Pedir pista cierra la explicación anterior: era de otra detección.
      const cleared = { ...state, explain: false };
      // Con un dígito mal puesto, los candidatos que ve el detector son falsos
      // y la pista señalaría un patrón que no existe. Antes se arregla el error.
      if (findConflicts(state.board).size > 0) return { ...cleared, hint: { kind: 'conflict' } };
      const detection = detectNext(state.board);
      if (detection === null) return { ...cleared, hint: { kind: 'none' } };
      // Los refs son la frontera del engine; la rejilla pinta por índice.
      const cells = detection.cells.map(requireRef);
      return { ...cleared, hint: { kind: 'found', detection, cells } };
    }

    case 'explain': {
      // Sin patrón en pantalla no hay nada que explicar: el botón solo existe
      // dentro de una pista encontrada, y esto lo garantiza también al reducer.
      if (state.hint?.kind !== 'found') return state;
      return { ...state, explain: true };
    }
  }
}

/**
 * Celdas que repiten valor con alguna de sus 20 compañeras de fila, columna o
 * caja. El engine no exporta validador a propósito (una detección es cierta
 * sobre el tablero tal cual), así que el conflicto es lectura de la UI.
 *
 * Se marcan las dos celdas implicadas, incluida la pista: ver qué pista estás
 * violando es la mitad de la información.
 */
export function findConflicts(board: Board): ReadonlySet<CellIndex> {
  const conflicts = new Set<CellIndex>();
  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const { value } = board.cells[index];
    if (value === null) continue;
    if (peersOf(index).some((peer) => board.cells[peer].value === value)) conflicts.add(index);
  }
  return conflicts;
}

/**
 * Partida ganada. El enunciado tiene solución única, así que un tablero lleno y
 * sin conflictos es esa solución: no hace falta bajarla al cliente para
 * comprobarlo, y así el jugador no puede leerla del HTML.
 */
export function isWon(board: Board, conflicts: ReadonlySet<CellIndex>): boolean {
  return conflicts.size === 0 && isSolved(board);
}

/**
 * Lo que la línea de estado dice de la última pista, o `null` si no hay ninguna.
 * Nombra celdas, nunca dígitos: el hint dice dónde mirar y 4.2 dirá por qué.
 */
export function hintMessage(hint: Hint | null): string | null {
  if (hint === null) return null;
  if (hint.kind === 'conflict') return copy.hint.conflict;
  if (hint.kind === 'none') return copy.hint.none;
  return copy.hint.found(formatRefs(hint.cells));
}

/** Los 81 caracteres del tablero: el formato con el que viaja a /api/explain. */
export function toWire(board: Board): string {
  return boardToString(board);
}

/** Lo que el panel necesita saber de una detección para pintarse. */
export interface Explanation {
  readonly name: string;
  readonly body: string;
  /** Las celdas del patrón en R#C#, como se nombran al jugador. */
  readonly pattern: string;
}

/**
 * Traduce la detección a lo que se lee en el panel, o `null` si no hay patrón.
 * El texto de la técnica es mock hasta 5.4; lo que ya es definitivo es de dónde
 * sale el nombre de la técnica: del engine, nunca escrito a mano en el panel.
 */
export function explanationFor(hint: Hint | null): Explanation | null {
  if (hint?.kind !== 'found') return null;
  const { name, body } = copy.explanation.techniques[hint.detection.technique];
  return { name, body, pattern: formatRefs(hint.cells) };
}

const NO_CELLS: ReadonlySet<CellIndex> = new Set();

/**
 * Las 20 compañeras de fila, columna y caja de la celda seleccionada: las que
 * comparten unidad con ella y por tanto no pueden repetir su valor. Es la ayuda
 * visual que sustituye a recorrer la rejilla con el dedo.
 */
export function peerHighlight(selected: CellIndex | null): ReadonlySet<CellIndex> {
  if (selected === null) return NO_CELLS;
  return new Set(peersOf(selected));
}

const ARROWS: Readonly<Record<string, { drow: number; dcol: number }>> = {
  ArrowUp: { drow: -1, dcol: 0 },
  ArrowDown: { drow: 1, dcol: 0 },
  ArrowLeft: { drow: 0, dcol: -1 },
  ArrowRight: { drow: 0, dcol: 1 },
};

const ERASE_KEYS: readonly string[] = ['0', 'Backspace', 'Delete'];

/** En minúscula: la comparación normaliza la mayúscula. */
const NOTES_KEY = 'n';
const UNDO_KEY = 'z';

/** Lo que la rejilla necesita de un evento de teclado, sin depender de React. */
export interface KeyPress {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}

/**
 * Teclado a acción. Devuelve `null` para todo lo que la rejilla no reclama —
 * Tab incluido, que es la salida y no se intercepta jamás.
 */
export function keyToAction({ key, ctrlKey, metaKey }: KeyPress): GameAction | null {
  // Cmd en Mac, Ctrl en el resto. Con modificador solo se reclama deshacer: los
  // demás atajos son del navegador y robarlos irrita más de lo que ayuda.
  if (ctrlKey || metaKey) {
    return key.toLowerCase() === UNDO_KEY ? { type: 'undo' } : null;
  }

  const arrow = ARROWS[key];
  if (arrow) return { type: 'move', ...arrow };

  if (key.length === 1 && key.toLowerCase() === NOTES_KEY) return { type: 'toggle-notes' };

  const digit = Number(key);
  if (key.length === 1 && isDigit(digit)) return { type: 'input', digit };
  if (ERASE_KEYS.includes(key)) return { type: 'input', digit: null };

  return null;
}
