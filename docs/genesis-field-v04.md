# Genesis Field v0.4 — Cost-aware discovery

The v0.3 experiment found that target-query savings did not cover the overhead of collaboration. v0.4 uses the actual v0.3 finite learners and packet validation to compare strategies and choose among them. This is a batch-level empirical cost selector, not a new cognitive architecture or general optimizer.

## Protocol

Three strategies start with an empty recipient library: cold (fresh discovery per target), memory (cumulative library across the batch), peer (sender learns whole target rules, then recipient translates and audits each offered rule, with local-memory fallback on rejection). This differs from v0.3's two source rules used to compose different targets: here the peer offers a rule for the target itself. One five-pair calibration per batch costs ten endpoint observations; each source-rule audit and fallback query is charged. Packet and anchor bytes are counted separately, not converted to observations. All rules and coordinates use the same finite family as v0.3. The independent arithmetic oracle is implemented in v0.4. Each batch draws distinct quadratic support pairs; biased rules and coordinate permutations vary deterministically with seed. No repeated exact target support within a batch.

The selector has 12 externally supplied contexts: target count 1, 4 or 9; clean or noisy channel (bias flips with probability approximately 1/3); preexisting peer knowledge or freshly commissioned knowledge. The clean/noisy class is known metadata, not inferred from messages. The fresh context charges all sender discovery observations; the existing context treats them as sunk and charges only calibration, audit and fallback. The counterfactual peer simulations still execute sender learning in both contexts and record its cost. Cold and cumulative-memory strategies do not commission a sender. This cost scope is explicit, not a claim that existing knowledge was free to acquire.

Calibration: 18 seed-indexed batches per context (216 batches). Fit a table of empirical mean observation costs and select the cheapest strategy per context, with deterministic tie-breaking. Freeze it before evaluating 30 different seeds per context (360 batches, 1,680 target worlds). All three strategies are simulated independently for every batch to establish comparative costs and a hindsight lower bound. The evaluated policy sees only its context, never individual future corruption draws, true rules or counterfactual test costs. Held-out observations are the three inputs from v0.3. No external network or packages.

## Results

All strategies recovered every target rule exactly, including 5,040/5,040 held-out predictions each. All 264 bias-flipped offers in the evaluation peer counterfactuals were rejected and fallback executed. The adaptive selector chose cold 240 times, peer 120 times and cumulative memory zero times. It chose peer only for existing knowledge in four- and nine-target contexts; otherwise cold. Randomized distinct target supports make the cumulative library relatively unhelpful; this is not a universal conclusion about memory.

| Strategy | Evaluation observation count |
|---|---:|
| Always cold | 36,906 |
| Always cumulative memory | 39,781 |
| Always peer (contextual cost scope) | 48,532 |
| Adaptive | 32,562 |
| Per-batch hindsight minimum (unattainable baseline) | 32,480 |

Adaptive uses 4,344 fewer observations (about 11.77%) than the best fixed strategy on this evaluation. However, its selected peer batches also account for 18,531 historical sender observations treated as sunk. Charging those to the selected strategy retrospectively yields 51,093, exceeding the always-cold cost. The calibration experiment itself used 87,640 observations when all three counterfactual strategies and all source costs are charged; adding it to one evaluation does not yield a net saving. No lifetime break-even or compute-speed advantage is demonstrated. The context labels and deployment mixture are externally given; a different mixture may change the results.

Nine executed regression checks verify correctness, rejected corruptions, accounting, frozen policy, disjoint seed sets, repeatability, fallback, strategy totals and budget bounds. Seed values are deterministic, not evidence of independent random sampling. All 12 context costs and the fitted policy are recorded in results/genesis_field_v04_summary.json; complete calibration and evaluation batch records can be regenerated with report mode.

## Reproduce

    node runtime/cli-v04.mjs test
    node runtime/cli-v04.mjs summary
    node runtime/cli-v04.mjs report > v04-all-records.json

Node 22; no packages. CI reruns checks and compares the summary. Optional seed counts (1..100) are supported for smoke tests. v0.1–v0.3 remain intact.

## Limitations and next steps

This is a fixed finite decision table, offline supervised comparison of observed costs, not an independently invented objective or online exploration algorithm. It cannot generalize to unseen contexts, infer source acquisition status or reliability, or revise its policy after deployment. Oracle access, coordinate anchors and peer availability are externally provided; corruptions are only simulated bias flips. Observation counts do not equate to CPU, latency or monetary cost. Peer sender labels are not authenticated; histories are ephemeral and in-process. Next: online cost estimation with uncertainty, explicit budget ceilings, persistence and drift-aware reevaluation against predeclared independent task streams. No claims of consciousness or general intelligence.
