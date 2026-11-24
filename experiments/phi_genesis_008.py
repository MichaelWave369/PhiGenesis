"""Bounded representation selection: no pretrained model, language or code mutation."""
import argparse
import json
from pathlib import Path
import numpy as np

N = 8
FAMILIES = ('linear', 'quadratic', 'lookup')
STATES = ((np.arange(256)[:, None] >> np.arange(N)) & 1).astype(float)
X = 2*STATES-1
LINEAR = np.column_stack((np.ones(256), X))
QUADRATIC = np.column_stack((LINEAR, *[X[:, i]*X[:, j] for i in range(N) for j in range(i+1,N)]))
# Lookup uses the first four observed bits; no oracle labels are available.
LOOKUP = np.eye(16)[np.arange(256)%16]
FEATURES = dict(zip(FAMILIES, (LINEAR, QUADRATIC, LOOKUP)))


def trial(seed, regime):
    rng = np.random.default_rng(seed)
    if regime == 'linear':
        y = LINEAR @ rng.normal(size=LINEAR.shape[1])
    elif regime == 'quadratic':
        y = QUADRATIC @ rng.normal(size=QUADRATIC.shape[1])
    elif regime == 'lookup':
        y = LOOKUP @ rng.normal(size=16)
    else:
        # Out-of-family: cubic interactions plus a lookup on a different subset.
        y = 2*X[:,0]*X[:,4]*X[:,7] + rng.normal(size=16)[np.arange(256)//16]
    order = rng.permutation(256)
    train, val, test = order[:64], order[64:96], order[96:]
    # Simulator adds noise at a scale determined by training inputs only.
    scale = max(y[train].std(),1e-12)
    observed = y[train] + rng.normal(0,.1*scale,len(train))
    center, scale = observed.mean(), max(observed.std(),1e-12)
    y = (y-center)/scale
    observed = (observed-center)/scale
    validation = y[val] + rng.normal(0,.1,len(val))
    scores, predictions = {}, {}
    for name, features in FEATURES.items():
        design = features[train]
        # All candidates receive identical observations and a fixed ridge penalty.
        w = np.linalg.solve(design.T@design + .1*np.eye(design.shape[1]), design.T@observed)
        scores[name] = float(np.mean((features[val]@w-validation)**2)) + .001*len(w)
        predictions[name] = features[test]@w
    selected = min(FAMILIES,key=scores.get)
    mse = {name:float(np.mean((p-y[test])**2)) for name,p in predictions.items()}
    mse['selected'] = mse[selected]
    mse['constant'] = float(np.mean((observed.mean()-y[test])**2))
    # Rejection signal is calibrated only on validation, not test.
    reject = scores[selected] > .35
    return dict(seed=seed,regime=regime,selected=selected,validation_scores=scores,mse=mse,rejected=bool(reject))


def run(seeds=90):
    if not 1 <= seeds <= 1000: raise ValueError('seeds must be 1..1000')
    rows = [trial(s,regime) for regime in (*FAMILIES,'novel') for s in range(seeds)]
    summary = {}
    for regime in (*FAMILIES,'novel'):
        group = [r for r in rows if r['regime']==regime]
        summary[regime] = {'mean_test_mse':{k:float(np.mean([r['mse'][k] for r in group])) for k in group[0]['mse']},
                          'selected_counts':{k:sum(r['selected']==k for r in group) for k in FAMILIES},
                          'rejected':sum(r['rejected'] for r in group)}
    familiar = [r for r in rows if r['regime']!='novel']
    return {'seeds_per_regime':seeds,'worlds':len(rows),'train':64,'validation':32,'test':160,
            'familiar_correct_selection':sum(r['selected']==r['regime'] for r in familiar),
            'familiar_mean_mse':{k:float(np.mean([r['mse'][k] for r in familiar])) for k in familiar[0]['mse']},
            'summary':summary,'trials':rows}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--seeds',type=int,default=90);p.add_argument('--output',type=Path);a=p.parse_args()
    result=run(a.seeds)
    if a.output: a.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='trials'},indent=2))
