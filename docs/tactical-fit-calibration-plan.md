# Tactical squad-fit calibration plan

**Status:** Phase 1/3 preregistration, Phase 2/3 confirmatory execution/validation, and Phase 3/3 analysis are complete. Analysis found positive relevant-versus-control mean effects in many style/reputation cells, but none had a familywise interval entirely above the preregistered +1.0 xG practical target; results are heterogeneous and do not validate the fit proxy or 11.5/20 cutoff. Keep gameplay unchanged pending a separately designed follow-up. No deployment or gameplay changes are authorized by this plan.

## Question

Do the attributes used by each style-specific projected-XI fit score predict that a squad benefits more from playing that style than from matched control attributes, under the current match engine? Separately, does the numeric fit score discriminate between squads that gain and do not gain that benefit? A positive result would be evidence about this simulation and protocol, not proof about real football or league-table causality.

## Experimental design

1. **Freeze and identify the build.** Record the Git commit, Node version, match-engine/tactical-data files and a hash of the calibration script. Seed generation and all other match options must be deterministic. Do not change engine, player generation or proxy code during a run.
2. **Stratify instead of pooling.** Run each of the six styles (`press`, `counter`, `possession`, `direct`, `defend`, `attack`) separately. Use at least two roster-strength strata (club reputation 60 and 75) and multiple independently generated base squads per stratum. The exact XI, formation, fit score and changed attribute totals are recorded per base squad.
3. **Use matched attribute conditions.** For each base squad, create three copies with the same players, non-target attributes, club, opponent and tactics: (a) neutral/no boost, (b) +3 to each attribute in that style's current `FIT` list, (c) +3 to the fixed control bundle `throwing`, `throwPower`, `freeKicks`, `penalties` (none appears in a style `FIT` list). These are active set-piece/throw-in skills, not an inert placebo. Apply a cap at 20 in both boosted conditions and report realized increments. Apply boosts only to the projected XI's ten outfield players, matching the proxy's scope.
4. **Match paired fixtures.** For each base-squad/match-seed/condition, play against the same fixed neutral opponent squad with the same opponent tactic; the focal squad uses the target style's default tactics. Pair conditions on the same engine seed and venue. Balance home and away across the fixed seed blocks (venue alternates by base-seed index plus match-seed index); do not treat conditions or venue legs as independent observations.
5. **Frozen pilot schedule.** Use reputation strata 60 and 75, base-squad seeds `79,113`, and match seeds `4101,5102,6103,7104`. These seeds were screened only for proxy-score coverage, before match outcomes. At rep 60, the two base rosters straddle the gate for some styles (for example, pressing scores 10.97 and 11.18; direct scores 11.90 and 11.40); rep 75 rosters supply a stronger-squad comparison. Capture actual scores for every style/base/rep in the raw CSV. The schedule has eight paired base-squad/seed blocks per style/reputation stratum (four home, four away).
6. **Ensure exposure to the gate.** Before simulation, group all base squads by their unmodified proxy score (low <10.5, near-cutoff 10.5–12.5, high >12.5) and report the distribution. The frozen seeds are selected only on score coverage, never outcomes. If a style/reputation has no observations in a band, report that limitation rather than claiming calibration of that part of the threshold.
7. **Primary outcomes.** Team xG difference (focal squad xG minus opponent xG) is the primary continuous outcome; goal difference is a noisier secondary outcome. Also retain shots, shots on target, possession, and passes completed/attempted. Capture errors and incomplete matches; never silently drop them.
8. **Analysis.** Calculate within-pair relevant-minus-control and relevant-minus-neutral effects, separately by style, reputation stratum, and home/away. Report mean, median, standard deviation, paired bootstrap interval (resample base-squad/match-seed blocks), sample counts, and a zero-effect sensitivity check. The fixed pilot has only eight blocks per style/reputation, so label all estimates exploratory and do not use them to validate the cutoff. Show the raw per-block data and script so results can be reproduced.

## Phase 1/3 — preregistered confirmatory design

**Decision locked before the next match run:** define a smallest practically meaningful relevant-minus-control effect as **+1.0 xG-difference per match**. Smaller effects may exist and still matter; this study will not treat failing to detect less than 1.0 as evidence of no effect. Primary tests are the 18 style-by-reputation contrasts (six styles × reputation 50/60/75), two-sided family-wise alpha 0.05 by Bonferroni, 80% power.

