/**
 * Superficie pública del engine.
 *
 * TypeScript puro: nada de aquí puede importar React, Next ni APIs de Node.
 * El engine tiene que poder consumirse desde una futura app de escritorio.
 */

export {
  BOARD_SIZE,
  BOX_SIZE,
  DIGITS,
  UNIT_SIZE,
  isCellIndex,
  isDigit,
  isUnitIndex,
  type Board,
  type CandidateSet,
  type Cell,
  type CellIndex,
  type Digit,
  type UnitIndex,
} from './types';

export {
  formatRefs,
  isCellRef,
  parseRef,
  requireRef,
  toIndex,
  toRef,
  type CellRef,
} from './notation';

export {
  ALL_UNITS,
  BOXES,
  COLUMNS,
  ROWS,
  arePeers,
  boxOf,
  colOf,
  peersOf,
  rowOf,
  unitsOf,
  type Unit,
  type UnitKind,
} from './units';

export { countSolutions, hasUniqueSolution, solve } from './solver';

export {
  candidatesFor,
  emptyBoard,
  fromString,
  getCell,
  isSolved,
  setCandidates,
  setCellValue,
  toGrid,
  toString,
  toggleCandidate,
} from './board';
