# Genesis Field v0.3 — Verified peer exchange

This is a separate, bounded collaboration prototype using the v0.2 mathematical family and active-query strategy. Three in-process instances A, B and C have separate local histories and term libraries; each uses an independently generated permutation of the same five binary input coordinates. No LLM, network, arbitrary code execution, deployment or runtime mutation. It does not yet integrate v0.2 checkpoint persistence or implement separately running communicating processes.

## Protocol

A and B learn two source rules independently. Each source has two distinct quadratic terms and a binary bias. A canonical, size-bounded JSON packet contains a schema version, claimed sender, source world and executable rule as mathematical data. Five paired one-hot anchors per sender establish a coordinate permutation; each pair contains two endpoints. This is an externally provided calibration opportunity, not an independently invented communication protocol. The recipient checks shape, identity labels and the bijection, translates each term, and independently audits the received rule against source-world observations before adding it to its library. Thirteen fixed audit inputs uniquely distinguish all 242 permitted rules. Source, target and calibration access are provided by the simulator. Claimed sender labels are not authenticated. Untrusted or invalid oracle observations are outside this experiment's trust model.

C then learns six cross-source compositions (including two repeated supports with newly sampled biases) and one target containing a new term. Compare with an independent C that builds its own library from the same seven targets, and a cold learner that resets memory before each target. All target methods use the same query strategy and audit; no source truth is supplied to the learner. The simulator evaluates rules using arithmetic bit products, separate from the learner's bit-mask evaluator. Three untouched inputs per target test prediction; exact rule equality is also checked. Random seed values are deterministic, not a claim of statistically independent trials.

## Measured results

90 seeds, 180 source messages accepted, 630 target rules recovered exactly by each of the three methods, 1,890/1,890 held-out predictions for each. All 90 valid-shaped bias-flipped messages rejected without adding terms. An exhaustive check rejects all 241 incorrect rules for a fixed in-family source. A deliberately swapped coordinate map was rejected in 70/90 trials and a no-translation control in 86/90; remaining cases can represent equivalent rules under the supplied map, so passing a rule audit does not prove the map is globally correct. All 90 novel targets triggered full-family fallback. Seven executed regression checks passed.

Mean per seven-target sequence:

| Cost | Observations |
|---|---:|
| Source acquisition, both peers | 43.8444 |
| Calibration | 10 pairs / 20 endpoint observations |
| Receiver source-rule verification | 26 |
| Collaborative target learning | 129.4889 |
| Independent target learning with cumulative memory | 150.8667 |
| Independent cold target learning | 153.5889 |
| Collaboration incremental total (source learning treated as sunk) | 175.4889 |
| Collaboration fully charged total | 219.3333 |

The target-only saving versus cumulative independent learning is 14.17%; total collaboration is more expensive here even with source costs sunk. Mean wire size is 208.3778 ASCII bytes, including two canonical packets and serialized anchor arrays, excluding framing and other overhead. Observation costs are counts, not equivalent CPU time, bandwidth or wall-clock estimates. No break-even is demonstrated, and repeated use must be tested rather than extrapolating these savings indefinitely. All benchmark records are in results/genesis_field_v03.json.

## Reproduce

    node runtime/cli-v03.mjs test
    node runtime/cli-v03.mjs report

Node 22, no packages. CI repeats regression checks and compares all seeded records to the committed report.

## Limitations and next steps

Fixed permutation family, one-hot anchors, noiseless oracle, finite quadratic grammar and externally supplied sender/world identifiers. Separate histories are in-process and ephemeral, not durable or authenticated. The selector cannot discover arbitrary coordinate transformations or infer when collaboration is worth its cost. Future work: durable multi-instance checkpoints, independently observed alignment, calibrated uncertainty, bounded message validation, and cost-aware admission that can decline collaboration. No claim of general intelligence or consciousness.
