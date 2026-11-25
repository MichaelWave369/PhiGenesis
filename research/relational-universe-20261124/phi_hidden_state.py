"""PhiGenesis: predictive memory and reset intervention. Python 3 standard library."""
import math, random, json
from pathlib import Path
from collections import Counter
SEED=369
TRIALS=369
TRAIN=96
TEST=256
RESET=16

def fit(seq,k):
    # Common training target window for comparable BIC values.
    counts=[[0,0] for _ in range(2**k)]
    for t in range(2,len(seq)):
        ctx=sum(seq[t-k+i] << (k-i-1) for i in range(k))
        counts[ctx][seq[t]]+=1
    ll=sum(n*math.log(n/sum(c)) for c in counts for n in c if n)
    bic=-2*ll+2**k*math.log(len(seq)-2)
    # Jeffreys smoothing for held-out predictions.
    probs=[(c[1]+.5)/(sum(c)+1) for c in counts]
    return bic,probs

def evaluate(seq,k,probs):
    loss=acc=0.
    for t in range(TRAIN,TRAIN+TEST):
        ctx=sum(seq[t-k+i] << (k-i-1) for i in range(k))
        p=probs[ctx]; y=seq[t]
        loss-=math.log2(p if y else 1-p)
        acc += .5 if p==.5 else int((p>.5)==bool(y))
    return loss/TEST,acc/TEST

def run():
    rng=random.Random(SEED)
    names=['fresh_iid','fixed_tape','alternating','period_0011','persistent_markov','noisy_hidden_alternator']
    out={n:dict(orders=Counter(),loss=0.,baseline_loss=0.,accuracy=0.,reset_matches=0) for n in names}
    def bits(n):return [rng.randrange(2) for _ in range(n)]
    for _ in range(TRIALS):
        length=TRAIN+TEST
        tape=bits(length)
        phase=rng.randrange(2); phase4=rng.randrange(4); h=rng.randrange(2)
        alternating=[(i+phase)%2 for i in range(length)]
        periodic=[(0,0,1,1)[(i+phase4)%4] for i in range(length)]
        markov=[rng.randrange(2)]
        for i in range(1,length):markov.append(markov[-1]^int(rng.random()<.1))
        noisy=[((i+h)%2)^int(rng.random()<.1) for i in range(length)]
        # The first two passive traces are deliberately coupled to demonstrate identical observations.
        # RESET rewinds tape/cycle phase or resets visible position; noise is freshly sampled.
        # Markov resets its initial state, but subsequent flips are fresh.
        markov_reset=[markov[0]]
        for i in range(1,RESET):markov_reset.append(markov_reset[-1]^int(rng.random()<.1))
        noisy_reset=[((i+h)%2)^int(rng.random()<.1) for i in range(RESET)]
        worlds=[(tape,bits(RESET)),(tape,tape[:RESET]),(alternating,alternating[:RESET]),(periodic,periodic[:RESET]),(markov,markov_reset),(noisy,noisy_reset)]
        for name,(seq,replay) in zip(names,worlds):
            fits=[fit(seq[:TRAIN],k) for k in range(3)]
            k=min(range(3),key=lambda k:fits[k][0])
            loss,acc=evaluate(seq,k,fits[k][1]); base,_=evaluate(seq,0,fits[0][1])
            row=out[name];row['orders'][k]+=1;row['loss']+=loss;row['baseline_loss']+=base;row['accuracy']+=acc;row['reset_matches']+=int(seq[:RESET]==replay)
    for row in out.values():
        for key in ['loss','baseline_loss','accuracy']:row[key]/=TRIALS
        row['orders']={str(k):row['orders'][k] for k in range(3)}
    assert all(out['fresh_iid'][k]==out['fixed_tape'][k] for k in ['orders','loss','baseline_loss','accuracy'])
    assert all(out[n]['reset_matches']==TRIALS for n in ['fixed_tape','alternating','period_0011'])
    return {'seed':SEED,'trials_per_family':TRIALS,'training_bits':TRAIN,'test_bits':TEST,'reset_bits':RESET,'families':out}

if __name__=='__main__':
    result=run(); print(json.dumps(result,indent=2)); Path(__file__).with_name('phi_hidden_state_results.json').write_text(json.dumps(result,indent=2)+'\n')
