"""Bounded feature construction, sparse model search, and held-out evaluation."""
import argparse
import itertools
import json
from pathlib import Path
import numpy as np

N = 8
MAX_DEGREE = 4
MAX_TERMS = 12
STATES = np.arange(1 << N)
BITS = ((STATES[:, None] >> np.arange(N)) & 1)
REGIMES = ('sparse_composed', 'low_degree', 'unreachable', 'noise')


def generate_features(max_degree):
    """Canonical product compositions; fixed depth and finite budget."""
    if not 1 <= max_degree <= MAX_DEGREE:
        raise ValueError('invalid degree')
    features = {(): np.ones(len(STATES))}
    primitives = 1.0 - 2.0 * BITS
    for degree in range(1, max_degree + 1):
        for key in itertools.combinations(range(N), degree):
            features[key] = features[key[:-1]] * primitives[:, key[-1]]
    keys = tuple(features)
    return keys, np.column_stack([features[k] for k in keys])


KEYS, DESIGN = generate_features(MAX_DEGREE)
LOW_COUNT = sum(len(k) <= 2 for k in KEYS)


def oracle(mask):
    # Independent parity computation rather than the feature constructor.
    return np.array([1.0 if (int(s) & mask).bit_count() % 2 == 0 else -1.0 for s in STATES])


def world(rng, regime):
    if regime == 'noise':
        return rng.normal(size=len(STATES)), None
    degrees = {'sparse_composed': (3, 4, 2), 'low_degree': (1, 2, 2), 'unreachable': (6, 7, 8)}[regime]
    masks = []
    for d in degrees:
        while True:
            mask = sum(1 << int(b) for b in rng.choice(N, d, replace=False))
            if mask not in masks:
                masks.append(mask)
                break
    coeff = rng.uniform(.7, 1.3, len(masks)) * rng.choice([-1, 1], len(masks))
    return sum(c * oracle(m) for c, m in zip(coeff, masks)), masks


def sparse_path(design, train, val, observed, validation):
    """Greedy residual search; fit only training rows; select prefix on validation."""
    chosen = [0]
    x = design[train]
    best = None
    for step in range(MAX_TERMS + 1):
        weights = np.linalg.lstsq(x[:, chosen], observed, rcond=None)[0]
        error = float(np.mean((design[val][:, chosen] @ weights - validation) ** 2))
        score = error + .003 * (len(chosen)-1)
        if best is None or score < best[0]:
            best = (score, tuple(chosen), weights.copy(), error)
        if step == MAX_TERMS or len(chosen) == design.shape[1]:
            break
        residual = observed - x[:, chosen] @ weights
        correlation = np.abs(x.T @ residual)
        correlation[chosen] = -np.inf
        chosen.append(int(np.argmax(correlation)))
    return best


def trial(seed, regime):
    rng = np.random.default_rng(seed)
    y, hidden = world(rng, regime)
    order = rng.permutation(len(STATES))
    train, val, test = order[:112], order[112:160], order[160:]
    observed = y[train] + rng.normal(0, .05 * max(y[train].std(), 1e-12), len(train))
    mean, scale = observed.mean(), max(observed.std(), 1e-12)
    y = (y - mean) / scale
    observed = (observed - mean) / scale
    validation = y[val] + rng.normal(0, .05, len(val))
    result = {}
    for name, design in [('generated_sparse', DESIGN), ('fixed_quadratic_sparse', DESIGN[:, :LOW_COUNT])]:
        score, keys, weights, error = sparse_path(design, train, val, observed, validation)
        pred = design[test][:, keys] @ weights
        result[name] = {'mse': float(np.mean((pred-y[test])**2)), 'validation_mse': error,
                        'terms': [list(KEYS[i]) for i in keys], 'rejected': bool(error > .25)}
    # Dense ridge baseline has access to the same generated feature library.
    x = DESIGN[train]
    w = x.T @ np.linalg.solve(x @ x.T + .1*np.eye(len(train)), observed)
    result['dense_library_ridge'] = {'mse': float(np.mean((DESIGN[test] @ w-y[test])**2))}
    result['constant'] = {'mse': float(np.mean((observed.mean()-y[test])**2))}
    terms = result['generated_sparse']['terms']
    found = {sum(1 << b for b in k) for k in terms if k}
    return {'seed':seed, 'regime':regime, 'models':result,
            'exact_support': hidden is not None and found == set(hidden),
            'contains_support': hidden is not None and set(hidden).issubset(found)}


def run(seeds=90):
    if not 1 <= seeds <= 1000:
        raise ValueError('seeds must be in 1..1000')
    rows = [trial(9000 + j*10000 + i, regime) for j, regime in enumerate(REGIMES) for i in range(seeds)]
    summary = {}
    for regime in REGIMES:
        group = [r for r in rows if r['regime']==regime]
        summary[regime] = {'mean_test_mse': {k: float(np.mean([r['models'][k]['mse'] for r in group])) for k in group[0]['models']},
                           'generated_rejections': sum(r['models']['generated_sparse']['rejected'] for r in group),
                           'exact_support': sum(r['exact_support'] for r in group),
                           'contains_support': sum(r['contains_support'] for r in group),
                           'mean_generated_terms': float(np.mean([len(r['models']['generated_sparse']['terms'])-1 for r in group]))}
    return {'seeds_per_regime': seeds, 'worlds':len(rows), 'train':112, 'validation':48, 'test':96,
            'generated_library_size': len(KEYS), 'fixed_quadratic_library_size':LOW_COUNT,
            'summary':summary,'trials':rows}


if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('--seeds',type=int,default=90); p.add_argument('--output',type=Path)
    args = p.parse_args(); result = run(args.seeds)
    if args.output: args.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='trials'},indent=2))
