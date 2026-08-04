/**
 * Clases del botón de la app. Vive aparte desde que hay un tercer sitio que lo
 * necesita: los controles del keypad, y ahora el botón de explicación.
 */
export const BUTTON =
  'flex min-h-12 items-center justify-center rounded-sm border border-line font-mono text-lg ' +
  'tabular-nums transition-all duration-300 hover:border-accent hover:text-accent ' +
  'active:border-accent active:text-accent ' +
  'disabled:opacity-40 disabled:hover:border-line disabled:hover:text-inherit';
