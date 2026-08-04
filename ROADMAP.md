# ROADMAP — Sudoku Trainer

Guía de construcción por fases. Cada paso es una sesión corta de Claude Code.
Forma de trabajo en CADA paso: (1) plan primero y esperar OK, (2) ejecutar,
(3) mostrar resumen de cambios, (4) verificar con el criterio de done, (5) commit.
Pasos pequeños, commits frecuentes. No avanzar de fase con el done anterior en rojo.

## Fase 1 — Engine: núcleo
- [x] 1.1 Modelo de tablero: tipos (Cell, Board, Candidate), notación R#C#, utilidades de unidades (fila/columna/caja). Done: tipos sin `any`, tests de utilidades en verde.
- [x] 1.2 Solver por backtracking + contador de soluciones. Done: resuelve fixtures conocidos, detecta multi-solución.
- [ ] 1.3 Generador con solución única. Rejilla completa aleatoria + retirada de pistas
      mientras `hasUniqueSolution` aguante, con semilla para reproducibilidad.
      Done: test de unicidad sobre N tableros generados.
      La calibración de dificultad NO va aquí: ver 2.6.

## Fase 2 — Engine: detección de técnicas (fixture-first)
- [ ] 2.1 Infraestructura de detección: interfaz Detector, resultado normalizado (técnica, celdas, candidatos, patrón para caché). Done: un detector dummy pasa por la interfaz.
- [ ] 2.2 Naked single. 2.3 Hidden single. 2.4 Naked pair. 2.5 Pointing pair.
      Cada una: fixture con tablero que la contiene → test → detector. Done: test en verde por técnica.
- [ ] 2.6 Dificultad del generador (segundo tiempo de 1.3): resolver el tablero generado
      aplicando solo detectores y clasificarlo por la técnica más avanzada que exige,
      no por número de huecos. Fácil = solo singles; media = hasta naked pair;
      difícil = necesita pointing pair. Si no se resuelve con los detectores, se descarta.
      Done: 3 dificultades, N tableros por dificultad, cada uno resoluble con las técnicas
      de su nivel y no con las del nivel anterior.

## Fase 3 — Web: tablero jugable
- [ ] 3.1 Componente de tablero: render, selección, entrada por teclado y clic. Done: jugable sin lógica de ayuda.
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