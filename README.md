# Sudoku Trainer

A sudoku that names the technique unlocking your next move, and explains it.

Most sudoku apps give you the answer. This one tells you *why* the answer is the
answer: the engine detects which technique applies to the board in front of you,
highlights the pattern without revealing the digit, and — if you ask — Claude
turns that detection into an explanation.

**The model never solves anything.** A TypeScript engine finds the technique, the
server re-verifies it, and Claude receives the finished argument and writes it up.
That split is the whole design, and everything below follows from it.

**Demo:** _pending deploy_

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
pnpm test                 # engine + web (no API calls, no database)
pnpm build
pnpm probe:explain        # four real Claude calls (~$0.004): payload + output,
                          # side by side, for reading the explanations yourself
```

That last one is a tool, not a test. Two factual bugs in the explanations were
found by reading its output — a model inventing the geometry of a block, and
inventing the location of an eliminated digit — and neither would have been
caught by asserting on non-deterministic prose.

## Decisions

`ROADMAP.md` carries a running log of the decisions, measurements and dead ends
behind each step: why difficulty is measured by required technique instead of
clue count, why the daily limit counts writes, why the evidence contract has to
be uniform across techniques. It is the honest version of this README.
