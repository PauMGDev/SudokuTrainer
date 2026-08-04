# ROADMAP — Sudoku Trainer

Guía de construcción por fases. Cada paso es una sesión corta de Claude Code.
Forma de trabajo en CADA paso: (1) plan primero y esperar OK, (2) ejecutar,
(3) mostrar resumen de cambios, (4) verificar con el criterio de done, (5) commit.
Pasos pequeños, commits frecuentes. No avanzar de fase con el done anterior en rojo.

## Fase 1 — Engine: núcleo
- [x] 1.1 Modelo de tablero: tipos (Cell, Board, Candidate), notación R#C#, utilidades de unidades (fila/columna/caja). Done: tipos sin `any`, tests de utilidades en verde.
- [x] 1.2 Solver por backtracking + contador de soluciones. Done: resuelve fixtures conocidos, detecta multi-solución.
- [x] 1.3 Generador con solución única. Rejilla completa aleatoria + retirada de pistas
      mientras `hasUniqueSolution` aguante, con semilla para reproducibilidad.
      Done: test de unicidad sobre N tableros generados.
      La calibración de dificultad NO va aquí: ver 2.6.

## Fase 2 — Engine: detección de técnicas (fixture-first)
- [x] 2.1 Infraestructura de detección: interfaz Detector, resultado normalizado (técnica, celdas, candidatos, patrón para caché). Done: un detector dummy pasa por la interfaz.
- [x] 2.2 Naked single. 2.3 Hidden single. 2.4 Naked pair. 2.5 Pointing pair.
      Cada una: fixture con tablero que la contiene → test → detector. Done: test en verde por técnica.
- [x] 2.6 Dificultad del generador (segundo tiempo de 1.3): resolver el tablero generado
      aplicando solo detectores y clasificarlo por la técnica más avanzada que exige,
      no por número de huecos. Fácil = solo singles; media = hasta naked pair;
      difícil = necesita pointing pair. Si no se resuelve con los detectores, se descarta.
      Done: 3 dificultades, N tableros por dificultad, cada uno resoluble con las técnicas
      de su nivel y no con las del nivel anterior.

## Fase 3 — Web: tablero jugable
- [x] 3.1 Componente de tablero: render, selección, entrada por teclado y clic. Done: jugable sin lógica de ayuda.
- [ ] 3.2 Modo notas, resaltado de fila/columna/caja, deshacer. Done: interacción completa.
- [ ] 3.3 Nueva partida por dificultad + estado de victoria. Done: partida completa de principio a fin.

## Fase 4 — Hint y Explain (frontend)
- [ ] 4.1 Botón Hint: engine detecta siguiente técnica, resaltar celdas del patrón sin revelar valores. Done: hint correcto sobre fixtures.
- [ ] 4.2 Panel de explicación (UI only, con texto mock). Done: flujo visual completo sin API.

## Fase 5 — API /api/explain
- [ ] 5.1 Route con validación + re-verificación de la detección en servidor. Done: rechaza detecciones inválidas.
- [ ] 5.2 Prisma + Postgres: caché por hash de patrón. Done: segunda petición igual no llama fuera (test/log).
- [ ] 5.3 Rate limit por sesión (cookie, 10/día, 429 amable). Done: petición 11 recibe 429.
- [ ] 5.4 Integración Anthropic (claude-haiku-4-5, prompt del TASK). Done: explicación real en el panel; grep de ANTHROPIC en bundle cliente vacío.

## Fase 6 — Pulido y despliegue
- [ ] 6.1 Diseño final coherente con paumiquel.com (oscuro, cyan, mono en números), mobile. Done: revisión visual.
- [ ] 6.2 README: qué es, demo, arquitectura, sección "Cost engineering". Done: legible por un tercero.
- [ ] 6.3 Deploy en Vercel + variables de entorno documentadas. Done: URL pública jugable.

## Bitácora de fricciones del arnés
Anotar aquí cada vez que el agente haga algo que el arnés debía impedir, o que
repitamos un prompt: es la señal de la siguiente pieza (command, hook, agente).
- 2026-XX-XX: (ejemplo) ...
- 2026-08-04 (1.2→1.3): 1.3 pedía calibrar dificultad "por técnicas requeridas", pero los
  detectores no existen hasta la fase 2: el paso era imposible tal y como estaba escrito.
  Partido en dos tiempos — generador con unicidad en 1.3, calibración en 2.6. Señal a
  vigilar: pasos cuyo done depende de código de una fase posterior.
- 2026-08-04 (1.1): el done de fase 1 es `pnpm test` + `pnpm typecheck`. `pnpm build`
  no puede estar en verde hasta que exista `apps/web` (fase 3), porque el script raíz
  filtra por `web`. Volver a exigirlo en 3.1.
- 2026-08-04: Evaluado replicar el patrón planificador/implementador (usado en el
  proyecto ERP profesional) y descartado para este repo. Motivación: el rol de
  planificación ya lo cubren ROADMAP + /siguiente + modo plan, y el patrón paga
  con exploración de contexto pesada, que este proyecto no tiene. Regla aplicada:
  el arnés se dimensiona a la fricción del proyecto, no se transplanta del anterior.
  Señales que reabrirían la decisión: planes que exijan exploración larga, fallos
  transversales sistemáticos, contaminación plan/implementación.
