/**
 * Clases del botón de la app. Vive aparte desde que hay un tercer sitio que lo
 * necesita: los controles del keypad, y ahora el botón de explicación.
 */
export const BUTTON =
  'flex min-h-12 items-center justify-center rounded-sm border border-line font-mono text-lg ' +
  'tabular-nums transition-colors hover:border-accent-deep active:border-accent active:text-accent ' +
  'disabled:opacity-40 disabled:hover:border-line';
