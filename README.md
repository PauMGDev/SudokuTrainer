# Sudoku Trainer

A sudoku that names the technique unlocking your next move, and explains it.

Most sudoku apps give you the answer. This one tells you *why* the answer is the
answer: the engine detects which technique applies to the board in front of you,
highlights the pattern without revealing the digit, and — if you ask — Claude
turns that detection into an explanation.

**The model never solves anything.** A TypeScript engine finds the technique, the
server re-verifies it, and Claude receives the finished argument and writes it up.
That split is the whole design, and everything below follows from it.

**Demo:** https://sudoku-trainer-mu.vercel.app

**Stack:** TypeScript · Next.js 16 · React 19 · Tailwind 4 · Prisma 7 + Postgres ·
Vitest · Anthropic SDK (Claude Haiku 4.5) · pnpm workspaces

## What it produces

The engine hands the model a finished argument — every digit that rules the cell
out, the cell that witnesses each one, and the unit they share:

```json
{"technique":"naked-single","cell":"R2C4","place":2,"eliminatedBy":[
  {"digit":1,"at":"R2C3","via":"row 2"},{"digit":3,"at":"R8C4","via":"column 4"},
  {"digit":4,"at":"R3C4","via":"column 4"},{"digit":5,"at":"R2C8","via":"row 2"},
  {"digit":6,"at":"R2C9","via":"row 2"},{"digit":7,"at":"R6C4","via":"column 4"},
  {"digit":8,"at":"R1C4","via":"column 4"},{"digit":9,"at":"R5C4","via":"column 4"}]}
```

> You can place 2 in R2C4 because it's the only candidate left for that cell.
> Row 2 already contains 1 (at R2C3), 5 (at R2C8), and 6 (at R2C9), while column 4
> already contains 3 (at R8C4), 4 (at R3C4), 7 (at R6C4), 8 (at R1C4), and 9 (at
> R5C4) — eliminating all digits except 2.

Every cell and every unit in that sentence came from the payload. The model has
no board to look at, which is the point: what it cannot see, it cannot invent.

## How a hint works

1. **Hint** — the engine looks at the current board and returns the simplest
   technique available (a naked single before a pointing pair: a good teacher
   starts with the easy one). The board highlights the pattern cells. No digits.
2. **Explain** — the client sends the board and the detection's canonical
   `patternKey` to `/api/explain`.
3. The route **re-detects with the engine** and rejects the request unless that
   exact pattern really exists on that board. A tampered client gets a 422.
4. The verified detection becomes a **pedagogical payload**: not just "naked
   single at R2C4", but every digit that rules the cell out, the cell that
   witnesses each one, and the unit they share.
5. Claude receives that payload as JSON and writes two or three sentences.
   The answer is cached by pattern, so the next player who meets the same pattern
   pays nothing.

## Architecture

```
packages/engine     Pure TypeScript. Board model, solver, generator,
                    technique detectors, pedagogical payload.
apps/web            Next.js app: board UI, /api/explain route, Prisma cache.
```

The engine has **no platform dependencies** — no React, no Next, no Node APIs. It
is consumed by the web app today and could be consumed by a desktop app tomorrow
without changing a line. Every piece of sudoku reasoning lives there; the app
renders and the model writes.

Two details worth knowing:

- **Cells are `R#C#` everywhere** — in the code, in the API, in the prompt, in the
  UI labels. One notation, no translation layers, no off-by-one arguments.
- **Puzzles come from a seed, not a database.** `/?difficulty=hard&seed=12` is a
  specific board: shareable, reproducible, and free to store.

## Cost engineering

The interesting constraint of an LLM feature is not whether it works, but what it
costs when it does. Measured numbers, not estimates:

| Technique | Payload sent to the model |
| --- | --- |
| naked pair | ≈ 39 tokens |
| pointing pair | ≈ 66 tokens |
| naked single | ≈ 97 tokens |
| hidden single | ≈ 171 tokens |

At Claude Haiku 4.5 pricing that is **~$0.001 per explanation** — and most
explanations are never paid for at all:

- **Cache by pattern, not by board.** The cache key is the engine's canonical
  `patternKey`, so two players meeting the same naked pair on different boards
  share one entry. It carries a `PROMPT_VERSION` prefix: when the payload or the
  prompt changes, old entries stop being served instead of quietly outliving the
  bug that produced them.
- **The daily limit counts writes, not requests.** A cache hit costs nothing, so
  it does not consume quota — a player who keeps meeting familiar patterns can
  play all day. The limit protects the expensive path only.
- **Two limits, because one of them is a cookie.** The per-session limit orders
  normal use; a global daily cap (`EXPLAIN_DAILY_TOTAL`) is what actually bounds
  the bill, since an anonymous session is a cookie and a cookie can be deleted.
  Past the cap the board keeps working and the commentary stops.
- **Degrade, never break.** No API key, a failed call, or an empty response falls
  back to a fixed description of the technique. The explanation gets worse; the
  game keeps working.

The same discipline shows up in the board: the client never receives the solution,
and the solver never reaches the browser bundle (`countSolutions` is absent from
`.next/static` — a check that runs on every build).

## Deploying

The app is a pnpm workspace: the Vercel project's **Root Directory** is
`apps/web`, so the install runs at the repo root and the workspace dependency on
`packages/engine` resolves. Three variables, all server-side:

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | injected by the Neon integration (Vercel Marketplace) |
| `ANTHROPIC_API_KEY` | yours — never prefixed with `NEXT_PUBLIC_` |
| `EXPLAIN_DAILY_TOTAL` | the global spend cap for the deployment |

Migrations are applied by hand against the **direct** (unpooled) connection
string, not during the build: a build that mutates the database is a build you
cannot re-run safely.

```bash
vercel env pull .env.production --environment=production
DATABASE_URL="$DATABASE_URL_UNPOOLED" pnpm --filter web exec prisma migrate deploy
```

## Running it locally

Requires Node 20+, pnpm and Docker.

```bash
pnpm install
cp .env.example .env      # add your ANTHROPIC_API_KEY; it is server-only
pnpm db:up                # Postgres in Docker (POSTGRES_PORT if 5432 is taken)
pnpm db:migrate
pnpm dev                  # http://localhost:3000
```

Without an `ANTHROPIC_API_KEY` everything works except the model's prose: you get
the fixed description of each technique instead.

```bash
pnpm test                 # 216 tests, engine + web. No API calls, no database
pnpm build
pnpm probe:explain        # four real Claude calls (~$0.004): payload + output,
                          # side by side, for reading the explanations yourself
```

Every technique was written fixture-first: a board that contains the pattern, a
test with the expected cells written out by hand, and only then the detector.
Boards that needed verifying were built with the project's own solver rather than
typed from memory — the first hand-written 17-clue fixture turned out to have no
unique solution, which is exactly the kind of thing you find out the hard way.

`pnpm probe:explain` is a tool, not a test. Two factual bugs in the explanations
were found by reading its output — the model inventing the geometry of a block,
then inventing the location of an eliminated digit — and neither would have been
caught by asserting on non-deterministic prose.

## Decisions

`ROADMAP.md` (in Spanish) is the working log: what was decided, what was measured
before deciding it, and what went wrong. Why difficulty is measured by the
technique a board requires instead of by how many clues it has. Why the daily
limit counts writes. Why the evidence contract has to be uniform across
techniques — and what the model made up when it wasn't.