The pilot's largest paired-block sample SD was 3.0754 (press, rep 75; only eight blocks). Using this as the planning SD gives `ceil(((z[1−0.05/(2×18)] + z[0.80]) × 3.0754 / 1.0)^2) = 139`; round up to **144 independent paired blocks per style/reputation cell**. Each block is a distinct generated base squad, match seed and venue; all three conditions share that block. At 18 cells this is 2,592 blocks × 3 conditions = **7,776 matches**. The pilot variance is uncertain, so after the first 36 blocks per cell, run a blinded variance-only re-estimation: increase the target if the maximum anonymous pairwise-contrast SD is above 3.0754, never decrease below 144, and do not inspect treatment direction/means for that decision.

Pre-outcome score quotas are fixed by the generated-roster screen: rep 50 gets 72 squads below 11.5 and 72 in [11.5, 12.5); rep 60 gets 72 in [11.5, 12.5) and 72 at/above 12.5; rep 75 gets 144 at/above 12.5. Across reps, this supplies all styles with below-gate, near-gate and high-fit squads, while preserving overlap around the gate at reps 50/60. The screen uses 2,000 deterministic roster seeds per reputation, selection order is hash-randomized from seed/style/band, and no match outcomes are involved. The resulting immutable seed/venue schedule is `docs/tactical-fit-calibration-manifest.json`; its selection code is `scripts/plan-tactical-fit-seeds.cjs`. The manifest records all 2,592 blocks and exact proxy scores. Frozen artifacts: selection-script SHA-256 `fc021c1bb6978fc3479739f1ecc645353da287753b80639fc214446f22a29cbc`; manifest SHA-256 `373bc37833a2e92b1f4682346b7715029390b5be7a247e2c34b0be2da7943ad4`.

The three conditions remain neutral, +3 to style-FIT attributes, and +3 to the fixed control bundle. The primary is relevant-minus-control xG-difference; relevant-minus-neutral and score-band trends are secondary. The target is deliberately conservative and long: based on the pilot's observed speed, expect multiple hours for the 7,776-match run. If that cost is not acceptable, reduce scope only by revising this preregistration before observing confirmatory outcomes—not by silently calling a smaller run decisive.

## Phase 2/3 — confirmatory run and validation (complete)

The frozen manifest ran in two shards with `scripts/run-tactical-fit-confirmatory.cjs`. Both shards finished successfully and wrote complete CSV, metadata, and checkpoint artifacts:

- Shard 0: 1,296/1,296 blocks; 3,888 rows (1,296 per condition).
- Shard 1: 1,296/1,296 blocks; 3,888 rows (1,296 per condition).
- Combined: all 2,592 manifest blocks and 7,776 matched records.

Structural validation passed for both shards. Checks verified the frozen manifest SHA-256, run/checkpoint source identities, metadata provenance, exact shard-to-manifest assignment, complete neutral/relevant/control triplets per block, no duplicate or cross-shard overlap, valid row structure/counts, and exact CSV-to-checkpoint consistency. No outcome estimates or treatment comparisons were computed during validation.

Artifacts: `docs/tactical-fit-confirmatory-shard{0,1}.csv`, `.meta.json`, and `.checkpoint.jsonl`. Phase 2 is complete. The preregistered Phase 3 analysis is recorded in `docs/tactical-fit-confirmatory-analysis.md`, with full machine-readable contrasts in `docs/tactical-fit-confirmatory-analysis.json` and a reproducible runner at `scripts/analyze-tactical-fit-confirmatory.cjs`. No gameplay source was changed.

## Phase 3/3 — confirmatory analysis (complete; no gameplay change)

The analysis used paired xG-difference contrasts (relevant FIT boost minus active control boost) within each base-squad/match-seed/venue block. It covered all 18 style-by-reputation cells, used a centered block bootstrap for two-sided p-values with Bonferroni family-wise correction, and reported family-wise percentile intervals. Relevant-minus-neutral, home/away, and score-band results are secondary and descriptive. An exact paired sign test with the same 18-test Bonferroni correction was included as a sensitivity check. Methods, results, coverage, and limitations are in `docs/tactical-fit-confirmatory-analysis.md`; executable analysis and machine-readable results are saved alongside it.

Fourteen of 18 primary bootstrap contrasts had Bonferroni-adjusted p < .05 and family-wise intervals excluding zero, but only eight passed the sign-test sensitivity check. **None** had a family-wise interval entirely above the preregistered +1.0 xG-difference practical target; nine intervals were entirely below that target. Effects varied by style/reputation, and score-band coverage is uneven across roster strength. This is evidence about the specified interventions in this simulator—not validation of the adoption proxy or 11.5 threshold. Keep gameplay and calibration parameters unchanged; any follow-up threshold or proxy study should be separately preregistered with broader overlapping score coverage.

## Minimum evidence before a gameplay change