- 2026-08-04: Fixture de 17 pistas escrito de memoria por el agente resultó inválido.
  Resolución: generar los fixtures con el propio solver (HARD_23 por eliminación de
  pistas preservando unicidad; MULTIPLE_SOLUTIONS con multiplicidad medida ≥50).
  Regla aplicada: los datos verificables no se recuerdan, se construyen y verifican
  con las herramientas del propio proyecto. Bonus: el procedimiento de eliminación
  es el esqueleto del generador de 1.3.
- 2026-08-04: Generador cerrado sin niveles de dificultad (aplazados a 2.6, como
  decidió el roadmap). Validación empírica: 20 semillas producen tableros minimales
  de 23–27 pistas (media 24,5) — el recuento de pistas no discrimina dificultad,
  la calibración debe ser por técnicas requeridas. Además: semilla por defecto 0,
  no aleatoria — en un engine determinista, la aleatoriedad es decisión explícita
  del llamador (y regala puzzle-del-día y URLs compartibles como features futuras).
- 2026-08-04 (2.1): el ROADMAP llegó a la sesión con 1.2 y 1.3 desmarcados y el paso
  2.6 borrado — una edición manual pegó una cabecera antigua encima de la vigente,
  conservando solo lo añadido al final. /siguiente habría reabierto dos pasos ya
  cerrados si no se contrasta con el código. Regla aplicada: el estado real lo dice
  el código, la casilla es solo un índice. Señal a vigilar: si vuelve a pasar, el
  ROADMAP necesita que el estado de cada paso sea derivable (o un hook que compare
  casillas contra HEAD antes de editarlo).
- 2026-08-04: Primer hook: PreToolUse que bloquea ediciones a ROADMAP.md que
  desmarquen pasos cerrados en HEAD (fricción ocurrida 2 veces). Diseño: la verdad
  es HEAD, no el disco; para Edit se simula el resultado; stderr como feedback
  autocorrectivo al agente. Cierra la escalera anunciada: instrucción (CLAUDE.md)
  → estructura (tsconfig, TECHNIQUES) → imposición (hook).
- 2026-08-04 (2.2–2.5): los detectores calculan los candidatos de los valores del
  tablero, así que una eliminación de naked pair o pointing pair no persiste: el
  siguiente detector no la ve. Para 2.2–2.5 es correcto (cada detección es cierta
  sobre el tablero tal cual) y el test de encadenado solo aplica colocaciones. 2.6
  necesita encadenar eliminaciones, y ahí habrá que pasar estado de candidatos y
  cambiar la firma de `Detector`. Decidido no adelantarlo: la abstracción se paga
  cuando hay un segundo consumidor, no cuando se intuye.
- 2026-08-04 (2.4): ni CLASSIC ni HARD_23 contenían un naked pair. En vez de
  escribir un tablero a mano, se barrieron semillas del generador hasta encontrar
  uno (`generate({ seed: 3 })`) y el test verifica que el fixture sigue siendo ese
  tablero. Misma regla que con HARD_23: los datos verificables se construyen con
  las herramientas del proyecto, no se recuerdan.
- 2026-08-04 (2.6): medido antes de escribir el clasificador, sobre 100 semillas:
  fáciles 48, medias 4, difíciles 4, sin clasificar 44. Dos consecuencias que el
  roadmap no preveía. Una: con cuatro técnicas, casi la mitad de los tableros
  minimales no se resuelven y se descartan, así que "difícil" significa hoy "lo
  más duro que el engine sabe explicar", no lo más duro que existe; sumar técnicas
  (X-wing, naked triple) reclasificará parte de ese 44%. Dos: pedir "media" o
  "difícil" cuesta ~25 semillas, y por eso `generate` itera con tope y los tests
  parten de semillas ya medidas en vez de buscar en cada ejecución.
  Regla aplicada: medir la distribución antes de fijar el criterio de done; el
  plan decía "N tableros por dificultad" sin saber si N era alcanzable.
- 2026-08-04 (3.1): `pnpm build` verde por primera vez, como reclamaba la nota de
  1.1. Cerrada esa deuda.
- 2026-08-04 (3.1): el resaltado de conflictos (mismo dígito que un peer) vive en
  `apps/web/src/lib/game.ts`, no en el engine, porque el engine no exporta
  validador: sus detecciones son ciertas sobre el tablero tal cual y nunca dicen
  "esto está mal". Es la primera grieta en el invariante "toda la lógica de sudoku
  vive en el engine", y es lógica de sudoku de verdad: una app de escritorio la
  necesitaría igual y hoy tendría que reescribirla. Decidido no adelantarlo —
  misma regla que en 2.2-2.5: la abstracción se paga con el segundo consumidor.
  Señal a vigilar: si 3.3 (estado de victoria) o 4.1 necesitan la misma lectura,
  `findConflicts` sube al engine con su fixture y su test.
- 2026-08-04 (3.1): el agente ui-dev tiene prohibido tocar `packages/engine`, pero
  el primer consumidor real destapó que al paquete le faltaba `"sideEffects": false`
  y sin eso el solver de backtracking cruzaba al bundle del navegador. La regla
  del agente cubre la lógica; esto era empaquetado, y hubo que escalar a Pau.
  Señal a vigilar: si vuelve a pasar, la regla debería decir "no tocas el código
  del engine" en vez de "no tocas packages/engine", que también prohíbe su
  manifiesto. Verificación añadida al done de web: grep de `countSolutions` sobre
  `.next/static/` debe salir vacío — el mismo gesto que pedirá 5.4 con ANTHROPIC.