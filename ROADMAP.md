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
- [x] 3.2 Modo notas, resaltado de fila/columna/caja, deshacer. Done: interacción completa.
- [x] 3.3 Nueva partida por dificultad + estado de victoria. Done: partida completa de principio a fin.

## Fase 4 — Hint y Explain (frontend)
- [x] 4.1 Botón Hint: engine detecta siguiente técnica, resaltar celdas del patrón sin revelar valores. Done: hint correcto sobre fixtures.
- [x] 4.2 Panel de explicación (UI only, con texto mock). Done: flujo visual completo sin API.

## Fase 5 — API /api/explain
- [x] 5.1 Route con validación + re-verificación de la detección en servidor. Done: rechaza detecciones inválidas.
- [x] 5.2 Prisma + Postgres: caché por hash de patrón. Done: segunda petición igual no llama fuera (test/log).
- [x] 5.3 Rate limit por sesión (cookie, 10/día, 429 amable). Done: petición 11 recibe 429.
- [x] 5.4 Integración Anthropic (claude-haiku-4-5, prompt del TASK). Done: explicación real en el panel; grep de ANTHROPIC en bundle cliente vacío.

## Fase 6 — Pulido y despliegue
- [x] 6.1 Diseño final coherente con paumiquel.com (oscuro, cyan, mono en números), mobile. Done: revisión visual.
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
- 2026-08-05 (riqueza asimétrica de payload): dos bugs factuales seguidos, el mismo
  patrón. El prompt exige evidencia ubicada ("cita la celda y la unidad"), pero el
  payload solo la traía en algunas técnicas: primero faltaba la relación geométrica de
  los bloqueos del hidden single, y al arreglarla salió que el naked single daba
  dígitos sueltos (`row: [1,5,6]`), que el modelo convirtió en celdas inventadas
  ("2 already at R2C1, R2C5, R2C6"). El modelo no mentía por su cuenta: rellenaba el
  hueco que el contrato dejaba abierto. Regla nueva, ya en CLAUDE.md: **el contrato de
  evidencia es uniforme, no por técnica** — si el prompt puede exigir un tipo de
  afirmación, el payload lo trae para las cuatro. Parchear técnica a técnica es
  whack-a-mole, y cada parche cuesta un `PROMPT_VERSION` y toda la caché.
  Corolario que se aplicó de paso: `blockerFor` (hidden single) y `witnessFor` (naked
  single) elegían testigo con reglas distintas; ahora comparten criterio, porque la
  frase que se escribe es la misma y dos reglas explicarían el mismo tablero de dos
  maneras según por dónde se pregunte.
- 2026-08-05 (riqueza asimétrica de payload): la revisión pedía comprobar si parte de
  la salida rota venía de caché vieja. No venía: las claves quedaron a la vista en la
  tabla (`v3:naked-single|cells=R2C4|…` junto a la `v4:` nueva), o sea que el bump del
  arreglo anterior sí se aplicó y lo que estaba mal era el payload v3, no una respuesta
  fósil. Efecto secundario visible: las filas de versiones anteriores se quedan ahí,
  inalcanzables. Señal a vigilar: si eso molesta, la caché quiere una columna de versión
  y un borrado por versión, no un prefijo en la clave.
- 2026-08-05 (probe:explain): la verificación pasa a ser una sonda ejecutable
  (`pnpm probe:explain`, `*.probe.ts` con su propia configuración de Vitest) que imprime
  las cuatro técnicas con su payload al lado de su explicación. Motivo: los dos bugs se
  vieron leyendo salidas reales, no ejecutando la suite — ninguna aserción sobre texto
  no determinista los habría cazado. Queda fuera de `pnpm test` porque cuesta cuatro
  llamadas reales (~0,004 $). Regla aplicada: lo que solo se detecta mirando, necesita
  una herramienta que te lo ponga delante para mirarlo.
- 2026-08-05 (explainData, previo al afinado de Explain): la spec llegó cerrada y la
  implementación contrapropuso tres cosas; la revisión decidió las tres. (1) La unidad
  del naked pair no viaja en la `Detection` y puede encajar en dos unidades a la vez
  (fila y caja): se pedía `throw`, se propuso desempate determinista, se resolvió
  distinguiendo los dos casos — empate resuelve por orden fila → columna → caja
  (sobredeterminación pedagógica, no error), ninguna unidad lanza (detección corrupta).
  (2) `blockedBy: Digit` perdía el dónde: pasó a ser una unión `occupied | peer`, que
  además obliga al modelo a escribir la frase correcta en cada caso en vez de adivinar.
  (3) El coste se aceptó tras medirlo. Patrón que conviene repetir: la spec propone, la
  implementación contrapropone con argumento, la revisión decide — las tres enmiendas
  salieron de mirar el código de los detectores, no de opinar sobre la spec.
