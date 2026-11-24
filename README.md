# ΦGenesis

**Experience before language. Discovery before instruction. Intelligence without imitation.**

An experimental research project into language-free relational computation and the architecture of a computational being. This project does not claim consciousness, sentience, general intelligence, or freedom from human design assumptions. No LLM is required for experimental execution.

## Experiments

| ID | Research question |
|---|---|
| 001 | Hidden local rule discovery |
| 002 | Active investigation |
| 003 | Predictive abstraction (included in 002) |
| 004 | Transfer and negative transfer |
| 005 | Reusable symbols through grammar induction |
| 006 | Learned signaling and compositional transfer |
| 007 | Executable relational composition ([Φ007](docs/phi007.md)) |
| 008 | Bounded architecture selection ([Φ008](docs/phi008.md)) |
| 009 | Bounded constructive discovery ([Φ009](docs/phi009.md)) |
| 010 | Non-sovereign agency ([Φ010](docs/phi010.md)) |

## Run

Python 3.10+; NumPy for 001–004, 006, 008 and 009. From the repository root:

```sh
python -m pip install -r requirements.txt
python experiments/phi_genesis_001.py
python experiments/phi_genesis_002.py
python experiments/phi_genesis_004.py --output results/phi_genesis_004_results.json
python experiments/phi_genesis_005.py --output results/phi_genesis_005_results.json
python experiments/phi_genesis_006.py --output results/phi_genesis_006_results.json
python experiments/phi_genesis_007.py --output results/phi_genesis_007_results.json
python experiments/phi_genesis_008.py --output results/phi_genesis_008_results.json
python experiments/phi_genesis_009.py --output results/phi_genesis_009_results.json
python experiments/phi_genesis_010.py --output results/phi_genesis_010_results.json
python -m unittest discover -s tests -v
```

005 uses an eight-symbol alphabet, greedy pair substitution, a maximum of 24 rules and minimum-description-length selection among prefixes. Its first attempted design stopped at the first cost increase and learned zero rules. The revised search allows temporary increases. Across 90 seeds and 540 round trips, net estimated fixed-width bit savings (including dictionary/header) averaged 50.088% for familiar motif distributions, -47.999% for novel motifs and -42.257% for shuffled streams. The shuffled-source control learned no rules. These are estimated code lengths, not actual packed file sizes. The learner is not a new general-purpose language: the primitive alphabet, compression objective, search and environment are externally designed. The 24-rule cap was reached on every structured seed. No claim of optimum grammar. Future tests should include strong compression baselines, out-of-distribution detection, and independently learned protocols.

## 006: signaling

Two independently initialized tabular policies learn a signaling game from scalar success feedback. Their local attribute labels are independently permuted. One of nine attribute combinations is held out per trial. Both variants have nine possible messages: the factorized policy has two three-symbol slots, the holistic policy has one nine-symbol slot. Frozen greedy evaluation across 90 trials (one deterministic RNG stream) after 6,000 training rounds per trial yields 99.17% familiar and 96.67% held-out accuracy for the factorized policy; 96.39% and 0% for holistic; 11.16% and 10.74% for uniform random messages passed to the trained factorized receiver. Three factorized trials fail the held-out case. The factorization, reward and action space are supplied, not discovered; the two variants have different parameter counts and inductive biases. This tests compositional generalization to held-out combinations, not novel attributes, spontaneous syntax, or general intelligence. The holistic table has untrained rows for held-out inputs and never receives a reward for the held-out output. Stronger baselines and randomized factor assignments are future work. Summary is in results/phi_genesis_006_summary.json; full per-trial output can be regenerated.

## Genesis Field v0.1

First integrated runtime: `node runtime/cli.mjs test` or `node runtime/cli.mjs report` (Node 22). See [protocol, persistence and results](docs/genesis-field-v01.md). Integrates active discovery, audit, revisable memory and event replay; other capabilities are not yet integrated.

## Research constraints

Experiments are CPU-local, seeded, finite, and isolated from external systems. No runtime network access, self-deployment, secret access, or automatic promotion of architectural modifications. Record failed experiments, resource budgets and evaluation leakage. Use separate training and held-out observations; do not claim discoveries beyond the tested hypothesis family. Human and AI design choices are explicit and revisable.
