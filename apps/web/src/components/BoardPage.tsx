/**
 * La partida: cabecera, selector de nivel y tablero.
 *
 * Vive aquí y no en una `page.tsx` porque la pintan dos rutas. La portada la
 * renderiza con un tablero fijo y se prerenderiza en el build; `/[difficulty]/
 * [seed]` la renderiza con lo que pida la URL y se cachea por URL. Ninguna de
 * las dos lee `searchParams`, que es lo que obligaba a ejecutar una función en
 * cada visita — y lo que dejó la portada expuesta a que un rastreador pagase
 * en CPU cada una de sus 171 peticiones por minuto.
 */

import Link from 'next/link';
import { DIFFICULTIES, type Difficulty } from 'engine';

import { Game } from './Game';
import { StripQuery } from './StripQuery';
import { copy } from '../copy';
import { board } from '../lib/boards';

/**
 * El mismo enlace del portfolio: borde tenue, mono, y el cyan reservado para
 * el hover y el estado activo. 44 px de alto — el mínimo táctil cómodo.
 */
const LINK =
  'flex min-h-11 items-center justify-center rounded-sm border border-line px-4 font-mono text-sm ' +
  'transition-all duration-300 hover:border-accent hover:text-accent';

export interface BoardPageProps {
  readonly difficulty: Difficulty;
  readonly seed: number;
}

export function BoardPage({ difficulty, seed: requested }: BoardPageProps) {
  const { wire, seed } = board(difficulty, requested);

  // Se enlaza a la semilla *encontrada* + 1, no a la pedida: pedir un nivel
  // escaso avanza semillas hasta dar con él, y volver a pedir desde la misma
  // devolvería el mismo tablero una y otra vez.
  const href = (level: Difficulty): string => `/${level}/${seed + 1}`;

  return (
    // `justify-center-safe`, no `justify-center`: en un móvil la partida entera
    // no cabe en la pantalla, y centrar un contenido más alto que el hueco
    // recorta por arriba y deja lo cortado fuera del alcance del scroll.
    // El padding inferior respeta la barra de gestos de iOS.
    <main
      // `max-w-lg` en móvil y tableta; en pantalla ancha se abre para que la
      // explicación quepa al lado del tablero en vez de debajo.
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center-safe gap-5 p-4
        pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-6 lg:max-w-4xl"
    >
      {/* Todo en mono: es una app de números, no una portada editorial. */}
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl leading-none tracking-tight sm:text-4xl">
          {copy.app.title}
        </h1>
        <p className="font-mono text-sm text-ink-muted">{copy.app.tagline}</p>
      </header>

      {/* En móvil, los tres niveles se reparten la fila y "New game" ocupa la
          suya: con `flex-wrap` y `ml-auto` quedaba descolgado a media línea.
          En ancho va justo detrás del último nivel, no empujado al extremo
          derecho: allí flotaba solo, sin nada con lo que alinearse. El glifo y
          el hueco extra son los que lo separan del grupo de dificultades. */}
      <nav aria-label={copy.game.difficultyLabel} className="flex flex-wrap items-center gap-2">
        {DIFFICULTIES.map((level) => (
          <Link
            key={level}
            href={href(level)}
            // Cada enlace estrena semilla, así que para un rastreador esto no
            // se acaba nunca. `nofollow` es la señal que dice "no sigas por
            // aquí"; `robots.txt` lo repite para quien mire ahí primero.
            rel="nofollow"
            aria-current={level === difficulty ? 'page' : undefined}
            className={`${LINK} flex-1 sm:flex-none ${
              level === difficulty ? 'border-accent text-accent' : 'text-ink-muted'
            }`}
          >
            {copy.game.difficulty[level]}
          </Link>
        ))}
        <Link
          href={href(difficulty)}
          rel="nofollow"
          className={`${LINK} w-full gap-2 text-ink-muted sm:ml-2 sm:w-auto`}
        >
          <span aria-hidden>{copy.game.newGameGlyph}</span>
          {copy.game.newGame}
        </Link>
      </nav>

      {/* Sin `key`, navegar cambiaría la prop pero el reducer conservaría el
          tablero anterior: el estado se inicializa una sola vez por montaje. */}
      <Game key={wire} puzzle={wire} />

      {/* Los enlaces antiguos llegan aquí con la query vieja pegada detrás. */}
      <StripQuery />
    </main>
  );
}