A pilot verifies the harness and informs nuisance-variance planning; it cannot tune the cutoff. The frozen confirmatory sample must be completed with both venues balanced. If effects are heterogeneous, intervals include zero, or score bands do not show sensible ordering, retain the current provisional status and redesign rather than selecting favorable subsets. Only propose a style-specific threshold or proxy change after replicated, pre-specified results; add tests and a separate review before implementation.

## Paired pilot results (exploratory; not confirmatory)

The runner `scripts/calibrate-tactical-fit.cjs` completed **288 seeded matches**: 144 per reputation stratum, with six styles, two generated base squads, four match seeds, neutral/relevant/control treatments, and balanced venue assignments. There were no incomplete matches. A 12-match press/reputation-60 subset was rerun and its raw CSV was byte-identical, checking deterministic reproduction. Each style/reputation estimate has only eight paired base-squad/seed blocks (four home and four away); the 4,000-resample percentile intervals are unadjusted and must not be read as confirmatory, especially across 24 style-by-reputation contrasts.

Run environment: commit `a102a7a2d811db0d747c8f511722a0b14ca4a47f`, Node `v22.22.3`, runner SHA-256 `8e111ef3241978e5f1d499c43c50b3ea204f401eff340305337ea9a4cc799211`. Full settings and input-file hashes are in each JSON sidecar.

Raw data and sidecars:

- `docs/tactical-fit-calibration-pilot-rep60.csv` and `.meta.json`
- `docs/tactical-fit-calibration-pilot-rep75.csv` and `.meta.json`

Primary endpoint: focal squad xG difference (focal xG minus opponent xG); effects below are the difference in that endpoint for a relevant-attribute boost versus the comparator. Numbers are mean xG-difference effect (unadjusted paired 95% bootstrap interval), `n=8` blocks:

| Reputation | Style | Relevant − control | Relevant − neutral |
|---|---|---:|---:|
| 60 | Press | 0.72 [-1.22, 2.42] | 1.13 [-0.09, 2.32] |
| 60 | Counter | 0.19 [-0.52, 0.87] | 0.10 [-0.55, 0.80] |
| 60 | Possession | 0.75 [-0.24, 1.81] | 0.77 [-0.78, 2.18] |
| 60 | Direct | 0.43 [-0.13, 1.08] | 0.41 [-0.19, 1.11] |
| 60 | Defend | 0.19 [-0.29, 0.66] | 0.91 [0.33, 1.47] |
| 60 | Attack | 1.08 [-0.40, 2.56] | 1.15 [0.36, 2.08] |
| 75 | Press | 1.29 [-0.66, 3.20] | 2.14 [0.38, 4.18] |
| 75 | Counter | 0.00 [-1.20, 0.90] | 0.71 [-0.72, 2.14] |
| 75 | Possession | 1.54 [0.77, 2.30] | 2.26 [0.99, 3.70] |
| 75 | Direct | 0.05 [-0.42, 0.61] | 1.23 [0.70, 1.82] |
| 75 | Defend | 0.20 [-0.50, 0.95] | 0.67 [-0.41, 1.69] |
| 75 | Attack | 1.61 [0.56, 2.69] | 0.78 [-0.66, 2.65] |

Direction and apparent size vary by style, reputation, and comparator. Some intervals exclude zero, but that is not robust evidence here: blocks are few, comparisons are multiple, and the control boost is an active bundle of specialist attributes. Most relevant-minus-control intervals include zero. This neither validates all six proxies nor establishes a causal effect beyond these matched simulated fixtures.

**Gate coverage was inadequate for threshold calibration.** Only three of the 24 style/reputation/base-squad scores fell below 11.5 (both rep-60 press squads and one rep-60 direct squad); the rep-75 squads all scored above 12.5 except press (12.40 and 12.55). Thus the pilot does not test the cutoff broadly or support keeping/changing 11.5. Several style-specific score distributions barely approach the cutoff.

## Prior exploratory evidence (not confirmatory)

The earlier 5-seed relevant-versus-control runs were small and inconsistent. Mean xG-difference, relevant boost vs control boost, were:

| Reputation | Press | Counter | Possession | Direct | Defend | Attack |
|---|---:|---:|---:|---:|---:|---:|
| 75 | 2.04 vs 2.04 | 2.51 vs 1.43 | 1.92 vs 0.34 | 0.16 vs 1.57 | 0.78 vs 1.83 | 0.31 vs -0.50 |
| 60 | 0.34 vs 0.17 | -0.65 vs 0.77 | 0.08 vs -0.50 | -1.22 vs 0.37 | 0.52 vs 0.72 | -0.50 vs -0.63 |

These are noisy descriptive averages only: do not call them calibrated effects, infer causation beyond the simulated comparison, or conclude that the current attribute lists or 11.5 cutoff are valid. No product code should change solely on this evidence.
