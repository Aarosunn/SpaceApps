# R3: SST season / then-vs-now / frame-to-frame. Run from notes/feasibility: python3 -I scripts/r3_sst.py
import numpy as np, colorsys
from PIL import Image
D='data/'
cb=np.asarray(Image.open(D+'img/sst_ecco2_cbar.png').convert('RGB'))[40,14:292].astype(float)/255
cbh=np.array([colorsys.rgb_to_hsv(*c)[0] for c in cb]); cbt=np.linspace(0,32,len(cb)); o=np.argsort(cbh)
def decode(path):
    a=np.asarray(Image.open(path).convert('RGB')).astype(float)/255
    mx=a.max(2); mn=a.min(2); s=(mx-mn)/(mx+1e-9)
    ok=(s>0.5)&(mx>0.35)
    r,g,b=a[...,0],a[...,1],a[...,2]
    # vectorised hue
    d=mx-mn+1e-9
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))/6
    T=np.interp(h,cbh[o],cbt[o]); T[~ok]=np.nan
    return T
F={'Mar07':'sst/f23000.tif','Mar07+1d':'sst/f23024.tif','Mar07+7d':'sst/f23168.tif','Jun07':'sst/f25000.tif','Sep07':'sst/f27000.tif','Dec07':'sst/f29000.tif'}
T={k:decode(D+v) for k,v in F.items()}
def band(t,l0,l1):
    r0=int((90-l1)/180*1024); r1=int((90-l0)/180*1024); return np.nanmean(t[r0:r1])
print('Band means (decoded C):  NH30-60 | SH30-60 | trop(-20..20) | NH-SH asym')
for k,t in T.items():
    n=band(t,30,60); s=band(t,-60,-30); tr=band(t,-20,20)
    print(f'{k:9s} {n:6.2f} {s:6.2f} {tr:6.2f}  asym={n-s:6.2f}')
# season identification: asym separates the 4 seasons?
# places: seasonal then-vs-now (Mar vs Sep) and which-warmer
P={'GulfStream':(38,-70),'Kuroshio':(34,148),'Mediterranean':(35,18),'NorthSea':(56,3),'Baltic?':(58,20),'SouthernOcean':(-55,60),'MidPacific':(0,-150),'Arabian Sea':(15,65),'CoralSea':(-18,152),'Tasman':(-40,160),'Benguela':(-25,5),'Humboldt':(-20,-80),'Labrador':(55,-50),'Sargasso':(28,-60),'Bering':(58,-175),'GulfAlaska':(52,-145),'Caribbean':(15,-75),'Indian eq':(-5,80),'S Atlantic':(-35,-20),'Peru upwelling':(-10,-82)}
def pt(t,lat,lon,r=3):
    cx=int((lon+180)/360*2048); cy=int((90-lat)/180*1024); rx=int(r/360*2048); ry=int(r/180*1024)
    w=t[cy-ry:cy+ry+1,cx-rx:cx+rx+1]; return np.nanmean(w) if np.isfinite(w).sum()>20 else np.nan
print('\nplace  Mar Jun Sep Dec  (swing)')
rows=[]
for n,(la,lo) in P.items():
    v=[pt(T[k],la,lo) for k in ('Mar07','Jun07','Sep07','Dec07')]
    rows.append((n,v)); print(f'{n:15s}',' '.join(f'{x:5.1f}' for x in v),f' swing={np.nanmax(v)-np.nanmin(v):.1f}')
# then-vs-now: Mar vs Sep delta, |delta|>=3 count
d=[(n,v[2]-v[0]) for n,v in rows if np.isfinite(v).all()]
print('\nMar->Sep delta C:',sorted([(n,round(x,1)) for n,x in d],key=lambda z:z[1]))
print('|delta|>=3C places:',sum(abs(x)>=3 for _,x in d),'of',len(d))
# which-warmer pairs gap
vals={n:np.nanmean(v) for n,v in rows if np.isfinite(v).all()}
import itertools
g=[abs(vals[a]-vals[b]) for a,b in itertools.combinations(vals,2)]
print('annual-mean-of-4-frames pair gap: median %.1f C, frac>=4C %.2f, frac>=6C %.2f, n_pairs %d'%(np.median(g),np.mean(np.array(g)>=4),np.mean(np.array(g)>=6),len(g)))
# frame-to-frame: 10x10deg block mean change
def blocks(t,s=10):
    H,W=t.shape; bh=int(s/180*H); bw=int(s/360*W)
    return np.array([[np.nanmean(t[i:i+bh,j:j+bw]) if np.isfinite(t[i:i+bh,j:j+bw]).sum()>50 else np.nan for j in range(0,W-bw+1,bw)] for i in range(0,H-bh+1,bh)])
B={k:blocks(v) for k,v in T.items()}
for a,b in [('Mar07','Mar07+1d'),('Mar07','Mar07+7d'),('Mar07','Jun07'),('Mar07','Sep07')]:
    d=np.abs(B[a]-B[b]); print(f'10deg-block mean |dT| {a}->{b}: median {np.nanmedian(d):.2f} C, 90th pct {np.nanpercentile(d,90):.2f} C, n={np.isfinite(d).sum()}')
# pixel-level streak flicker between consecutive-day frames
a=T['Mar07'];b=T['Mar07+1d']; m=np.isfinite(a)&np.isfinite(b)
print('pixel-level valid in both %.2f ; median |dT| per pixel 1 day %.2f C'%(m.mean(),np.median(np.abs(a-b)[m])))
