# Confirmatory Tactical Squad-Fit Analysis

**Status:** Phase 3 analysis completed on the validated frozen confirmatory data. This is a simulation-specific evaluation; it does not justify a gameplay change by itself.

## Design and analysis

- Frozen manifest SHA-256: 373bc37833a2e92b1f4682346b7715029390b5be7a247e2c34b0be2da7943ad4; **2,592 paired blocks / 7,776 matches**, all included.
- Primary endpoint: focal-team xG difference (focal xG minus opponent xG). Primary contrast: **relevant-FIT attribute boost minus active control-attribute boost**, paired within base-squad / match-seed / venue block.
- There are 18 primary style-by-reputation contrasts (six styles × reps 50, 60, 75), each n=144 paired blocks, balanced 72 home / 72 away. Family-wise alpha is 0.05 with Bonferroni correction across 18 tests (per-test alpha 0.0027778).
- Primary p-values use a two-sided centered block bootstrap under a zero-mean null, with a plus-one correction; primary intervals are percentile paired-block bootstrap intervals at family-wise coverage 1 − 0.05/18. Replicates: 100,000 per primary cell. A paired exact sign test, Bonferroni adjusted across 18, is a direction/zero-effect sensitivity check. Paired t-test p-values are retained in the JSON as a supplementary parametric check, not the decision metric. The preregistered smallest practically meaningful effect is **+1.0 xG-difference per match**.
- Relevant-minus-neutral, home/away splits, and score-band splits are secondary/descriptive and are not used to claim confirmatory significance. Secondary bootstrap intervals are nominal 95%.
- Provenance and full cell-level output are in [tactical-fit-confirmatory-analysis.json](tactical-fit-confirmatory-analysis.json). Analysis script: [analyze-tactical-fit-confirmatory.cjs](../scripts/analyze-tactical-fit-confirmatory.cjs).

## Primary confirmatory results

Effect is relevant minus control in xG-difference per match. Familywise intervals account for the 18 primary contrasts. Bootstrap p is unadjusted; Bonferroni p is the familywise-adjusted value. The sign-test p is already Bonferroni adjusted.

| Rep | Style | Blocks | Home/Away | Mean effect | Familywise 99.72% CI | Bootstrap p | Bonferroni p | Sign-test p adj. | vs +1.0 MDE |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 50 | press | 144 | 72/72 | 0.723 | [0.267, 1.187] | <0.0001 | 0.0004 | 0.2767 | no |
| 50 | counter | 144 | 72/72 | 0.409 | [0.109, 0.706] | <0.0001 | 0.0009 | 0.1718 | upper CI < 1 |
| 50 | possession | 144 | 72/72 | 0.821 | [0.391, 1.275] | <0.0001 | 0.0002 | <0.0001 | no |
| 50 | direct | 144 | 72/72 | 0.155 | [-0.154, 0.473] | 0.1390 | 1.0000 | 1.0000 | upper CI < 1 |
| 50 | defend | 144 | 72/72 | 0.177 | [-0.103, 0.464] | 0.0606 | 1.0000 | 1.0000 | upper CI < 1 |
| 50 | attack | 144 | 72/72 | 1.115 | [0.691, 1.577] | <0.0001 | 0.0002 | <0.0001 | no |
| 60 | press | 144 | 72/72 | 0.708 | [0.218, 1.193] | <0.0001 | 0.0002 | 0.0611 | no |
| 60 | counter | 144 | 72/72 | 0.365 | [0.030, 0.703] | 0.0010 | 0.0184 | 0.0350 | upper CI < 1 |
| 60 | possession | 144 | 72/72 | 1.205 | [0.727, 1.685] | <0.0001 | 0.0002 | <0.0001 | no |
| 60 | direct | 144 | 72/72 | 0.235 | [-0.065, 0.537] | 0.0189 | 0.3398 | 1.0000 | upper CI < 1 |
| 60 | defend | 144 | 72/72 | 0.306 | [0.019, 0.602] | 0.0017 | 0.0310 | 0.4340 | upper CI < 1 |
| 60 | attack | 144 | 72/72 | 0.739 | [0.318, 1.159] | <0.0001 | 0.0002 | 0.0105 | no |
| 75 | press | 144 | 72/72 | 1.142 | [0.615, 1.659] | <0.0001 | 0.0002 | <0.0001 | no |
| 75 | counter | 144 | 72/72 | 0.071 | [-0.292, 0.424] | 0.5552 | 1.0000 | 1.0000 | upper CI < 1 |
| 75 | possession | 144 | 72/72 | 1.204 | [0.694, 1.739] | <0.0001 | 0.0002 | <0.0001 | no |
| 75 | direct | 144 | 72/72 | 0.388 | [0.076, 0.703] | 0.0003 | 0.0052 | 0.4340 | upper CI < 1 |
| 75 | defend | 144 | 72/72 | 0.338 | [0.016, 0.652] | 0.0014 | 0.0257 | 0.0611 | upper CI < 1 |
| 75 | attack | 144 | 72/72 | 1.366 | [0.903, 1.839] | <0.0001 | 0.0002 | <0.0001 | no |

