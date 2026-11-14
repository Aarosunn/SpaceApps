# R3: "which image made this sound" - simulate: sound = deterministic function of 8 global image features; listener = nearest neighbour in feature space.
import numpy as np, glob, itertools, colorsys
from PIL import Image, ImageFilter
D='data/'
def feat(im):
    im=im.convert('RGB').resize((256,int(256*im.size[1]/im.size[0]))); a=np.asarray(im).astype(float)/255
    mx=a.max(2); mn=a.min(2); s=(mx-mn)/(mx+1e-9); r,g,b=a[...,0],a[...,1],a[...,2]; d=mx-mn+1e-9
    h=(np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))/6)*2*np.pi
    w=s*mx; hx=(np.cos(h)*w).sum()/(w.sum()+1e-9); hy=(np.sin(h)*w).sum()/(w.sum()+1e-9)
    gray=np.asarray(im.convert('L')).astype(float)/255
    gx=np.abs(np.diff(gray,axis=1)).mean(); 
    yy,xx=np.mgrid[:gray.shape[0],:gray.shape[1]]; ws=gray.sum()+1e-9
    return np.array([mx.mean(),s.mean(),hx,hy,(gray<0.06).mean(),gx*10,(gray*yy/gray.shape[0]).sum()/ws,(gray*xx/gray.shape[1]).sum()/ws])
cls={}
def add(k,paths):
    for p in paths:
        try: cls.setdefault(k,[]).append(feat(Image.open(p)))
        except Exception as e: print('skip',p,e)
add('NightLights',sorted(glob.glob(D+'frames/s_0[0-4]*.png'))[::3]+[D+'frames/nlfull_0.png',D+'frames/nlfull_8.png',D+'frames/nlfull_12.png'])
add('SST',sorted(glob.glob(D+'sst/f*.tif')))
add('Lightning',sorted(glob.glob(D+'lit/f_*.png'))[3:])
add('CO2',sorted(glob.glob(D+'co2/c_*.png')))
singles={'Aerosols':[D+'img/Aerosols_2025-08-19T20_00_00_1920x1080.png'],'AirQuality':[D+'img/AirQuality_Sphere_1920x1080_0000.png',D+'img/AirQuality_WithLabels_1920x1080_0000.png'],'AtmRiver':[D+'img/atmos_river.0324_rfm23_2021-11-29_1351.04370_print.jpg'],'GEDI':[D+'img/GEDI_global.0900_print.jpg'],'PerpOcean':[D+'img/perpetual_ocean2_CLOSE_096_temperature.00000_print.jpg']}
for k,v in singles.items(): add(k,v)
allf=np.array([f for v in cls.values() for f in v]); mu=allf.mean(0); sd=allf.std(0)+1e-9
Z={k:(np.array(v)-mu)/sd for k,v in cls.items()}
print({k:len(v) for k,v in Z.items()})
multi=['NightLights','SST','Lightning','CO2']
# leave-one-out nearest centroid among 4 multi-frame classes
ok=0;n=0
for k in multi:
    for i in range(len(Z[k])):
        cent={m:(np.delete(Z[m],i,0) if m==k else Z[m]).mean(0) for m in multi}
        p=min(cent,key=lambda m:np.linalg.norm(Z[k][i]-cent[m])); ok+=p==k;n+=1
print('LOO nearest-centroid among the 4 animated resources: %d/%d = %.2f (chance .25)'%(ok,n,ok/n))
# 10-resource centroid distance table: min pairwise, and within-class spread
names=list(Z); cen={k:Z[k].mean(0) for k in names}
print('within-class mean distance to own centroid:',{k:round(float(np.linalg.norm(Z[k]-cen[k],axis=1).mean()),2) for k in multi})
dm=sorted([(round(float(np.linalg.norm(cen[a]-cen[b])),2),a,b) for a,b in itertools.combinations(names,2)])
print('closest centroid pairs:',dm[:5]); print('farthest:',dm[-3:])
# 4-choice simulation: sound features from one frame (held out), choose among 4 images (one per distinct resource), listener = nearest feature
rng=np.random.default_rng(0); trials=4000; hit=0
for _ in range(trials):
    ks=rng.choice(names,4,replace=False); t=rng.integers(4); k=ks[t]
    i=rng.integers(len(Z[k])); snd=Z[k][i]
    imgs=[]
    for j,m in enumerate(ks):
        if m==k: z=np.delete(Z[m],i,0) if len(Z[m])>1 else Z[m]; imgs.append(z[rng.integers(len(z))])
        else: imgs.append(Z[m][rng.integers(len(Z[m]))])
    hit+=int(np.argmin([np.linalg.norm(snd-x) for x in imgs])==t)
print('4-choice, distinct resources, listener=nearest in 8-feature space: %.2f (chance .25)'%(hit/trials))
# same but 4 frames from the same animation (frame-level discrimination)
for k in multi:
    hit=0;tr=1500
    for _ in range(tr):
        idx=rng.choice(len(Z[k]),4,replace=False); t=rng.integers(4); snd=Z[k][idx[t]]
        hit+=int(np.argmin([np.linalg.norm(snd-Z[k][i]+rng.normal(0,.0,8)) for i in idx])==t)
    print(k,'same-animation 4 frames: exact-match (noise-free) 1.00 by construction; mean pairwise z-dist between frames %.2f'%np.mean([np.linalg.norm(Z[k][a]-Z[k][b]) for a,b in itertools.combinations(range(len(Z[k])),2)]))
    break
for k in multi: print(k,'mean pairwise frame distance %.2f'%np.mean([np.linalg.norm(Z[k][a]-Z[k][b]) for a,b in itertools.combinations(range(len(Z[k])),2)]))
