"""PhiGenesis 004: transfer and negative transfer in compositional worlds.
Run: python phi_genesis_004.py [--output results.json]
Requires NumPy. No language model, network, or external data.
The learner's factorization and hypothesis family are designed, not learned.
"""
import argparse
import itertools
import json
from pathlib import Path
import numpy as np

# Every balanced Boolean function of three anonymous binary inputs.
TABLES = np.zeros((70, 8), dtype=bool)
for i, ones in enumerate(itertools.combinations(range(8), 4)):
    TABLES[i, list(ones)] = True
A, B, OP = np.indices((70, 70, 3)).reshape(3, -1)
L = TABLES[A][:, np.repeat(np.arange(8), 8)]
R = TABLES[B][:, np.tile(np.arange(8), 8)]
PRED = np.where(OP[:, None] == 0, L ^ R,
                np.where(OP[:, None] == 1, L & R, L | R))
BUDGETS = (0, 4, 8, 12, 16, 24, 32)
METHODS = ('cold', 'rigid_memory', 'revisable_memory')
REGIMES = ('both_familiar', 'one_familiar', 'both_novel')


def learn_source(oracle):
    """Recover a source rule by testing its eight input contexts."""
    observations = np.array([oracle(i) for i in range(8)])
    matches = np.flatnonzero(np.all(TABLES == observations, axis=1))
    assert len(matches) == 1
    return int(matches[0])


def trial(seed):
    rng = np.random.default_rng(seed)
    source_ids = rng.choice(70, 3, replace=False)
    memory = [learn_source(lambda x, k=k: TABLES[k, x]) for k in source_ids]
    familiar = np.isin(np.arange(70), memory)
    novel_ids = np.flatnonzero(~familiar)
    # All three learners have identical factorization and hypothesis family.
    # Only their priors differ; the revisable prior never assigns zero mass.
    p = np.where(familiar, .85 / 3, .15 / 67)
    prior = p[A] * p[B]
    rigid = familiar[A] & familiar[B]
    result = {}
    for regime in REGIMES:
        a = int(rng.choice(memory if regime != 'both_novel' else novel_ids))
        b = int(rng.choice(memory if regime == 'both_familiar' else novel_ids))
        if regime == 'one_familiar' and rng.integers(2):
            a, b = b, a
        op = int(rng.integers(3))
        target = PRED[(a * 70 + b) * 3 + op]
        order = rng.permutation(64)
        rows = []
        for budget in BUDGETS:
            observed, heldout = order[:budget], order[budget:]
            live = np.flatnonzero(np.all(PRED[:, observed] == target[observed], axis=1))
            assert len(live) > 0
            metrics = {}
            for method in METHODS:
                candidates = live[rigid[live]] if method == 'rigid_memory' else live
                if not len(candidates):
                    metrics[method] = {'accuracy': None, 'brier': None, 'exact': False, 'contradiction': True}
                    continue
                weights = prior[candidates] if method == 'revisable_memory' else np.ones(len(candidates))
                probabilities = np.average(PRED[candidates][:, heldout], axis=0, weights=weights)
                actual = target[heldout]
                # Expected accuracy with fair random tie breaking, not favorable tie handling.
                ties = np.isclose(probabilities, .5, atol=1e-12, rtol=0)
                accuracy = np.mean(np.where(ties, .5, (probabilities > .5) == actual))
                metrics[method] = {'accuracy': float(accuracy),
                    'brier': float(np.mean((probabilities - actual) ** 2)),
                    'exact': bool(np.all(np.where(actual, probabilities > .5 + 1e-12, probabilities < .5 - 1e-12))),
                    'contradiction': False}
            rows.append(metrics)
        result[regime] = rows
    return result


def run(n=90):
    trials = [trial(s) for s in range(n)]
    result = {'seeds': n, 'source_worlds_per_seed': 3, 'source_queries_per_seed': 24,
              'target_worlds': n * len(REGIMES), 'hypotheses': len(PRED),
              'budgets': list(BUDGETS), 'results': {}}
    for regime in REGIMES:
        result['results'][regime] = {}
        for i, budget in enumerate(BUDGETS):
            summary = {}
            for method in METHODS:
                records = [t[regime][i][method] for t in trials]
                valid = [r for r in records if not r['contradiction']]
                summary[method] = {'coverage': len(valid)/n,
                    'accuracy_when_covered': float(np.mean([r['accuracy'] for r in valid])) if valid else None,
                    'brier_when_covered': float(np.mean([r['brier'] for r in valid])) if valid else None,
                    'exact_heldout_worlds': sum(r['exact'] for r in records)}
            result['results'][regime][str(budget)] = summary
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    parser.add_argument('--seeds', type=int, default=90)
    args = parser.parse_args()
    data = json.dumps(run(args.seeds), indent=2)
    if args.output:
        args.output.write_text(data + '\n')
    print(data)