**Across the 18 primary contrasts:** 14 have bootstrap Bonferroni p < .05; 14 familywise bootstrap intervals exclude zero; 8 pass the Bonferroni sign-test sensitivity; 0 have a familywise interval entirely above +1.0; 9 have an interval entirely below +1.0. An interval crossing zero is inconclusive, not evidence of no effect. An interval entirely below +1.0 does not establish that the true effect is zero; it only places the interval below the preregistered practical target.

## Secondary: relevant versus neutral

These nominal 95% intervals are descriptive; no multiple-testing adjustment is applied.

| Rep | Style | Blocks | Mean effect | 95% paired-bootstrap CI |
| :-- | :-- | :-- | :-- | :-- |
| 50 | press | 144 | 0.820 | [0.533, 1.112] |
| 50 | counter | 144 | 0.373 | [0.173, 0.569] |
| 50 | possession | 144 | 0.833 | [0.541, 1.127] |
| 50 | direct | 144 | 0.164 | [-0.030, 0.361] |
| 50 | defend | 144 | 0.197 | [0.019, 0.377] |
| 50 | attack | 144 | 0.809 | [0.543, 1.085] |
| 60 | press | 144 | 0.660 | [0.327, 0.993] |
| 60 | counter | 144 | 0.248 | [0.007, 0.487] |
| 60 | possession | 144 | 0.889 | [0.578, 1.203] |
| 60 | direct | 144 | 0.235 | [0.049, 0.421] |
| 60 | defend | 144 | 0.375 | [0.185, 0.571] |
| 60 | attack | 144 | 0.893 | [0.633, 1.157] |
| 75 | press | 144 | 0.923 | [0.564, 1.277] |
| 75 | counter | 144 | 0.302 | [0.096, 0.508] |
| 75 | possession | 144 | 1.330 | [0.952, 1.712] |
| 75 | direct | 144 | 0.225 | [0.015, 0.438] |
| 75 | defend | 144 | 0.304 | [0.100, 0.507] |
| 75 | attack | 144 | 1.166 | [0.842, 1.496] |

## Venue sensitivity: relevant minus control

Home/away subgroup intervals are nominal 95% and descriptive. The design balances venues overall; these splits have half the primary sample size.

| Rep | Style | Venue | Blocks | Mean effect | 95% paired-bootstrap CI |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 50 | press | home | 72 | 0.701 | [0.226, 1.185] |
| 50 | press | away | 72 | 0.746 | [0.396, 1.105] |
| 50 | counter | home | 72 | 0.477 | [0.183, 0.763] |
| 50 | counter | away | 72 | 0.341 | [0.081, 0.602] |
| 50 | possession | home | 72 | 0.841 | [0.426, 1.260] |
| 50 | possession | away | 72 | 0.800 | [0.409, 1.203] |
| 50 | direct | home | 72 | 0.236 | [-0.047, 0.524] |
| 50 | direct | away | 72 | 0.074 | [-0.212, 0.365] |
| 50 | defend | home | 72 | 0.047 | [-0.203, 0.301] |
| 50 | defend | away | 72 | 0.308 | [0.044, 0.577] |
| 50 | attack | home | 72 | 0.989 | [0.560, 1.459] |
| 50 | attack | away | 72 | 1.241 | [0.872, 1.630] |
| 60 | press | home | 72 | 0.725 | [0.290, 1.153] |
| 60 | press | away | 72 | 0.691 | [0.224, 1.152] |
| 60 | counter | home | 72 | 0.391 | [0.069, 0.719] |
| 60 | counter | away | 72 | 0.339 | [0.044, 0.632] |
| 60 | possession | home | 72 | 1.339 | [0.928, 1.744] |
| 60 | possession | away | 72 | 1.071 | [0.599, 1.552] |
| 60 | direct | home | 72 | 0.258 | [0.006, 0.519] |
| 60 | direct | away | 72 | 0.212 | [-0.081, 0.498] |
| 60 | defend | home | 72 | 0.270 | [0.000, 0.546] |
| 60 | defend | away | 72 | 0.343 | [0.080, 0.607] |
| 60 | attack | home | 72 | 0.610 | [0.214, 1.013] |
| 60 | attack | away | 72 | 0.868 | [0.494, 1.245] |
| 75 | press | home | 72 | 1.394 | [0.924, 1.867] |
| 75 | press | away | 72 | 0.890 | [0.395, 1.370] |
| 75 | counter | home | 72 | 0.361 | [0.071, 0.645] |
| 75 | counter | away | 72 | -0.220 | [-0.578, 0.140] |
| 75 | possession | home | 72 | 1.202 | [0.778, 1.638] |
| 75 | possession | away | 72 | 1.206 | [0.675, 1.750] |
| 75 | direct | home | 72 | 0.377 | [0.068, 0.689] |
| 75 | direct | away | 72 | 0.399 | [0.122, 0.671] |
| 75 | defend | home | 72 | 0.298 | [0.035, 0.563] |
| 75 | defend | away | 72 | 0.378 | [0.055, 0.694] |
| 75 | attack | home | 72 | 1.363 | [0.945, 1.775] |
| 75 | attack | away | 72 | 1.369 | [0.903, 1.843] |

