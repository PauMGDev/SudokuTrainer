# Sudoku Trainer

Monorepo pnpm. Entrenador de sudoku: el engine detecta técnicas, Claude (Haiku) las explica.
Es un proyecto de portfolio: la demo pública y la legibilidad del repo son el producto.

## Comandos
- `pnpm test` — tests del engine (Vitest). Ejecutar siempre tras tocar packages/engine.
- `pnpm --filter engine test <fichero>` — un solo archivo de tests.
- `pnpm dev` — apps/web en local.
- `pnpm build` — todos los workspaces.

## Invariantes de arquitectura
- `packages/engine` es TypeScript puro: PROHIBIDO importar React, Next, APIs de Node
  o cualquier dependencia de plataforma. Debe poder consumirse desde una futura app de escritorio.
- Toda la lógica de sudoku vive en el engine. El LLM solo redacta explicaciones:
  nunca resuelve, valida ni decide.
- `ANTHROPIC_API_KEY` existe solo en servidor. Nunca en código cliente ni en `NEXT_PUBLIC_*`.
- La técnica detectada que envía el cliente se re-verifica en servidor con el engine
  antes de llamar a la API.
- Contrato de evidencia uniforme: todo tipo de afirmación que el prompt pueda exigir
  tiene que existir en el payload de TODAS las técnicas, no de algunas. Si el prompt
  puede pedir "di en qué celda está y por qué unidad", entonces `explainData` da celda
  y unidad para cada técnica. Donde el payload calla, el modelo rellena — y rellena
  inventando. Parchear esto técnica a técnica es whack-a-mole: primero faltó la
  geometría de los bloqueos, luego la ubicación de los dígitos eliminados.

## Convenciones
- TypeScript strict. Prohibido `any`: usar `unknown` y narrowing.
- Copys de UI centralizados en `apps/web/src/copy.ts`. Sin strings hardcodeados en componentes.
- Celdas siempre en notación R#C# (R1C1 = esquina superior izquierda), en código y en prompts.
- Técnica nueva = fixture y test primero, detección después.
- Commits en Conventional Commits (feat/fix/test/docs/chore/refactor + scope),
  mensaje en inglés, imperativo, ≤72 caracteres el título. Cuerpo solo si el
  porqué no es obvio del diff.

## Cierre de tarea
- Nada está terminado sin `pnpm test` y `pnpm build` en verde.
