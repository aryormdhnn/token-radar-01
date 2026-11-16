# Token Radar — token-radar-01

[![token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/c/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/aryormdhnn/token-radar-01/rank.svg)](https://make.fun/c/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/aryormdhnn/token-radar-01/reward.svg)](https://make.fun/c/token-radar-01)

An entry for [make.fun's "Best token launch radar" competition](https://make.fun/c/token-radar-01).

Every pre-token protocol in the sealed DefiLlama snapshot, ranked by what its
token would be worth — and what to do to farm it before it launches. The
board covers all 40 watchlist protocols plus 163 early finds below the
watchlist floor, and the dashboard sets the 24 already-launched protocols
aside with their market values instead of a model claim.

## The model — radar-2

Implied value follows only from the snapshot's own figures, the same function
for every protocol, no name ever special-cased:

```
implied = TVL × 0.30 × growth × maturity × reach
growth   = 1 + clamp(change_7d, -80%, +200%) × 0.8
maturity = 0.5 + min(age_days, 1460) / 1460 × 0.5
reach    = 1 + min(chains, 8) × 0.02
```

TVL is the size of the economy a token would price. Growth is momentum: a
protocol gaining TVL fast is where attention and future snapshots
concentrate. Age is track record: a protocol that ran for years with no token
has a real user base. Chain breadth is reach. Each row carries its own
breakdown, and the dashboard's detail view shows the maths step by step.

Farm plans are generated from each protocol's own record — category, chains,
TVL, age — six steps each, with what it costs and how long it takes.

## How it works

`main.ts` (Node 22, standard library only) reads the sealed snapshot, scores
the board with `lib/model.ts`, and writes the outputs. Deterministic: no
clock, no randomness, no network.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
# writes out/board.json, out/data.js, out/dashboard/, out/screenshots/ and out/dossier.json
```

## Files

- `main.ts` — the entrypoint
- `lib/model.ts` — the radar-2 model, the farm plans, the board validation
- `dashboard/` — the page: `index.html`, `app.css`, `app.js` (sortable, filterable, detail view; no network)
- `screenshots/` — the board, a protocol's detail view, and a filtered view
- `vendor/makefun-board.ts` — the kit's dossier library, unchanged
- `LICENSE` — MIT
