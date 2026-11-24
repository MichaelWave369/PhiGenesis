"""PhiGenesis 002: active relational discovery and predictive abstraction.
Python 3 + NumPy. Run: python phi_genesis_002.py
All environments are generated locally, with no language-model calls.
"""
import itertools
import json
import numpy as np

CANDIDATES = [c for k in (1, 2, 3) for c in itertools.combinations(range(8), k)]
STATES = np.array(list(itertools.product((0, 1), repeat=8)), dtype=np.int8)
PRED = np.stack([STATES[:, c].sum(axis=1) % 2 for c in CANDIDATES])
PASSIVE = np.flatnonzero(np.all(STATES[:, ::2] == STATES[:, 1::2], axis=1))


def active_trial(seed):
    rng = np.random.default_rng(seed)
    groups = rng.choice(4, size=int(rng.integers(2, 4)), replace=False)
    hidden = tuple(sorted(2 * int(g) + int(rng.integers(2)) for g in groups))
    oracle = PRED[CANDIDATES.index(hidden)]
    initial = np.flatnonzero(np.all(PRED[:, PASSIVE] == oracle[PASSIVE], axis=1))
    def learn(active):
        live = initial.copy()
        remaining = np.setdiff1d(np.arange(len(STATES)), PASSIVE)
        n = 0
        while len(live) > 1 and len(remaining):
            if active:
                ones = PRED[live][:, remaining].sum(axis=0)
                score = np.minimum(ones, len(live) - ones)
                pos = int(np.argmax(score))
            else:
                pos = int(rng.integers(len(remaining)))
            query = remaining[pos]
            live = live[PRED[live, query] == oracle[query]]
            remaining = np.delete(remaining, pos)
            n += 1
        assert len(live) == 1 and CANDIDATES[live[0]] == hidden
        return n
    # All candidates agree on passive data, but may disagree off distribution.
    passive_accuracy = float(np.mean(PRED[initial[0]] == oracle))
    return len(initial), passive_accuracy, learn(True), learn(False)


def refine(outputs, transitions):
    """Find equivalence classes based on all future observable behavior.
    Learner receives only opaque observation IDs, outputs and observed transitions.
    """
    labels = np.unique(outputs, return_inverse=True)[1]
    while True:
        signatures = np.column_stack((labels, labels[transitions]))
        _, new = np.unique(signatures, axis=0, return_inverse=True)
        if len(np.unique(new)) == len(np.unique(labels)):
            return new
        labels = new


def abstraction_trial(seed):
    rng = np.random.default_rng(seed)
    n_classes, variants, n_actions = 6, 6, 3
    n = n_classes * variants
    # Private simulator data: one action cycles through all latent classes.
    # A unique marker output makes those classes behaviorally distinguishable.
    true_classes = np.repeat(np.arange(n_classes), variants)[rng.permutation(n)]
    dynamics = rng.integers(n_classes, size=(n_classes, n_actions))
    dynamics[:, 0] = (np.arange(n_classes) + 1) % n_classes
    outputs = (true_classes == 0).astype(int)
    transitions = np.array([[rng.choice(np.flatnonzero(true_classes == dynamics[c, a]))
                             for a in range(n_actions)] for c in true_classes])
    # Exhaustive reset-and-action observations, one per opaque ID/action.
    # The learner does not receive true_classes or dynamics.
    learned = refine(outputs, transitions)
    k = len(np.unique(learned))
    reduced = np.empty((k, n_actions), dtype=int)
    readout = np.empty(k, dtype=int)
    for i in range(k):
        members = np.flatnonzero(learned == i)
        reduced[i] = learned[transitions[members[0]]]
        readout[i] = outputs[members[0]]
        assert np.all(learned[transitions[members]] == reduced[i])
        assert np.all(outputs[members] == readout[i])
    matches = 0
    total = 0
    for _ in range(100):
        actual = int(rng.integers(n))
        predicted = learned[actual]
        for action in rng.integers(n_actions, size=20):
            actual = transitions[actual, action]
            predicted = reduced[predicted, action]
            matches += int(readout[predicted] == outputs[actual])
            total += 1
    equivalent = np.array_equal(learned[:, None] == learned[None, :],
                                true_classes[:, None] == true_classes[None, :])
    return k, equivalent, matches, total


def main():
    seeds = range(60)
    a = np.array([active_trial(s) for s in seeds])
    b = [abstraction_trial(s + 1000) for s in seeds]
    result = {
        'trials_per_experiment': len(seeds),
        'active_discovery': {
            'passive_hypotheses_range': [int(a[:,0].min()), int(a[:,0].max())],
            'passive_first_consistent_full_state_accuracy': float(a[:,1].mean()),
            'active_mean_additional_queries': float(a[:,2].mean()),
            'random_mean_additional_queries': float(a[:,3].mean()),
            'exact_recovery_active_and_random': len(seeds),
        },
        'predictive_abstraction': {
            'raw_observations': 36, 'learned_class_counts': sorted(set(x[0] for x in b)),
            'exact_partition_recovery': sum(x[1] for x in b),
            'rollout_output_accuracy': sum(x[2] for x in b)/sum(x[3] for x in b),
            'rollout_output_predictions': sum(x[3] for x in b),
            'raw_transition_entries': 108, 'compressed_transition_entries': 18,
            'raw_entries_including_outputs': 144,
            'compressed_entries_including_mapping_and_outputs': 60,
        }
    }
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