- 2026-08-05 (explainData): la estimación de coste del plan (×8 tokens de entrada) era
  mala. Medido sobre el payload real: naked single 34 tokens, naked pair 51, pointing
  pair 89, hidden single 189 — frente a los ~40 del formato de tres líneas. El caso caro
  es el hidden single, que lista las 8 celdas bloqueadas con su motivo; los demás apenas
  se mueven. Con Haiku sigue siendo ~0,001 $ por explicación y lo absorbe la caché por
  `patternKey`. Señal a vigilar: el dato entra en la sección "Cost engineering" del
  README (6.2), y si la caché se versiona por payload habrá que decirlo ahí.
- 2026-08-04 (6.1): la tipografía se sacó del CSS compilado de paumiquel.com
  (`styles-253EOP2A.css`: DM Sans, JetBrains Mono, DM Serif Display, labels mono en
  versalitas con `tracking .2em`, borde zinc-800 con hover a cyan-400), no de mirar el
  sitio y aproximar. Los colores ya se habían copiado así en 3.1; lo que faltaba era
  todo lo demás. Diferencia deliberada con el original: aquí las fuentes las autohospeda
  `next/font` en vez de pedirlas a Google en cada visita. Regla aplicada: el sistema de
  diseño de un sitio existente se lee, no se recuerda — igual que los fixtures.
- 2026-08-04 (6.1): la serif entró y salió en la misma sesión. La revisión visual de Pau
  la descartó: un título editorial no encaja en una app de números, y con ella se fue la
  única razón para descargar una tercera familia. Señal de que la revisión visual del
  done no es un trámite — decidió una dependencia.
- 2026-08-04 (6.1): `justify-center-safe` en vez de `justify-center`. En móvil la partida
  entera no cabe en la pantalla, y centrar un contenido más alto que el hueco lo recorta
  por arriba dejando lo cortado fuera del alcance del scroll. Es un fallo que no aparece
  en el escritorio del que programa.
- 2026-08-04 (6.1): el resaltado de dígitos iguales usa `accent/70`, no `accent-deep`.
  Medido: `accent-deep` sobre el fondo da 3,6:1, por debajo del mínimo AA para un dígito
  de ~16 px en móvil; al 70% de opacidad sale 5,6:1. Pau pidió "el cyan más apagado" y
  esto lo cumple sin bajar del umbral. Regla aplicada: la misma que ya estaba anotada en
  `globals.css` para `ink-faint` — un color se elige midiendo el contraste, no mirándolo.
  Consecuencia de diseño: el cyan quedó en dos intensidades, apagado para "el mismo
  dígito" y pleno para el patrón de la pista.
- 2026-08-04 (5.4): al prompt no viaja el tablero. Solo la detección que el engine
  encontró y el servidor re-verificó: técnica, celdas, dígitos y conclusión. Motivo:
  sin los 81 caracteres delante, el modelo no puede resolver aunque quiera, y la regla
  "el LLM solo redacta" deja de depender de que el prompt lo pida amablemente. Hay un
  test que falla si el tablero se cuela en el prompt. Decisión de producto asociada: la
  explicación SÍ nombra dígitos —explicar un naked single sin decir el número no enseña
  nada—; el que calla el valor es el Hint de 4.1.
- 2026-08-04 (5.4): sin `ANTHROPIC_API_KEY`, o si la llamada falla, se responde el texto
  fijo de la técnica en vez de un error. La demo se puede levantar sin clave y un fallo
  de red no rompe una partida. Contrapartida que costó cara: ese mismo fallback fue lo
  que ocultó la fricción de abajo.
- 2026-08-04 (5.4): Next solo carga el `.env` del directorio de la app, y en este
  monorepo el `.env` vive en la raíz. Consecuencia: en `next dev` no existían ni
  `ANTHROPIC_API_KEY` ni `DATABASE_URL`, y la app se degradaba en silencio — explicación
  de reserva y caché caída, con `200 OK` y sin un solo error visible. Se detectó solo
  porque la verificación miraba el texto devuelto y no el código de estado. Arreglado
  cargando el `.env` de la raíz desde `next.config.ts` y `prisma.config.ts` (por eso
  hasta 5.3 había que pasarle `DATABASE_URL` a mano al CLI de Prisma en cada comando).
  Regla aplicada: cuando hay un fallback silencioso, verificar el contenido, nunca el
  código de estado — el fallback está diseñado para que el 200 no signifique nada.
