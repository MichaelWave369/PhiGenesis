import numpy as np

# All symbols start with equal value. Training feedback is one success bit.
SEEDS=60
STEPS=12000
TRAIN=np.array([i for i in range(9) if i//3 != i%3])
TEST=np.array([0,4,8])

def simulate(factor,seed):
    rng=np.random.default_rng(seed)
    n=SEEDS; k=2 if factor else 1; m=3 if factor else 9
    send=np.zeros((n,k,m,m)); recv=np.zeros_like(send)
    ix=np.arange(n)[:,None]; slot=np.arange(k)[None,:]
    def choose(q,eps):
        # Random tie-breaking, then epsilon exploration.
        best=(q==q.max(axis=-1,keepdims=True))
        greedy=(rng.random(q.shape)*best).argmax(axis=-1)
        return np.where(rng.random(greedy.shape)<eps,rng.integers(m,size=greedy.shape),greedy)
    def distribution(q):
        b=q==q.max(axis=-1,keepdims=True)
        return b/b.sum(axis=-1,keepdims=True)
    def evaluate(objects):
        acc=[]
        for o in objects:
            x=np.array([o//3,o%3] if factor else [o])
            ps=distribution(send[:,np.arange(k),x,:])
            pr=distribution(recv)[:,:,:, :]
            # pr advanced-index shape can differ; explicitly gather targets.
            correct=np.stack([pr[:,i,:,v] for i,v in enumerate(x)],axis=1)
            acc.append((ps*correct).sum(-1).prod(-1))
        return np.mean(acc,axis=0)
    checkpoints={}
    for step in range(STEPS+1):
        if step in (0,1000,3000,6000,12000):
            checkpoints[step]=(evaluate(TRAIN).mean(),evaluate(TEST).mean())
        if step==STEPS: break
        o=rng.choice(TRAIN,size=n)
        x=np.stack([o//3,o%3],1) if factor else o[:,None]
        eps=.20 if step<9000 else .08
        s=choose(send[ix,slot,x],eps)
        y=choose(recv[ix,slot,s],eps)
        reward=(y==x).all(1)[:,None]
        send[ix,slot,x,s]+=.1*(reward-send[ix,slot,x,s])
        recv[ix,slot,s,y]+=.1*(reward-recv[ix,slot,s,y])
    tr,te=evaluate(TRAIN),evaluate(TEST)
    print('factorized' if factor else 'atomic',checkpoints,'perfect train',sum(tr==1),'perfect test',sum(te==1))
    print('example seed index 0 sender',send[0].argmax(-1),'receiver',recv[0].argmax(-1))
    if factor:
        enc=send.argmax(-1); dec=recv.argmax(-1)
        cross=[]; exact=0
        for a in range(n):
            for b in range(n):
                if a==b: continue
                scores=[dec[b,0,enc[a,0,o//3]]==o//3 and dec[b,1,enc[a,1,o%3]]==o%3 for o in range(9)]
                cross.append(np.mean(scores)); exact+=all(scores)
        print("cross pair accuracy",np.mean(cross),"perfect pairs",exact,"of",len(cross),"distinct dictionaries",len({tuple(x.flatten()) for x in enc}))
    return tr,te

if __name__=='__main__':
    simulate(False,369)
    simulate(True,369)
