"""Finite, language-free executable relation transfer. Standard library only."""
import argparse
import json
import random

P = 31
IDENTITY = (1, 0)


def apply(f, x):
    return (f[0] * x + f[1]) % P


def compose(g, f):
    return (g[0] * f[0] % P, (g[0] * f[1] + g[1]) % P)


def inverse(f):
    a = pow(f[0], -1, P)
    return (a, -a * f[1] % P)


def infer(samples):
    (x, y), (u, v) = samples[:2]
    if x == u:
        raise ValueError('two distinct inputs required')
    a = (v-y) * pow((u-x) % P, -1, P) % P
    f = (a, (y-a*x) % P)
    if any(apply(f, z) != w for z, w in samples):
        raise ValueError('observations contradict affine model')
    return f


def program(rules, sequence):
    out = IDENTITY
    for index in sequence:
        out = compose(rules[index], out)
    return out


def translate(f, bridge):
    return compose(bridge, compose(f, inverse(bridge)))


def trial(seed):
    rng = random.Random(seed)
    def random_map():
        return rng.randrange(1, P), rng.randrange(P)
    # The world alone knows the true operations and receiver coordinate map.
    world = [random_map() for _ in range(3)]
    hidden_bridge = random_map()
    anchors = rng.sample(range(P), 2)
    learned = [infer([(x, apply(f, x)) for x in anchors]) for f in world]
    bridge = infer([(x, apply(hidden_bridge, x)) for x in anchors])
    assert learned == world
    # Novel operation sequences, never presented to either learner as examples.
    sequences = [tuple(rng.randrange(3) for _ in range(k)) for k in (2,3,4,5,6,7,8,9,12)]
    counts = dict(composed=0, transferred=0, cold=0, unaligned=0,
                  nonlinear_detected=0, corrupted_detected=0, cases=0)
    for seq in sequences:
        f = program(learned, seq)
        truth = program(world, seq)
        recipient_truth = translate(truth, hidden_bridge)
        transferred = translate(f, bridge)
        # Cold learner gets two direct examples for EACH new composite operation.
        cold = infer([(x, apply(recipient_truth, x)) for x in anchors])
        heldout = [x for x in range(P) if x not in anchors]
        for x in heldout:
            counts['composed'] += apply(f,x) == apply(truth,x)
            y = apply(recipient_truth,x)
            counts['transferred'] += apply(transferred,x) == y
            counts['cold'] += apply(cold,x) == y
            counts['unaligned'] += apply(f,x) == y
            counts['cases'] += 1
        # A quadratic perturbation matches both calibration anchors but differs everywhere else.
        probe = rng.choice(heldout)
        def nonlinear(x):
            return (apply(recipient_truth,x) + (x-anchors[0])*(x-anchors[1])) % P
        counts['nonlinear_detected'] += apply(transferred,probe) != nonlinear(probe)
        # One altered coefficient; detect using one random independent probe.
        corrupt = ((transferred[0]+1)%P, transferred[1])
        counts['corrupted_detected'] += apply(corrupt,probe) != apply(recipient_truth,probe)
    # Sender learns three primitives from six observations, bridge uses two paired observations.
    # Cold baseline uses two direct observations per composite. Validation cost excluded for both.
    return counts


def run(seeds=90):
    if not 1 <= seeds <= 10000:
        raise ValueError('seeds must be in 1..10000')
    rows = [trial(s) for s in range(seeds)]
    totals = {k:sum(r[k] for r in rows) for k in rows[0]}
    return {'seeds':seeds,'composites_per_seed':9,'totals':totals,
            'accuracy':{k:totals[k]/totals['cases'] for k in ('composed','transferred','cold','unaligned')},
            'detection':{k:totals[k]/(9*seeds) for k in ('nonlinear_detected','corrupted_detected')},
            'observations_per_seed':{'sender_primitives':6,'bridge_pairs':2,'cold_composites':18},
            'per_seed':rows}


if __name__ == '__main__':
    p=argparse.ArgumentParser(); p.add_argument('--seeds',type=int,default=90); p.add_argument('--output'); args=p.parse_args()
    result=run(args.seeds)
    if args.output:
        with open(args.output,'w',encoding='utf-8') as f: json.dump(result,f,indent=2)
    print(json.dumps({k:v for k,v in result.items() if k!='per_seed'},indent=2))
