# R3: lightning regions x time, aerosol tile dominance, CO2 orange fraction over frames. Run from notes/feasibility with python3 -I
import numpy as np, glob, itertools, colorsys
from PIL import Image
D='data/'
# ---- lightning (2048x1024 equirect, lon -180..180 assumed from visual check)
fs=sorted(glob.glob(D+'lit/f_*.png'),key=lambda f:float(f.split('f_')[1][:-4]))
Y=[]
for f in fs:
    a=np.asarray(Image.open(f).convert('RGB')).astype(int)
    Y.append((a[...,0]>150)&(a[...,1]>130)&(a[...,2]<80))
Y=np.array(Y); print('lightning frames',len(Y),'total dots/frame median',int(np.median(Y.sum((1,2)))))
def reg(la0,la1,lo0,lo1):
    r0=int((90-la1)/180*1024);r1=int((90-la0)/180*1024);c0=int((lo0+180)/360*2048);c1=int((lo1+180)/360*2048); return Y[:,r0:r1,c0:c1].sum((1,2))
R={'Congo':(-8,5,12,30),'Amazon':(-12,3,-72,-50),'USGreatPlains':(30,42,-103,-85),'Australia':(-30,-15,125,150),'Himalaya/NIndia':(22,32,75,95),'Maritime Cont.':(-8,8,95,125),'Argentina':(-38,-25,-65,-55),'Sahara':(18,28,-5,25),'Mediterr.':(34,44,5,30),'Europe N':(48,58,0,30),'Arctic Siberia':(60,70,60,120),'Tibet':(30,36,80,95)}
S={k:reg(*v) for k,v in R.items()}
print('region mean dots/frame (min..max across frames):')
for k,v in S.items(): print(f'  {k:16s} mean {v.mean():7.1f} min {v.min():5d} max {v.max():5d}')
tot=Y.sum((1,2)).astype(float)
nh=Y[:,:512].sum((1,2)); sh=Y[:,512:].sum((1,2)); ratio=(nh+1)/(sh+1)
valid=tot>3000
print('NH/SH ratio over frames with >3000 dots: min %.2f max %.2f ; frames NH-dominant(>2):%d SH-dominant(<0.5):%d ambiguous:%d of %d'%(ratio[valid].min(),ratio[valid].max(),(ratio[valid]>2).sum(),(ratio[valid]<0.5).sum(),((ratio[valid]>=0.5)&(ratio[valid]<=2)).sum(),valid.sum()))
# pair questions: A>B by >=2x in how many (pair,frame) combos; flip rate
keys=list(S); good=0;flip=0;tp=0
for a,b in itertools.combinations(keys,2):
    A=S[a][valid];B=S[b][valid]; tp+=1
    dec=((A>=2*B+10)|(B>=2*A+10)).mean(); good+=dec
    if ((A>B).mean()>0.2) and ((A>B).mean()<0.8): flip+=1
print('pairs',tp,'mean frac of frames where one region has >=2x+10 more: %.2f ; pairs whose winner flips with season: %d'%(good/tp,flip))
# frame-to-frame: dot count change between successive samples (2.5s apart)
print('abs rel change of total dots between samples median %.2f'%np.median(np.abs(np.diff(tot[valid]))/tot[valid][:-1]))
# lat-centroid per frame vs NH/SH
# ---- aerosol tile dominance
A=np.asarray(Image.open(D+'img/Aerosols_2025-08-19T20_00_00_1920x1080.png').convert('RGB')).astype(float)/255
H,W,_=A.shape; mx=A.max(2); mn=A.min(2); s=(mx-mn)/(mx+1e-9)
r,g,b=A[...,0],A[...,1],A[...,2]; d=mx-mn+1e-9
h=(np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60)
bright=(mx>0.4)&(s>0.3)
cls=np.full((H,W),-1)
cls[bright&((h<35)|(h>335))]=0   # black carbon
cls[bright&(h>=70)&(h<170)]=1    # sulfate
cls[bright&(h>=250)&(h<=320)]=2  # dust
cls[(mx>0.3)&(s>0.08)&(s<0.35)&(h>=160)&(h<230)]=3 # sea salt (weak)
names=['blackC','sulfate','dust','seasalt']
print('\nAerosol still: share of pixels per class (excl. bottom 12%% rows):',{n:round(float((cls[:int(H*.88)]==i).mean()),3) for i,n in enumerate(names)})
ts=H//12 # 90px tile=15deg
dom=[];
for i in range(0,int(H*.88)-ts+1,ts):
    for j in range(0,W-ts+1,ts):
        t=cls[i:i+ts,j:j+ts]; c=np.bincount(t[t>=0],minlength=4) if (t>=0).any() else np.zeros(4)
        tot_=ts*ts
        dom.append((c.argmax() if c.sum()>0.15*tot_ else -1,c.max()/max(c.sum(),1),c.sum()/tot_))
dom=np.array(dom)
for i,n in enumerate(names):
    m=(dom[:,0]==i); print(f'  tiles dominated by {n}: {m.sum()} ; of those with purity>=0.7: {(m&(dom[:,1]>=0.7)).sum()}')
print('  tiles with no class >=15%% coverage: %d of %d'%((dom[:,0]==-1).sum(),len(dom)))
# ---- CO2: orange fraction per frame
cf=sorted(glob.glob(D+'co2/c_*.png'))
o=[]
for f in cf:
    a=np.asarray(Image.open(f).convert('RGB')).astype(float)/255
    r,g,b=a[...,0],a[...,1],a[...,2]
    org=(r>0.55)&(r>g*1.5)&(g>0.1)&(b<0.35)&(r-b>0.35)
    lum=a.mean(2); o.append((org.mean(),lum.mean(),(lum>0.08).mean()))
o=np.array(o); print('\nCO2 40 frames (1/s): orange-plume fraction min %.4f med %.4f max %.4f ; ratio max/min %.1f ; mean lum %.3f..%.3f'%(o[:,0].min(),np.median(o[:,0]),o[:,0].max(),o[:,0].max()/max(o[:,0].min(),1e-6),o[:,1].min(),o[:,1].max()))
print('orange frac per frame (every 3rd):',np.round(o[::3,0],4))
