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
| 006 | Independent communication (planned) |
| 007 | Executable relational composition (planned) |
| 008 | Bounded architecture comparison (planned) |
| 009 | Open-ended discovery (planned) |

## Run

Python 3.10+; NumPy for 001–004 only. From the repository root:

```sh
python -m pip install -r requirements.txt
python experiments/phi_genesis_001.py
python experiments/phi_genesis_002.py
python experiments/phi_genesis_004.py --output results/phi_genesis_004_results.json
python experiments/phi_genesis_005.py --output results/phi_genesis_005_results.json
python -m unittest discover -s tests -v
```

005 uses an eight-symbol alphabet, greedy pair substitution, a maximum of 24 rules and minimum-description-length selection among prefixes. Its first attempted design stopped at the first cost increase and learned zero rules. The revised search allows temporary increases. Across 90 seeds and 540 round trips, net estimated fixed-width bit savings (including dictionary/header) averaged 50.088% for familiar motif distributions, -47.999% for novel motifs and -42.257% for shuffled streams. The shuffled-source control learned no rules. These are estimated code lengths, not actual packed file sizes. The learner is not a new general-purpose language: the primitive alphabet, compression objective, search and environment are externally designed. The 24-rule cap was reached on every structured seed. No claim of optimum grammar. Future tests should include strong compression baselines, out-of-distribution detection, and independently learned protocols.

## Research constraints

Experiments are CPU-local, seeded, finite, and isolated from external systems. No runtime network access, self-deployment, secret access, or automatic promotion of architectural modifications. Record failed experiments, resource budgets and evaluation leakage. Use separate training and held-out observations; do not claim discoveries beyond the tested hypothesis family. Human and AI design choices are explicit and revisable.
