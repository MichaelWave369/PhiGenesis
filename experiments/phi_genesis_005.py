"""Discover reusable symbols via pair substitution in anonymous numerical streams.
No pretrained weights, language, network, or latent motif labels for the learner.
A fixed, deliberately simple grammar induction algorithm; not general cognition.
"""
import argparse
import collections
import json
import math
import random
from pathlib import Path

ALPHABET = 8
MAX_RULES = 24


def replace(seq, pair, token):
    out = []
    i = 0
    while i < len(seq):
        if i + 1 < len(seq) and (seq[i], seq[i+1]) == pair:
            out.append(token)
            i += 2
        else:
            out.append(seq[i])
            i += 1
    return out


def fit(stream, max_rules=MAX_RULES):
    seq, rules = list(stream), []
    best_rules, best_cost = [], cost(seq, 0)
    for _ in range(max_rules):
        counts = collections.Counter(zip(seq, seq[1:]))
        if not counts:
            break
        pair, count = min(counts.items(), key=lambda item: (-item[1], item[0]))
        if count < 3:
            break
        token = ALPHABET + len(rules)
        proposed = replace(seq, pair, token)
        # Search prefixes of a greedy merge path, allowing temporary cost increases.
        seq = proposed
        rules.append(pair)
        if cost(seq, len(rules)) < best_cost:
            best_rules, best_cost = rules.copy(), cost(seq, len(rules))
    return best_rules


def encode(stream, rules):
    seq = list(stream)
    for i, pair in enumerate(rules):
        seq = replace(seq, pair, ALPHABET+i)
    return seq


def decode(seq, rules):
    out = []
    def expand(t):
        if t < ALPHABET:
            out.append(t)
        else:
            a, b = rules[t-ALPHABET]
            expand(a)
            expand(b)
    for t in seq:
        expand(t)
    return out


def cost(seq, n_rules):
    width = math.ceil(math.log2(ALPHABET+n_rules))
    # 5-bit rule count, 32-bit token count, then fixed-width dictionary and tokens.
    return 37 + width * (len(seq) + 2*n_rules)


def trial(seed):
    rng = random.Random(seed)
    motifs = [tuple(rng.randrange(ALPHABET) for _ in range(rng.randrange(4,10))) for _ in range(6)]
    def stream(n, library):
        return [x for _ in range(n) for x in rng.choice(library)]
    train = stream(600, motifs)
    familiar = stream(250, motifs)
    novel = stream(250, [tuple(rng.randrange(ALPHABET) for _ in range(rng.randrange(4,10))) for _ in range(6)])
    shuffled = familiar.copy(); rng.shuffle(shuffled)
    # Exact histogram-preserving control, learned from an independently shuffled source.
    control = train.copy(); rng.shuffle(control)
    rules, shuffled_rules = fit(train), fit(control)
    result = {'rules':len(rules),'control_rules':len(shuffled_rules),'conditions':{}}
    for name, data in [('familiar',familiar),('novel',novel),('shuffled',shuffled)]:
        row = {}
        for label, dictionary in [('learned',rules),('shuffled_training',shuffled_rules)]:
            encoded = encode(data,dictionary)
            assert decode(encoded,dictionary) == data
            row[label] = 1-cost(encoded,len(dictionary))/cost(data,0)
        result['conditions'][name]=row
    return result


def run(seeds=90):
    if seeds < 1: raise ValueError('seeds must be positive')
    rows=[trial(s) for s in range(seeds)]
    return {'seeds':seeds,'round_trips':seeds*6,'mean_rules':sum(r['rules'] for r in rows)/seeds,
            'mean_control_rules':sum(r['control_rules'] for r in rows)/seeds,
            'mean_net_bit_savings':{c:{m:sum(r['conditions'][c][m] for r in rows)/seeds for m in ('learned','shuffled_training')} for c in ('familiar','novel','shuffled')},
            'trials':rows}

if __name__ == '__main__':
    p=argparse.ArgumentParser(); p.add_argument('--seeds',type=int,default=90); p.add_argument('--output',type=Path); args=p.parse_args()
    result=json.dumps(run(args.seeds),indent=2)+'\n'
    if args.output: args.output.write_text(result)
    print(result)