## Score-band exploration

These are within-reputation/style descriptive estimates; they do not constitute a separately powered or multiplicity-adjusted threshold test.

| Rep | Style | Pre-outcome score band | Blocks | Mean effect | 95% paired-bootstrap CI |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 50 | press | near-11.5 | 72 | 0.693 | [0.295, 1.107] |
| 50 | press | below-11.5 | 72 | 0.754 | [0.320, 1.196] |
| 50 | counter | below-11.5 | 72 | 0.531 | [0.269, 0.795] |
| 50 | counter | near-11.5 | 72 | 0.287 | [-0.007, 0.575] |
| 50 | possession | near-11.5 | 72 | 1.117 | [0.677, 1.570] |
| 50 | possession | below-11.5 | 72 | 0.525 | [0.183, 0.862] |
| 50 | direct | near-11.5 | 72 | 0.012 | [-0.298, 0.321] |
| 50 | direct | below-11.5 | 72 | 0.299 | [0.036, 0.566] |
| 50 | defend | near-11.5 | 72 | 0.311 | [0.042, 0.585] |
| 50 | defend | below-11.5 | 72 | 0.044 | [-0.207, 0.298] |
| 50 | attack | near-11.5 | 72 | 0.972 | [0.616, 1.340] |
| 50 | attack | below-11.5 | 72 | 1.257 | [0.822, 1.736] |
| 60 | press | high-12.5-plus | 72 | 0.489 | [0.047, 0.911] |
| 60 | press | near-11.5 | 72 | 0.928 | [0.472, 1.382] |
| 60 | counter | high-12.5-plus | 72 | 0.251 | [-0.039, 0.535] |
| 60 | counter | near-11.5 | 72 | 0.478 | [0.152, 0.806] |
| 60 | possession | near-11.5 | 72 | 1.129 | [0.710, 1.552] |
| 60 | possession | high-12.5-plus | 72 | 1.281 | [0.824, 1.737] |
| 60 | direct | near-11.5 | 72 | 0.295 | [0.034, 0.557] |
| 60 | direct | high-12.5-plus | 72 | 0.175 | [-0.109, 0.464] |
| 60 | defend | high-12.5-plus | 72 | 0.302 | [0.040, 0.576] |
| 60 | defend | near-11.5 | 72 | 0.311 | [0.047, 0.578] |
| 60 | attack | high-12.5-plus | 72 | 0.732 | [0.329, 1.142] |
| 60 | attack | near-11.5 | 72 | 0.746 | [0.382, 1.121] |
| 75 | press | high-12.5-plus | 144 | 1.142 | [0.799, 1.480] |
| 75 | counter | high-12.5-plus | 144 | 0.071 | [-0.166, 0.305] |
| 75 | possession | high-12.5-plus | 144 | 1.204 | [0.867, 1.554] |
| 75 | direct | high-12.5-plus | 144 | 0.388 | [0.181, 0.596] |
| 75 | defend | high-12.5-plus | 144 | 0.338 | [0.130, 0.547] |
| 75 | attack | high-12.5-plus | 144 | 1.366 | [1.057, 1.677] |

### Frozen score coverage

| Rep / score band | Neutral rows / blocks | Styles represented | Proxy-score range |
| :-- | :-- | :-- | :-- |
| 50/below-11.5 | 432 | 6 | 10.60–11.47 |
| 50/near-11.5 | 432 | 6 | 11.50–12.32 |
| 60/high-12.5-plus | 432 | 6 | 12.50–13.47 |
| 60/near-11.5 | 432 | 6 | 11.55–12.47 |
| 75/high-12.5-plus | 864 | 6 | 12.65–14.82 |

## Interpretation and decision

The confirmatory contrasts estimate the effect of the simulated attribute interventions for these frozen rosters, seeds, match engine and default tactics. They do **not** prove that style-fit attributes cause better real-football performance, that league fashions cause success, or that a gate predicts manager adoption outcomes. The active control bundle is a comparator, not an inert placebo. The score-band results are exploratory, with uneven coverage across reputation strata; do not pool them as if roster strength were randomized across bands.

**Decision:** keep all gameplay, fit attributes and the 11.5/20 cutoff unchanged for now. Review the full contrast pattern and uncertainty before proposing any follow-up; any threshold change should be separately preregistered and tested with broader overlapping score coverage. No gameplay source was changed by this analysis.

## Reproduction

Run node scripts/analyze-tactical-fit-confirmatory.cjs (optional --bootstrap=100000; default is 100,000 primary and 25,000 secondary replicates). The script verifies the frozen manifest, shard metadata, checkpoint identities, row counts, paired structure and relevant/control attribute bundles before calculating estimates.