- 2026-08-04 (5.4): calidad medida con tres llamadas reales (~0,003 $) sobre tres
  técnicas distintas. Los textos son correctos y citan solo celdas de la detección
  (naked single de R2C4, naked pair de 1/7 en R8C1-R9C2, pointing pair del 5 en la caja
  2). Señal a vigilar: no hay nada que compruebe automáticamente que el modelo no cita
  una celda inventada; si eso importa, el chequeo barato es un test que valide la
  respuesta contra `detection.cells` antes de guardarla en caché.
- 2026-08-04 (5.3): la cuota cuenta redacciones, no peticiones. Un acierto de caché no
  cuesta nada, así que no descuenta: el contador se toca justo antes de
  `writeExplanation`, que es donde 5.4 gasta dinero de verdad. Consecuencia visible:
  con la cuota agotada la app sigue explicando patrones ya vistos, y quien juega
  patrones comunes casi no consume. Señal: esta es la historia que cuenta la sección
  "Cost engineering" de 6.2 — caché primero, límite después, y el límite mide coste.
- 2026-08-04 (5.3): la cookie se lee de la cabecera y se escribe con `Set-Cookie` a
  mano, en vez de usar `cookies()` de `next/headers`. Motivo: `cookies()` exige el
  contexto de petición de Next y volvería la route imposible de probar llamándola como
  una función normal, que es como se prueban las 16 pruebas de este endpoint. Regla
  aplicada: entre dos APIs equivalentes, la que no ata el código al framework.
- 2026-08-04 (5.3): el test de las 11 peticiones falló al escribirlo, y el motivo no era
  el código: las semillas `easy` 0, 1, 2 y 3 caen en el mismo tablero (medido en 3.3),
  así que las "peticiones distintas" eran patrones repetidos que salían de caché sin
  gastar cuota. Arreglado deduplicando por `patternKey` y usando semillas medidas
  (0, 5, 6, 8). Regla aprendida: en cuanto hay caché, "peticiones distintas" deja de
  significar "coste distinto", y un test de límite necesita datos distintos de verdad.
- 2026-08-04 (5.2): Prisma 7 no es el Prisma que el agente creía saber. `url` está
  prohibido en el `datasource` del schema, la conexión entra por adaptador
  (`@prisma/adapter-pg`) desde el código, el CLI lee un `prisma.config.ts` que necesita
  `dotenv` explícito, y el generator por defecto (`prisma-client`) escribe el cliente
  en una carpeta del repo en vez de en `node_modules`. Se descubrió reventando, no
  leyendo. Regla aplicada, la misma que impone el AGENTS.md de Next 16: ante una
  dependencia con versión mayor reciente, la fuente es el paquete instalado (aquí,
  `prisma init` en un directorio de usar y tirar), nunca la memoria. Señal a vigilar:
  esa regla vive solo en `apps/web/AGENTS.md` y solo habla de Next.
- 2026-08-04 (5.2): tres decisiones pequeñas con su porqué. Una: la clave de caché es
  la `patternKey` tal cual, no un hash como decía el roadmap — ya es canónica, cabe en
  un índice y así la caché se lee con `psql` cuando algo salga raro (techo: si aparecen
  técnicas de cadena con claves largas, sha256). Dos: `db()` es una función perezosa y
  no un `const`, porque `next build` importa los módulos de las rutas sin base de datos
  delante y conectarse al importar reventaría la compilación. Tres: `upsert` y no
  `create` al guardar, porque dos peticiones simultáneas del mismo patrón entran las
  dos en el camino caro y la segunda no debe morir por clave duplicada.
- 2026-08-04 (5.2): el test de caché sustituye Postgres por un `Map` y cuenta llamadas a
  `writeExplanation`. Que Prisma guarde filas es cosa de Prisma; lo que el roadmap pide
  ("la segunda petición no llama fuera") se mide en el punto donde se paga. Lo real se
  comprobó a mano: dos `curl` idénticos dan `cached: false` y luego `cached: true`, con
  una sola fila en la tabla.
