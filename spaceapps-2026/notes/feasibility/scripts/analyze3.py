import numpy as np, json, itertools
from PIL import Image
D='data/'
f2=json.load(open(D+'feats2.json')); nf=json.load(open(D+'nl_feats.json'))
# re-run NL for adjusted Kuroshio
def win(a,lat,lon,r,lon0=-168.8,mw=3840,mh=2160):
    cx=((lon-lon0)%360)/360*mw; cy=(90-lat)/180*mh
    rx=r/360*mw; ry=r/180*mh
    return a[max(0,int(cy-ry)):int(cy+ry)+1,max(0,int(cx-rx)):int(cx+rx)+1]
nl={t:np.asarray(Image.open(D+f'frames/nlfull_{t}.png').convert('RGB')).astype(float) for t in (0,8,12)}
def nlf(lat,lon,r=2):
    a=win(nl[0],lat,lon,r).mean(2); b=win(nl[8],lat,lon,r).mean(2); c=win(nl[12],lat,lon,r)
    bg=np.percentile(np.concatenate([a.ravel()]),20)
    la=np.clip(a-bg-3,0,None).sum(); lb=np.clip(b-bg-3,0,None).sum()  # "lights above floor"
    sg=(c[...,2]-c[...,0]); br=c.max(2); m=br>45
    return dict(L12=float(la),L23=float(lb),rel=float((lb-la)/(la+1e-6)),purple=float(((sg>10)&m).mean()),orange=float(((sg<-10)&m).mean()),p99_23=float(np.percentile(b,99)), npx=a.size)
C={'Mumbai':(19,72.9),'Delhi':(28.6,77.2),'Dhaka':(23.8,90.4),'Beijing':(39.9,116.4),'Shanghai':(31.2,121.5),'Lagos':(6.5,3.4),'Kinshasa':(-4.3,15.3),
'Cairo':(30,31.2),'Damascus/Syria':(34,38),'Kyiv':(50.4,30.5),'Paris':(48.9,2.3),'London':(51.5,-0.1),'NewYork':(40.7,-74),'LosAngeles':(34,-118.2),
'SaoPaulo':(-23.5,-46.6),'MexicoCity':(19.4,-99.1),'Tehran':(35.7,51.4),'Riyadh':(24.7,46.7),'Johannesburg':(-26.2,28),'Sydney':(-33.9,151.2),'Moscow':(55.7,37.6),
'Chicago':(41.9,-87.6),'Tokyo':(35.7,139.7),'Seoul':(37.5,127),'Jakarta':(-6.2,106.8),'Manila':(14.6,121),'Addis':(9,38.7),'Nairobi':(-1.3,36.8),'Sahara':(23,10),'MidPacific':(0,-150),'Amazon':(-3,-60)}
R={n:nlf(*ll) for n,ll in C.items()}
print('NIGHT LIGHTS 2012->2023 (window +-2deg). rel=(L23-L12)/L12 from the two year-frames; purple/orange = share of lit px in the change-map frame')
for n,o in sorted(R.items(),key=lambda kv:-kv[1]['rel']):
    print(f"{n:15s} L12={o['L12']:9.0f} L23={o['L23']:9.0f} rel={o['rel']:+.2f} purple={o['purple']:.3f} orange={o['orange']:.3f}")

names=[n for n in R if R[n]['L12']>1000]
a=np.array([R[n]['rel'] for n in names]); b=np.array([R[n]['purple']-R[n]['orange'] for n in names])
ra=a.argsort().argsort(); rb=b.argsort().argsort()
print('n lit places',len(names),'spearman rel vs changemap',np.corrcoef(ra,rb)[0,1])
print('sign agreement',np.mean(np.sign(a)==np.sign(b)), 'places |rel|>0.25:',int((abs(a)>0.25).sum()),'of',len(a),' |rel|<0.15:',int((abs(a)<0.15).sum()))
# pairs of the 31: how big are differences between random pairs
import random; random.seed(1)
d=[abs(R[x]['rel']-R[y]['rel']) for x,y in itertools.combinations(names,2)]
print('pairwise |rel diff| median',np.median(d),'frac<0.15',np.mean(np.array(d)<0.15))
# static-noise floor: 2012 vs 2023 abs diff in dark places
print('dark-place luminance diffs (Sahara/MidPacific):',R['Sahara'],R['MidPacific'])
