import { generate, toString as boardToString } from 'engine';

import { Game } from '../components/Game';
import { copy } from '../copy';

/**
 * Semilla medida con el propio engine, no elegida de memoria: `classify` la da
 * como `easy` con 25 pistas, así que se resuelve entera con singles. Fija a
 * propósito — la página se prerenderiza estática y `generate` (81 backtracks de
 * unicidad) no corre en cada visita. 3.3 la convertirá en elección del jugador.
 */
const SEED = 4;

export default function Page() {
  const { puzzle } = generate({ seed: SEED });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-mono text-xl tracking-tight">{copy.app.title}</h1>
        <p className="text-sm text-ink-muted">{copy.app.tagline}</p>
      </header>
      <Game puzzle={boardToString(puzzle)} />
    </main>
  );
}
