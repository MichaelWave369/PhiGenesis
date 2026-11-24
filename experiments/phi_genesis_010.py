"""Phi010: finite agency sandbox, matched-policy comparison, deterministic replay."""
import argparse
from dataclasses import asdict, dataclass
import json
from pathlib import Path
import random

N = 9
ROUNDS = 36
MAX_TRANSFER = 3
INITIAL = (18, 15, 12, 9, 6, 3, 0, 0, 0)
POLICIES = ("bounded", "unrestricted")
REGIMES = ("cooperative", "mixed", "adversarial")


@dataclass(frozen=True)
class Proposal:
    actor: int
    source: int
    target: int
    amount: int
    kind: str = "transfer"


def authorized(p):
    # Identity is assigned by the simulator, not an authenticated real-world principal.
    return p.kind == "transfer" and p.actor == p.source


def execute(state, p, policy):
    """Pure transition: proposals never modify the authorization rule."""
    if policy not in POLICIES:
        raise ValueError("unknown policy")
    if (len(state) != N or any(type(x) is not int or x < 0 for x in state)):
        raise ValueError("invalid state")
    if any(type(x) is not int or not 0 <= x < N for x in (p.actor, p.source, p.target)):
        return state, "invalid_identity"
    if p.kind != "transfer":
        return state, "unsupported_operation"
    if type(p.amount) is not int or not 1 <= p.amount <= MAX_TRANSFER or p.source == p.target:
        return state, "invalid_transfer"
    if policy == "bounded" and not authorized(p):
        return state, "unauthorized"
    if state[p.source] < p.amount:
        return state, "insufficient"
    nxt = list(state)
    nxt[p.source] -= p.amount
    nxt[p.target] += p.amount
    return tuple(nxt), "accepted"


def schedule(seed, regime):
    """Generate matched proposals from a reference cooperative trajectory.
    The reference is separate from either evaluated policy's state.
    """
    if regime not in REGIMES:
        raise ValueError("unknown regime")
    rng = random.Random(seed)
    reference = INITIAL
    events = []
    for step in range(ROUNDS):
        high = max(reference)
        low = min(reference)
        source = rng.choice([i for i, x in enumerate(reference) if x == high])
        target = rng.choice([i for i, x in enumerate(reference) if x == low and i != source])
        amount = min(MAX_TRANSFER, max(0, (high-low)//2))
        cooperative = Proposal(source, source, target, amount)
        reference, _ = execute(reference, cooperative, "bounded")
        attack = regime == "adversarial" or (regime == "mixed" and step % 3 == 0)
        if attack:
            actor = rng.randrange(N)
            victim = rng.choice([i for i in range(N) if i != actor])
            events.append(Proposal(actor, victim, actor, rng.randint(1, MAX_TRANSFER)))
            if step % 3 == 0:
                events.append(Proposal(actor, victim, actor, 1, "grant"))
        else:
            events.append(cooperative)
    return tuple(events)


def run_trace(proposals, policy):
    state = INITIAL
    events = []
    for i, p in enumerate(proposals):
        nxt, status = execute(state, p, policy)
        events.append({"index": i, "proposal": asdict(p), "status": status,
                       "before": list(state), "after": list(nxt)})
        state = nxt
    return {"policy": policy, "initial": list(INITIAL), "events": events,
            "final": list(state)}


def replay(trace):
    """Recompute transitions from recorded proposals; reject altered outcomes.
    Not authentication: an adversary can rewrite an entire consistent trace.
    """
    expected = run_trace([Proposal(**e["proposal"]) for e in trace["events"]], trace["policy"])
    if expected != trace:
        raise ValueError("trace mismatch")
    return tuple(expected["final"])


def metrics(trace):
    state = trace["final"]
    events = trace["events"]
    accepted = [e for e in events if e["status"] == "accepted"]
    mean = sum(state) / N
    return {"accepted": len(accepted),
            "unauthorized_accepted": sum(not authorized(Proposal(**e["proposal"])) for e in accepted),
            "unauthorized_units": sum(e["proposal"]["amount"] for e in accepted
                                      if not authorized(Proposal(**e["proposal"]))),
            "grant_accepted": sum(e["proposal"]["kind"] == "grant" for e in accepted),
            "variance": sum((x-mean)**2 for x in state) / N,
            "conserved": sum(state) == sum(INITIAL),
            "replay_match": replay(trace) == tuple(state)}


def run(seeds=90):
    if type(seeds) is not int or not 1 <= seeds <= 1000:
        raise ValueError("seeds must be 1..1000")
    trials = []
    for regime in REGIMES:
        for seed in range(seeds):
            proposals = schedule(10010+seed, regime)
            for policy in POLICIES:
                trials.append({"seed": 10010+seed, "regime": regime, "policy": policy,
                               **metrics(run_trace(proposals, policy))})
    summary = {}
    for regime in REGIMES:
        summary[regime] = {}
        for policy in POLICIES:
            group = [r for r in trials if r["regime"] == regime and r["policy"] == policy]
            summary[regime][policy] = {
                "mean_variance": sum(r["variance"] for r in group) / seeds,
                "accepted": sum(r["accepted"] for r in group),
                "unauthorized_accepted": sum(r["unauthorized_accepted"] for r in group),
                "unauthorized_units": sum(r["unauthorized_units"] for r in group),
                "grant_accepted": sum(r["grant_accepted"] for r in group),
                "conservation_failures": sum(not r["conserved"] for r in group),
                "replay_failures": sum(not r["replay_match"] for r in group)}
    return {"seeds_per_regime": seeds, "entities": N, "rounds": ROUNDS,
            "summary": summary, "trials": trials}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seeds", type=int, default=90)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = run(args.seeds)
    if args.output:
        args.output.write_text(json.dumps(result, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k != "trials"}, indent=2))
