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

## Convenciones
- TypeScript strict. Prohibido `any`: usar `unknown` y narrowing.
- Copys de UI centralizados en `apps/web/src/copy.ts`. Sin strings hardcodeados en componentes.
- Celdas siempre en notación R#C# (R1C1 = esquina superior izquierda), en código y en prompts.
- Técnica nueva = fixture y test primero, detección después.

## Cierre de tarea
- Nada está terminado sin `pnpm test` y `pnpm build` en verde.
