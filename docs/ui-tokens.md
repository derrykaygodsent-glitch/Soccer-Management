# Design tokens — the rules the rebuild runs on

**File:** `src/tokens.css` (loaded first, before every other stylesheet)
**Phase:** 0 · created 25 November 2026

Nothing in this file paints a screen by itself. It names the values the rest of the product is
allowed to use, so Phase 1 onward cannot drift.

---

## 1. The three rules

1. **New work uses `--ui-*`.** No raw hex, no ad-hoc font sizes, no new breakpoints.
2. **Old work follows.** `--tl-*` (clubhouse) and `--cc-*` (workspaces) are now *mapped* onto the
   tokens in their own files, so old rules and new rules resolve to the same palette.
3. **9 px is the floor.** 11 px is the minimum for anything a manager must read. 9 px exists only
   for glyphs, badges and metadata, and metadata is marked with `[data-tl-meta]`.

## 2. Colour

| Token | Value | Job |
|---|---|---|
| `--ui-surface-0` | `#0a111b` | backdrop behind everything |
| `--ui-surface-1` | `#0d141e` | page |
| `--ui-surface-2` | `#111925` | rail, header, sticky bars |
| `--ui-surface-3` | `#172230` | cards and panels |
| `--ui-surface-4` | `#202e3d` | raised: hover, selected, inputs |
| `--ui-surface-inset` | `#0b121a` | wells, table stripes |
| `--ui-edge` / `-soft` / `-strong` | `#2b3a4c` / `#22303f` / `#3a4c61` | three border strengths, no more |
| `--ui-ink` | `#f1f5fb` | headings |
| `--ui-ink-2` | `#d3deea` | strong body |
| `--ui-muted` | `#a6b3c5` | body (≈7:1 on a card) |
| `--ui-dim` | `#8193ab` | metadata (≈4.6:1 on a card) |
| `--ui-ghost` | `#6b7d94` | disabled only, never body text |
| `--ui-lime` | `#d7f889` | **the only "you can act" colour** |
| `--ui-ice` / `--ui-teal` / `--ui-amber` / `--ui-danger` | | secondary accents, warnings, danger |

**Lime is not decoration.** It marks state, focus and the next action. If a screen has lime in
three places, two of them are wrong.

## 3. Status — the one way state is shown

Every state is a chip with **words first**, then a deadline if there is one, then a colour:

```html
<span class="tl-status" data-tl-status="due"><small>3 days</small> Submit team sheet</span>
```

| `data-tl-status` | Means | Used for |
|---|---|---|
| `due` | time-boxed, will expire | deadlines, match sheets, bids |
| `next` | the recommended action right now | Continue targets, next fixture |
| `pending` | waiting on someone else | approvals, appeals, offers |
| `safe` | nothing to worry about | selection-safe players, healthy funds |
| `risk` | needs a decision | low condition, arrears, warnings |
| `locked` | cannot act yet | registration windows, gated features |
| `done` | completed and archived | filed sheets, answered mail |
| `optional` | available, not required | side activities, extras |

All eight pairs are ≥ 4.5:1 ink-on-background. The chip never carries meaning by colour alone.

## 4. Type ramp

| Token | Size | Use |
|---|---|---|
| `--ui-text-micro` | 9 px | glyphs, badge counts, star ratings |
| `--ui-text-meta` | 10.5 px | metadata — must carry `[data-tl-meta]` |
| `--ui-text-s` | 11.5 px | dense UI: tab labels, table heads |
| `--ui-text-m` | 12.5 px | table cells, list rows |
| `--ui-text-l` | 14 px | default body |
| `--ui-text-xl` | 17 px | page titles |
| `--ui-text-2xl` | 22 px | section heroes |
| `--ui-text-3xl` | 30 px | scores, display numerals |

Families: `--ui-font-ui` (Inter/system), `--ui-font-display` (Barlow Condensed), `--ui-font-numeric`.

Line heights: `--ui-leading-tight` 1.15, `--ui-leading` 1.45, `--ui-leading-loose` 1.6.

## 5. Spacing, shape, motion

- Spacing is a 4 px family: `2, 4, 6, 8, 10, 12, 16, 20, 26, 34`. No 13 px gaps.
- Radius: `4 / 7 / 10 / 13 / pill`. One radius per component tier.
- Motion: `120 / 165 / 220 ms`, one easing curve, and all three collapse to 0 under
  `prefers-reduced-motion`.
- Focus: `2px solid var(--ui-lime)`, offset `-2px`. Never removed, never restyled per screen.

## 6. What Phase 0 changed in the product

| Change | Detail |
|---|---|
| Token layer | new `src/tokens.css`, loaded first, ~90 tokens |
| Clubhouse palette | `--tl-*` now resolve to `--ui-*` (same values, one source) |
| Workspace palette | `.cc-workspace` / `.hc-dialog` surfaces, edges, ink and status moved from the purple-grey family onto the navy tokens; their identity accents (electric cyan, lime, purple data colours) were kept |
| Type floor | 587 declarations raised: 11 px for text, 9 px for glyphs; `<small>` can no longer fall below 9 px |
| Status component | `.tl-status` with eight states and a deadline slot — ready for Phase 1, not yet used on screens |
| Metadata hook | `[data-tl-meta]` / `.tl-meta` for the only text allowed at 10.5 px |
| Numeric alignment | `.tl-num` for tabular figures |

## 7. How the rules are enforced

| Check | Where |
|---|---|
| colour contrast, page overflow, table overflow, type floor | `scripts/ui-sweep.cjs` |
| the six markup contracts (page, status, list, table, action, nav) | `scripts/ui-contract.cjs` |
| what the stylesheets actually contain | `scripts/ui-inventory.cjs` |

`ui-contract.cjs` is the one that matters for drift: when a screen ships without a `page` anchor,
a `list` range or a `table` phone mode, it says so.
