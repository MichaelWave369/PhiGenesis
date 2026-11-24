"""Bounded signaling game. No pretrained models or externally assigned message meanings."""
import argparse
import json
import numpy as np


def softmax(x):
    e = np.exp(x-x.max(axis=-1, keepdims=True))
    return e/e.sum(axis=-1, keepdims=True)


def sample(rng, p):
    return (rng.random(p.shape[:-1])[...,None] > p.cumsum(axis=-1)).sum(axis=-1).clip(max=p.shape[-1]-1)


def run(seeds=90, steps=6000):
    if seeds < 1 or steps < 1:
        raise ValueError('positive seeds and steps required')
    rng = np.random.default_rng(6006)
    n = seeds
    idx = np.arange(n)[:,None]
    slots = np.arange(2)[None,:]
    worlds = np.array([(a,b) for a in range(3) for b in range(3)])
    sender_labels = np.array([[rng.permutation(3) for _ in range(2)] for _ in range(n)])
    receiver_labels = np.array([[rng.permutation(3) for _ in range(2)] for _ in range(n)])
    hold = rng.integers(9,size=n)
    train = np.array([np.delete(np.arange(9),h) for h in hold])
    # Distinct policies, initialized independently; only a scalar success reward is shared.
    s = rng.normal(0,.01,(n,2,3,3)); r = rng.normal(0,.01,(n,2,3,3))
    hs = rng.normal(0,.01,(n,9,9)); hr = rng.normal(0,.01,(n,9,9))
    base = np.zeros(n); hbase = np.zeros(n)
    eye3 = np.eye(3); eye9 = np.eye(9)
    for _ in range(steps):
        w = worlds[train[np.arange(n),rng.integers(8,size=n)]]
        x = sender_labels[idx,slots,w]; y = receiver_labels[idx,slots,w]
        ps = softmax(s[idx,slots,x]); m = sample(rng,ps)
        pr = softmax(r[idx,slots,m]); a = sample(rng,pr)
        reward = (a==y).all(axis=1).astype(float)
        advantage = (reward-base)[:,None,None]
        s[idx,slots,x] += .3*advantage*(eye3[m]-ps)
        r[idx,slots,m] += .3*advantage*(eye3[a]-pr)
        base += .03*(reward-base)
        hx = x[:,0]*3+x[:,1]; hy = y[:,0]*3+y[:,1]
        p = softmax(hs[np.arange(n),hx]); hm = sample(rng,p)
        q = softmax(hr[np.arange(n),hm]); ha = sample(rng,q)
        reward = (ha==hy).astype(float); adv = (reward-hbase)[:,None]
        hs[np.arange(n),hx] += .3*adv*(eye9[hm]-p)
        hr[np.arange(n),hm] += .3*adv*(eye9[ha]-q)
        hbase += .03*(reward-hbase)
    f = np.zeros((n,9)); h = f.copy(); scrambled = f.copy()
    for j,w in enumerate(worlds):
        x = sender_labels[idx,slots,w]; y = receiver_labels[idx,slots,w]
        m = s[idx,slots,x].argmax(axis=-1)
        a = r[idx,slots,m].argmax(axis=-1)
        f[:,j] = (a==y).all(axis=1)
        hm = hs[np.arange(n),x[:,0]*3+x[:,1]].argmax(axis=-1)
        h[:,j] = hr[np.arange(n),hm].argmax(axis=-1)==y[:,0]*3+y[:,1]
        # Exact uniform-message control over the same receiver policy.
        for u,v in worlds:
            a = r[idx,slots,np.array([u,v])].argmax(axis=-1)
            scrambled[:,j] += (a==y).all(axis=1)/9
    def summarize(a):
        seen = a[np.arange(n)[:,None],train].mean(axis=1)
        unseen = a[np.arange(n),hold]
        return {'seen_accuracy':float(seen.mean()),'unseen_accuracy':float(unseen.mean()),
                'perfect_worlds':int((a==1).all(axis=1).sum()),'unseen_successes':int((unseen==1).sum())}
    return {'seeds':n,'steps':steps,'factorized':summarize(f),'holistic':summarize(h),
            'random_message':summarize(scrambled),'uniform_guess_accuracy':1/9,
            'per_seed': [{'holdout':int(hold[i]),'factorized':f[i].tolist(),'holistic':h[i].tolist()} for i in range(n)]}


if __name__ == '__main__':
    p=argparse.ArgumentParser(); p.add_argument('--seeds',type=int,default=90); p.add_argument('--steps',type=int,default=6000); p.add_argument('--output'); args=p.parse_args()
    result=run(args.seeds,args.steps); data=json.dumps(result,indent=2)+'\n'
    if args.output:
        with open(args.output,'w',encoding='utf-8') as f: f.write(data)
    print(json.dumps({k:v for k,v in result.items() if k!='per_seed'},indent=2))
