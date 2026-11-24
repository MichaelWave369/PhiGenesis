"""Phi011: distributed perception with matched observation budgets."""
import argparse
import json
from pathlib import Path
import random

N = 9
ROUNDS = 36
REGIMES = ("independent", "persistent_local_fault", "shared_fault")
POLICIES = ("single", "local_three", "ring_three")
NOISE = 0.15


def majority(bits):
    if len(bits) != 3 or any(type(b) is not int or b not in (0, 1) for b in bits):
        raise ValueError("expected three binary observations")
    return int(sum(bits) >= 2)


def observations(seed, regime):
    """Only the evaluator sees the latent bit and fault assignments."""
    if regime not in REGIMES:
        raise ValueError("unknown regime")
    rng = random.Random(seed)
    faulty = set(rng.sample(range(N), 3)) if regime == "persistent_local_fault" else set()
    for _ in range(ROUNDS):
        truth = rng.randrange(2)
        common = int(regime == "shared_fault" and rng.random() < 0.3)
        samples = tuple(tuple(truth ^ common ^ int(i in faulty) ^
                              int(rng.random() < NOISE) for _ in range(3))
                        for i in range(N))
        yield truth, samples


def predict(samples, actor, policy):
    """Fixed topology; each estimator receives only its permitted observations."""
    if type(actor) is not int or not 0 <= actor < N:
        raise ValueError("invalid identity")
    if policy == "single":
        return samples[actor][0]
    if policy == "local_three":
        return majority(samples[actor])
    if policy == "ring_three":
        return majority((samples[(actor-1) % N][0], samples[actor][0],
                         samples[(actor+1) % N][0]))
    raise ValueError("unknown policy")


def trial(seed, regime):
    scores = {policy: [0] * N for policy in POLICIES}
    for truth, samples in observations(seed, regime):
        for actor in range(N):
            for policy in POLICIES:
                scores[policy][actor] += int(predict(samples, actor, policy) == truth)
    return {"seed": seed, "regime": regime,
            "policies": {p: {"correct": sum(scores[p]),
                             "accuracy": sum(scores[p])/(N*ROUNDS),
                             "worst_entity_accuracy": min(scores[p])/ROUNDS,
                             "entity_correct": scores[p],
                             "observations_per_decision": 1 if p == "single" else 3,
                             "neighbor_messages_per_decision": 2 if p == "ring_three" else 0}
                         for p in POLICIES}}


def run(seeds=90):
    if type(seeds) is not int or not 1 <= seeds <= 1000:
        raise ValueError("seeds must be 1..1000")
    rows = [trial(11000 + j*10000 + i, regime)
            for j, regime in enumerate(REGIMES) for i in range(seeds)]
    summary = {}
    for regime in REGIMES:
        group = [r["policies"] for r in rows if r["regime"] == regime]
        summary[regime] = {
            p: {"accuracy": sum(r[p]["accuracy"] for r in group)/seeds,
                "mean_worst_entity_accuracy": sum(r[p]["worst_entity_accuracy"] for r in group)/seeds,
                "correct": sum(r[p]["correct"] for r in group),
                "decisions": seeds*N*ROUNDS,
                "observations_per_decision": group[0][p]["observations_per_decision"],
                "neighbor_messages_per_decision": group[0][p]["neighbor_messages_per_decision"]}
            for p in POLICIES}
        deltas = [r["ring_three"]["accuracy"] - r["local_three"]["accuracy"] for r in group]
        summary[regime]["paired_ring_minus_local"] = {
            "mean": sum(deltas)/seeds,
            "positive": sum(d > 0 for d in deltas),
            "negative": sum(d < 0 for d in deltas),
            "tied": sum(d == 0 for d in deltas)}
    return {"entities": N, "rounds": ROUNDS, "seeds_per_regime": seeds,
            "noise": NOISE, "summary": summary, "trials": rows}


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--seeds", type=int, default=90)
    p.add_argument("--output", type=Path)
    args = p.parse_args()
    result = run(args.seeds)
    if args.output:
        args.output.write_text(json.dumps(result, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k != "trials"}, indent=2))
