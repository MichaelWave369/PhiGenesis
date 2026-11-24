# Genesis Field v0.2 — Compositional memory

A separate schema-2 runtime preserves v0.1 compatibility by leaving the original files untouched. The learner operates over five binary inputs and 15 nonconstant monomials of degree one or two. A rule is the XOR of zero, one or two distinct monomials and a bias, giving 242 candidates. A monomial is executable bounded data (a bit mask), not arbitrary executable code. The candidate grammar, feature family, query policy and evaluation remain externally designed.

## Evidence protocol

Discovery inputs: all 16 bit vectors with Hamming weight at most two. The fixed 13-input audit distinguishes all 242 candidate rules, verified exhaustively in a regression check. Three remaining inputs (29,30,31) are untouched held-out tests. The oracle independently evaluates products of individual bits instead of the learner's bit-mask implementation. A remembered term restricts the initial search only: contradiction expands to the full family, retaining discovery observations but excluding audit observations from fitting. The new candidate is audited again. Accepted terms record source world and episode ID; a new episode invalidates the current world record until acceptance. Term provenance is historical, not proof of universal validity. No cross-world semantic alignment is inferred; all worlds share five input coordinates.

The initial exploratory eight-input audit was defective: among 90 trials, only 671/720 familiar and 650/720 novel test predictions were correct versus 720/720 for cold search. It missed some wrong hypotheses. This failure is not comparable directly to the corrected three-input test partition. The corrected audit was selected by exhaustive search for unique candidate signatures, not by inspecting held-out prediction outcomes. Thirteen was the smallest separating subset of the 16 high-weight inputs found by exhaustive enumeration. This is a targeted proof of identifiability inside the designed hypothesis family, not a claim of general out-of-distribution detection.

## Results

90 deterministic seeded trials with two source worlds, a held-out composition of familiar terms, and a composition with one novel term. Exact recovery: 180/180 sources, 90/90 familiar targets, 90/90 novel targets; 270/270 untouched test predictions in each target condition. All 90 novel targets required fallback. The single cubic control x0*x1*x2 was rejected in 90/90 runs; this is the same control function in every run, not 90 distinct unknown families. Replay matches 90/90. Query means (including all audits and re-audits): 46.8556 for both sources combined, 16.7111 familiar memory versus 22.0444 familiar cold, 25.4 novel memory versus 21.7444 novel cold. Familiar savings about 24.2%; novel memory costs about 16.8% more. Source cost is not included in the per-target comparison. If charging all source costs exclusively to familiar reuse at these sample means, about nine such targets would break even. No runtime/compute efficiency claim. Nine core regression checks executed; disk-level restart and report comparison added to CI.

## Run (Node 22, no packages)

    node runtime/cli-v02.mjs test
    node runtime/cli-v02.mjs report
    node runtime/cli-v02.mjs init field-v02.json w1
    node runtime/cli-v02.mjs step field-v02.json
    node runtime/cli-v02.mjs resume field-v02.json
    node runtime/cli-v02.mjs next field-v02.json w2
    node runtime/cli-v02.mjs resume field-v02.json
    node runtime/cli-v02.mjs next field-v02.json w3
    node runtime/cli-v02.mjs resume field-v02.json
    node runtime/cli-v02.mjs inspect field-v02.json

The CLI uses fixed demo worlds; the core API accepts bounded external observations. Checkpoints are canonical event logs replayed with schema validation, not authenticated. Single-writer local persistence via exclusive temp and rename is not a power-loss guarantee or concurrency protocol. Maximum 48 queries per episode and 8192 history events. No network, arbitrary code, deployment or autonomous mutation.

## Next

Version 0.3 should test independently initialized learners exchanging bounded structures, explicit provenance and verification in a shared numerical environment, including mismatched coordinate systems and negative transfer. v0.2 does not yet integrate all foundational experiments, invent operators, perform unbounded discovery, or establish general intelligence or sentience.
