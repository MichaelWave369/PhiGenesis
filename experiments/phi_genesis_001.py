"""PhiGenesis 001: language-free relational rule discovery.
Requires Python 3 and NumPy. Run: python phi_genesis_001.py
The learner sees only binary states, never the environment's rule.
"""
import itertools
import numpy as np

OFFSETS = tuple(range(-4, 5))
CANDIDATES = [c for k in (1, 2, 3) for c in itertools.combinations(OFFSETS, k)]


def encode(states, offsets):
    codes = np.zeros_like(states, dtype=np.int64)
    for offset in offsets:
        codes = 2 * codes + np.roll(states, -offset, axis=-1)
    return codes


def hidden_rule(rng):
    offsets = tuple(sorted(rng.choice(OFFSETS, 3, replace=False)))
    while True:
        table = rng.integers(0, 2, size=8)
        if all(any(table[i] != table[i ^ (1 << b)] for i in range(8)) for b in range(3)):
            return offsets, table


def observe(rng, width, count, rule):
    # Independent reset-and-step experiences, no labels other than next states.
    x = rng.integers(0, 2, size=(count, width))
    return x, rule[1][encode(x, rule[0])]


def discover(x, y):
    best = None
    for offsets in CANDIDATES:
        codes = encode(x, offsets).ravel()
        targets = y.ravel()
        size = 2 ** len(offsets)
        ones = np.bincount(codes, weights=targets, minlength=size)
        total = np.bincount(codes, minlength=size)
        table = (2 * ones > total).astype(np.int64)
        errors = int(np.count_nonzero(table[codes] != targets))
        score = (errors, len(offsets), offsets)
        if best is None or score < best[0]:
            best = score, offsets, table
    return best[1:]


def accuracy(a, b):
    return float(np.mean(a == b))


def run(seed):
    rng = np.random.default_rng(seed)
    rule = hidden_rule(rng)
    x, y = observe(rng, 19, 24, rule)
    inferred = discover(x, y)
    exact = inferred[0] == rule[0] and np.array_equal(inferred[1], rule[1])
    results = []
    majority = int(y.mean() > 0.5)
    for width in (31, 47):
        tx, ty = observe(rng, width, 32, rule)
        predicted = inferred[1][encode(tx, inferred[0])]
        results.append((accuracy(predicted, ty), accuracy(tx, ty), accuracy(majority, ty)))
    # Additional closed-loop 20-step prediction, with no target state feedback.
    actual = rng.integers(0, 2, size=(8, 47))
    predicted = actual.copy()
    for _ in range(20):
        actual = rule[1][encode(actual, rule[0])]
        predicted = inferred[1][encode(predicted, inferred[0])]
    return exact, np.array(results), accuracy(actual, predicted)


if __name__ == '__main__':
    runs = [run(seed) for seed in range(20)]
    print(f'Exact rule recovery: {sum(r[0] for r in runs)}/{len(runs)}')
    scores = np.mean([r[1] for r in runs], axis=0)
    for width, row in zip((31, 47), scores):
        print(f'Width {width}: discovered={row[0]:.2%}; persistence={row[1]:.2%}; majority={row[2]:.2%}')
    print(f'20-step closed-loop accuracy: {np.mean([r[2] for r in runs]):.2%}')