- 2026-08-04 (5.2): `pnpm db:up` no arranca en esta máquina: los puertos 5432 y 5433 ya
  los ocupan contenedores de otros proyectos de Pau. La migración y la verificación se
  hicieron contra un Postgres temporal en el 5434, borrado después. Señal a vigilar: el
  `docker-compose.yml` fija el 5432 sin escapatoria; si vuelve a estorbar, el puerto
  debería salir de una variable con 5432 por defecto.
- 2026-08-04 (5.1): del cliente solo viajan `puzzle` y `patternKey`; técnica y celdas
  se derivan de la detección que el servidor reencuentra con `detectAll`. Motivo: lo
  que no viaja no hay que validarlo, y la `patternKey` ya es canónica desde 2.1, así
  que comparar claves ES la re-verificación. Códigos: 400 cuando la forma está mal
  (JSON, tablero que no son 81 caracteres) y 422 cuando la forma está bien pero la
  detección no existe en ese tablero — la distinción importa porque en 5.4 solo el
  422 significa "alguien está manipulando el cliente". Validación escrita a mano con
  `unknown` + narrowing: 15 líneas frente a una dependencia de esquemas.
- 2026-08-04 (5.1): la route existe pero el panel todavía NO la llama. Cablearla ahora
  obligaría a inventar el manejo de errores dos veces, porque 5.3 añade el 429 y 5.4
  el texto real. Se cablea una sola vez, en 5.4. Señal a vigilar: hay dos piezas de
  fase 5 sin consumidor (esta route y su contrato); si 5.2 y 5.3 crecen igual, 5.4
  deja de ser un paso y pasa a ser una integración de tres.
- 2026-08-04 (5.1): para probar la route con `curl` hacía falta una `patternKey` real y
  el repo no sabe ejecutar TypeScript suelto (`node --experimental-strip-types` falla
  con imports del workspace). Salida: un test temporal de vitest dentro del engine que
  escribe el payload a disco — el mismo truco que la medición de 3.3. Señal a vigilar:
  tercera vez que hace falta ejecutar TS del engine fuera de un test; si vuelve a pasar,
  toca un script `pnpm --filter engine exec vitest run` estable o un `scripts/` propio.
- 2026-08-04 (4.2): el flujo es de dos pasos —Hint dice dónde mirar, Explain dice por
  qué— y no uno solo. Por producto (primero piensas, luego te lo cuentan) y por coste:
  en 5.4 el clic caro es el segundo, así que el rate limit de 5.3 cuenta Explains, no
  Hints. Consecuencia en el estado: `explain` es un campo aparte de `hint`, y lo apaga
  todo lo que invalida el patrón (escribir, deshacer, pedir otra pista).
- 2026-08-04 (4.2): los textos mock viven en un `Record<TechniqueId, ...>` en `copy.ts`
  y hay un test que recorre `TECHNIQUES` del engine. Motivo: sumar una técnica (X-wing,
  naked triple) tiene que romper en compilación y en test, no renderizar un panel a
  medias. Regla aplicada: cuando el engine y la UI comparten un enum, el tipo es el
  que obliga a actualizar los dos.
- 2026-08-04 (4.2): el panel se ha verificado por unidad (`explanationFor`, transiciones
  de estado) pero nadie ha hecho clic en Explain: el smoke test por HTTP solo ve el HTML
  del servidor, donde el panel todavía no existe. Señal a vigilar: es el segundo paso
  seguido en que la comprobación real queda en manos de Pau. Si 5.x añade más UI con
  estados, toca decidir si entra un render test (react-dom/server, sin dependencias
  nuevas) o se asume que la UI se prueba a mano.
- 2026-08-04 (4.1): la detección corre en el cliente, no en una route. El invariante
  de 5.1 ("la técnica que envía el cliente se re-verifica en servidor") ya daba por
  hecho que el cliente detecta; lo que había que comprobar era el empaquetado.
  Verificado sobre `.next/static`: `pointing-pair` sí viaja, `countSolutions` y
  `hasUniqueSolution` no. El `"sideEffects": false` que se añadió en 3.1 es lo que
  permite que entren los detectores sin arrastrar el solver. Señal a vigilar: ese
  grep deja de ser una formalidad — ahora el bundle importa media fase 2.
- 2026-08-04 (4.1): con un conflicto en el tablero, Hint se niega a detectar. Un
  dígito mal puesto envenena los candidatos y el detector señalaría un patrón que no
  existe: la pista sería una mentira con aspecto de lección. Señal a vigilar: 4.2 y
  5.1 tienen que heredar el mismo guard — no se explica una detección sobre un
  tablero en conflicto. El resaltado usa `outline` y no fondo ni `ring` porque los
  otros dos canales ya son "dónde estás" y "qué está mal".
