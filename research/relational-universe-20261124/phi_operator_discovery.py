"""Anonymous operator discovery, seed 369. Python 3 stdlib only.

A black-box environment exposes four opaque states and three opaque tokens.
The learner assumes only deterministic bijections, not square geometry or D4.
Training queries three states per token; the fourth is held out.
Programs are synthesized using BFS on learned permutations, then independently
verified against the environment. No sequence examples are provided in training.
"""
from collections import Counter, deque
from itertools import product
import random
import json

N=4
TOKENS=tuple('abc')
IDENTITY=tuple(range(N))
TRIALS=369
SEED=369

def compose(first, second):
    """Apply first, then second."""
    return tuple(second[first[i]] for i in range(N))

def execute(world, word, state):
    for token in word:
        state=world[token][state]
    return state

def discover(query, probe_order):
    learned={}
    for token in TOKENS:
        seen={i:query(token,i) for i in probe_order[:3]}
        if len(set(seen.values()))!=3:
            raise ValueError('Observed transition violates bijection assumption')
        seen[probe_order[3]]=next(iter(set(range(N))-set(seen.values())))
        learned[token]=tuple(seen[i] for i in range(N))
    return learned

def synthesize(learned):
    programs={IDENTITY:()}
    queue=deque([IDENTITY])
    while queue:
        current=queue.popleft()
        for token in TOKENS:
            nxt=compose(current,learned[token])
            if nxt not in programs:
                programs[nxt]=programs[current]+(token,)
                queue.append(nxt)
    return programs

def environment(rng):
    # Only the environment knows these are quarter turns and a reflection.
    raw=[(1,2,3,0),(3,0,1,2),(0,3,2,1)]
    rng.shuffle(raw)
    labels=list(range(N));rng.shuffle(labels)
    maps={}
    for token,p in zip(TOKENS,raw):
        m=[0]*N
        for i in range(N):m[labels[i]]=labels[p[i]]
        maps[token]=tuple(m)
    return maps

def main():
    rng=random.Random(SEED)
    counts=Counter(); lengths=Counter(); example=None
    words=[w for k in range(7) for w in product(TOKENS,repeat=k)]
    for _ in range(TRIALS):
        world=environment(rng)
        order=list(range(N));rng.shuffle(order)
        model=discover(lambda t,i:world[t][i],order)
        counts['training_queries']+=9
        for t in TOKENS:
            counts['heldout_total']+=1
            counts['heldout_pass']+=model[t][order[3]]==world[t][order[3]]
        programs=synthesize(model)
        assert len(programs)==8
        for goal,word in programs.items():
            counts['synthesis_total']+=1
            counts['synthesis_pass']+=tuple(execute(world,word,i) for i in range(N))==goal
            lengths[len(word)]+=1
        for word in words:
            predicted=IDENTITY
            for t in word: predicted=compose(predicted,model[t])
            counts['sequence_total']+=1
            counts['sequence_pass']+=predicted==tuple(execute(world,word,i) for i in range(N))
        counts['noncommuting_pairs']+=sum(compose(model[a],model[b])!=compose(model[b],model[a]) for a,b in product(TOKENS,repeat=2))
        if example is None:
            example={'probe_order':order,'learned':model,'programs':{''.join(w) or 'identity':p for p,w in programs.items()}}
        # Negative control: change only the withheld transition of one token
        # into a duplicate output. Training data cannot distinguish this world.
        broken=dict(world);t=TOKENS[0];p=list(world[t]);p[order[3]]=p[order[0]];broken[t]=tuple(p)
        wrong=discover(lambda t,i:broken[t][i],order)
        counts['negative_control_total']+=1
        counts['negative_control_detected_by_holdout']+=wrong[t][order[3]]!=broken[t][order[3]]
    print(json.dumps({'seed':SEED,'trials':TRIALS,'counts':counts,'shortest_program_length_counts':lengths,'example':example},indent=2))
if __name__=='__main__':main()
