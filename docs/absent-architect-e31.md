# Absent Architect E3.1 — Cooperative Commons

Standalone synthetic successor to E3.0. No physical cosmology, consciousness, actual economy or real-world governance claims. Earlier experiments untouched.

## Frozen protocol

90 paired integer seeds; nine residents with integer resource wallets; nine sequential project opportunities. Each project requires exactly nine resource units from three distinct contributors, three units each. Successful construction atomically moves wallet units to an inert infrastructure capital account; no money creation, maintenance, destruction, or later liquidation. Benefits are separate utility scores, not material resources, and accrue once at build time. No individual can fund a project alone under the fixed contribution cap; this is a designed constraint. Initial wallets 6–12, or 2–5 under scarcity. High-value project benefits 3–6 per resident, low-value 0–2, mixed 0–6; scarce uses high-value benefits. Each resident independently has a seeded 80% willingness flag per opportunity. Actor order, benefits, willingness and wallets matched across policies within regime; grant availability adapts to policy-specific wallets.

Isolated builds nothing; open commons and member commons accept only simulator-issued exact project/access-term grants from willing residents with at least three resources and benefit strictly exceeding three. First three eligible principals in seeded order contribute; other grants unused. Open commons benefits all nine, member commons benefits only three funders. Compulsory control selects first three funded residents regardless of consent and benefits all nine. No strategic free riding, learned preferences, dynamic pricing, external enforcement, or actual collective deliberation. Access policy is not governance ownership: neither funders nor beneficiaries acquire additional control rights. Utility = received project benefits minus resource expenditure; benefit magnitudes are externally supplied and not inferred. Refused construction changes no state; replay recomputes ledger transitions but cannot authenticate grants or detect a wholly rewritten consistent history. Trusted simulator generates grants, which are plain records, not cryptographic capabilities; internal project fixtures trusted. No revocation, session expiry or live resource shock implemented.

## Reproduce

    node experiments/absent-architect-e31.mjs test
    node experiments/absent-architect-e31.mjs report 90

1845 authoring-runtime assertions passed. Mean per world:

| Regime | Policy | Built | Net utility | Unconsented contributions | Residents with negative net | Noncontributor access events |
|---|---|---:|---:|---:|---:|---:|
| high-value | isolated | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| high-value | open-commons | 6.66 | 211.16 | 0.00 | 0.00 | 39.93 |
| high-value | member-commons | 6.66 | 39.87 | 0.00 | 0.00 | 0.00 |
| high-value | compulsory | 7.20 | 225.38 | 8.78 | 0.00 | 43.20 |
| low-value | isolated | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| low-value | open-commons | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| low-value | member-commons | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| low-value | compulsory | 7.20 | -0.88 | 21.60 | 4.11 | 43.20 |
| scarce | isolated | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| scarce | open-commons | 1.78 | 56.98 | 0.00 | 0.00 | 10.67 |
| scarce | member-commons | 1.78 | 10.44 | 0.00 | 0.00 | 0.00 |
| scarce | compulsory | 1.81 | 56.87 | 2.16 | 0.00 | 10.87 |
| mixed-values | isolated | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| mixed-values | open-commons | 4.59 | 93.96 | 0.00 | 0.00 | 27.53 |
| mixed-values | member-commons | 4.59 | 27.89 | 0.00 | 0.00 | 0.00 |
| mixed-values | compulsory | 7.20 | 127.17 | 14.52 | 0.03 | 43.20 |

Noncontributor access events count recipient/project pairs, not distinct people. Unconsented contributions refer to missing scripted grant, not necessarily utility loss. Aggregate welfare may favor compulsory provision by construction (public benefits assigned to all), but does not establish ethical superiority. All evaluated traces conserve wallet+capital units and replay. No statistical significance or real society extrapolation. Next: explicit access/ownership contracts, maintenance and actual shared resource shocks; strategic contribution and exit rights; separate consent and authority invariants.