- 2026-08-04 (4.1): tres ediciones seguidas fallaron por no encontrar el texto en
  `Game.tsx`. Causa: un espacio no separable (U+00A0) que el propio agente había
  escrito dentro de un `' '` en 3.1, invisible en el diff y en el editor. Se
  resolvió reescribiendo las líneas por número. Señal a vigilar: si vuelve a pasar,
  un hook de PreToolUse que rechace caracteres no ASCII invisibles en el código
  (el texto visible va en `copy.ts`, donde sí tienen sentido).
- 2026-08-04 (3.3): la partida vive en la URL (`?difficulty=hard&seed=12`) en vez de
  API route o pool pregenerado. Medido antes de elegir: `generate` cuesta 8–330 ms
  según nivel, asumible por navegación, así que la página pasa a dinámica y el
  solver se queda en servidor. Regalo: enlace compartible y recarga sin perder la
  partida. Detalle que costó una medición: el enlace usa la semilla *encontrada* + 1,
  no la pedida — pedir un nivel escaso avanza semillas, y `easy&seed=0`, `seed=1` y
  `seed=bogus` dan los tres el mismo tablero (el de la semilla 4). Regla aplicada:
  medir el coste antes de elegir la arquitectura, no después.
- 2026-08-04 (3.3): victoria = tablero lleno y sin conflictos, no comparación con la
  solución. El enunciado tiene solución única, así que basta — y la solución no baja
  al cliente, donde se leería del HTML. Señal a vigilar: 4.1 (hint) sí necesita saber
  el valor correcto; ahí habrá que decidir si viaja al cliente o se queda en servidor.
- 2026-08-04 (3.3): navegar entre dificultades cambiaba la prop pero no el tablero:
  `useReducer` inicializa una vez por montaje. Resuelto con `key` en `<Game>`. Fricción
  del arnés: ningún test lo habría cogido, porque el reducer es correcto — el fallo
  estaba en el ciclo de vida de React, que los tests de `lib/` no tocan.
- 2026-08-04 (3.3): Vitest entra en `apps/web`. Motivo: el done era "partida completa
  de principio a fin" y la victoria no se puede comprobar a mano sin resolver un
  sudoku entero; el test mete los 56 dígitos de la solución que el generador ya
  devuelve. Misma regla que con los fixtures de 1.2: lo verificable se construye con
  las herramientas del proyecto. `pnpm test` raíz pasa a `pnpm -r test`.
- 2026-08-04 (3.2): coste cero de engine. Las notas ya estaban modeladas desde 1.1
  (`Cell.candidates`, `toggleCandidate`, `setCandidates`) y el resaltado sale de
  `peersOf`, así que 3.2 fue tres commits de UI y ni una línea del engine — el
  contraste exacto con la grieta de `findConflicts` en 3.1: lo que el engine
  modeló pronto se cobra tarde, lo que no modeló se paga en la app.
- 2026-08-04 (3.2): `keyToAction` pasa de recibir `key: string` a un `KeyPress`
  ({key, ctrlKey, metaKey}) porque deshacer es Cmd/Ctrl+Z. Sigue siendo pura y
  sin tipos de React: el `KeyboardEvent` de React encaja estructuralmente.
- 2026-08-04 (3.2): el historial de deshacer guarda tableros enteros, no acciones
  inversas — 81 celdas congeladas por movimiento, irrelevante para una partida y
  la mitad de código. Techo conocido: si 3.3 o la fase 4 necesitan reproducir la
  partida (repetición, telemetría de qué técnica usó el jugador), el historial
  tendrá que pasar a acciones. No se adelanta: misma regla que en 2.2-2.5.
- 2026-08-04 (3.1): el agente ui-dev tiene prohibido tocar `packages/engine`, pero
  el primer consumidor real destapó que al paquete le faltaba `"sideEffects": false`
  y sin eso el solver de backtracking cruzaba al bundle del navegador. La regla
  del agente cubre la lógica; esto era empaquetado, y hubo que escalar a Pau.
  Señal a vigilar: si vuelve a pasar, la regla debería decir "no tocas el código
  del engine" en vez de "no tocas packages/engine", que también prohíbe su
  manifiesto. Verificación añadida al done de web: grep de `countSolutions` sobre
  `.next/static/` debe salir vacío — el mismo gesto que pedirá 5.4 con ANTHROPIC.