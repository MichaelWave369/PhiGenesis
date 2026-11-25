# Absent Architect E0 — bounded information asymmetry

Synthetic research fixture, not physical cosmology or evidence of a takeover of reality. No consciousness, holographic hardware, real persons, network access, external actuation or real agent security is modeled. This is a finite two-level 3×3 pocket addressing experiment inspired by PhiFractalCity and NBGPocketMesh; neither is imported. The architect is a fixed generator with no intervention after a run starts.

## Frozen protocol
90 paired integer seeds (1–90), nine rule-based residents, 36 rounds, 81 pockets (root/child indices 0–8), renewable resource capacity 0–8 per pocket per round. Each resident receives three candidate children of the same root, one harvest action (maximum 3 tokens), and a common random service order. Sealed observes only the first candidate; equal observes all three; unequal gives all three observations to a randomly selected cohort of three residents. All choose the highest *initial* capacity among visible candidates, ties first. Capacity is depleted by harvest; no redistribution, purchases, communication, debt, institutions, learning, or rule changes. No access beyond prescribed observation choices. Observation cost is counted but not charged to balances. Every policy receives the same immutable world fixture. The flat capacity=3 control has no informational advantage by construction; its outcomes must be identical across policies for each seed. Cohort gap compares the same designated three residents to the remaining six in every regime. Gini measures cumulative harvest inequality, not welfare.

## Reproduce
Node 20+; no dependencies.
```sh
node experiments/absent-architect-e0.mjs test
node experiments/absent-architect-e0.mjs report 90
```

Measured in the authoring JS runtime, 66 assertions passed. Mean results over 90 seeds:

| Policy | Gini | Cohort gap (tokens/resident) | Total harvested | Observations |
|---|---:|---:|---:|---:|
| sealed | 0.038326 | -0.0167 | 735.1667 | 324 |
| equal | 0.010393 | 0.1778 | 944.9333 | 972 |
| unequal | 0.072999 | 23.1833 | 807.7667 | 540 |
The information advantage is deliberately supplied, not discovered; this only measures consequences within the specified toy resource model. No significance claim or generalization. Pseudorandom deterministic seeds are not independent real populations. No durable history, cross-repo integration, true holographic encoding, or sparse infinite generator is implemented. No claim that wealth or access in real society follows this model. Next gate: endogenous observation costs, independent agents discovering local rules, and capability receipts; measure matched negative controls before connecting to city visualization.
