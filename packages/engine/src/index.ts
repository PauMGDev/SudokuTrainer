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

export {
  countSolutions,
  hasUniqueSolution,
  solve,
  type SolveOptions,
} from './solver';

export {
  countClues,
  generate,
  generateSolution,
  type GeneratedPuzzle,
  type GenerateOptions,
} from './generator';

export { createRandom, type Random } from './random';

export {
  DIFFICULTIES,
  classify,
  solveByTechniques,
  type Difficulty,
} from './difficulty';

export {
  TECHNIQUES,
  rankOf,
  type Detection,
  type Detector,
  type Elimination,
  type Placement,
  type TechniqueId,
} from './detectors/types';

export { createDetection, type DetectionInput } from './detectors/detection';

export { candidateGrid, type CandidateGrid } from './detectors/candidates';

export { DETECTORS, detectAll, detectNext } from './detectors/registry';

export { findNakedSingles, nakedSingleDetector } from './detectors/naked-single';

export { findHiddenSingles, hiddenSingleDetector } from './detectors/hidden-single';

export { findNakedPairs, nakedPairDetector } from './detectors/naked-pair';

export { findPointingPairs, pointingPairDetector } from './detectors/pointing-pair';

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
