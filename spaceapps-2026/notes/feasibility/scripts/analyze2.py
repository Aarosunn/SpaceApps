import numpy as np, json, colorsys, itertools
from PIL import Image
D='data/'
P={'Amazon':(-3,-60),'Congo':(-1,23),'Borneo':(1,114),'Sahara':(23,10),'Tokyo':(35.7,139.7),'Lagos':(6.5,3.4),'Chicago':(41.9,-87.6),
'Cairo/Nile':(30,31),'Siberia':(62,95),'IndoGangetic':(26.5,82),'GulfStream':(38,-70),'Kuroshio':(34,148),'SouthernOcean':(-55,60),'MidPacific':(0,-150)}
def win(a,x0,y0,mw,mh,lat,lon,r,lon0=-180):
    cx=x0+((lon-lon0)%360)/360*mw; cy=y0+(90-lat)/180*mh
    rx=r/360*mw; ry=r/180*mh
    return a[max(0,int(cy-ry)):int(cy+ry)+1,max(0,int(cx-rx)):int(cx+rx)+1]
# --- SST decode
cb=np.asarray(Image.open(D+'img/sst_ecco2_cbar.png').convert('RGB'))[40,14:292].astype(float)/255
cbh=np.array([colorsys.rgb_to_hsv(*c)[0] for c in cb]); cbt=np.linspace(0,32,len(cb))
def hue2t(h): # hue decreasing with temp
    o=np.argsort(cbh); return np.interp(h,cbh[o],cbt[o])
def sst(path,lat,lon,r=3):
    a=np.asarray(Image.open(path).convert('RGB')).astype(float)/255
    w=win(a,0,0,2048,1024,lat,lon,r).reshape(-1,3)
    hsv=np.array([colorsys.rgb_to_hsv(*p) for p in w[::3]])
    ocean=(hsv[:,1]>0.5)&(hsv[:,2]>0.35)   # saturated bright streak pixels = ocean data
    land=(hsv[:,1]<0.15)&(hsv[:,2]>0.12)&(hsv[:,2]<0.4)
    t=hue2t(hsv[ocean,0]) if ocean.sum()>20 else np.array([np.nan])
    return dict(ocean_px=float(ocean.mean()),land_px=float(land.mean()),T_mean=float(np.nanmean(t)),T_sd=float(np.nanstd(t)))
# --- aerosol: 1920x1080 full-frame equirect
A=np.asarray(Image.open(D+'img/Aerosols_2025-08-19T20_00_00_1920x1080.png').convert('RGB')).astype(float)/255
def aer(lat,lon,r=3):
    w=win(A,0,0,1920,1080,lat,lon,r).reshape(-1,3)
    R,G,B=w.T; mx=w.max(1)
    return dict(dust=float(np.mean((B>G+0.08)&(R>G+0.02))),sulf=float(np.mean((G>R+0.15)&(G>B+0.15)&(G>0.35))),bc=float(np.mean((R>G+0.12)&(R>B+0.12))),bright=float(mx.mean()),R=float(R.mean()),G=float(G.mean()),B=float(B.mean()))
# --- lightning flat 1024x512
L=np.asarray(Image.open(D+'img/iss_lightning_sos_yearly_debug_2023_sos_2048p60.00420_print.jpg').convert('RGB')).astype(int)
def lig(lat,lon,r=10):
    w=win(L,0,0,1024,512,lat,lon,r).reshape(-1,3)
    y=(w[:,0]>100)&(w[:,1]>100)&(w[:,2]<70)&(w[:,0]-w[:,2]>70)
    return dict(lightning_px=int(y.sum()),lightning_frac=float(y.mean()))
res={}
for n,(la,lo) in P.items():
    o={}
    for k in ('23000','25000','27000'):
        p=D+('sst/f%s.tif'%k if k!='25000' else 'img/flat_global_ecco2_2028x1024.25000.jpg')
        s=sst(p,la,lo); o['sst'+k]=s
    o['aer']=aer(la,lo); o['lig']=lig(la,lo)
    res[n]=o
json.dump(res,open(D+'feats2.json','w'),indent=1)
for n,o in res.items():
    s=o['sst25000']; a=o['aer']
    print(f"{n:14s} SST ocean={s['ocean_px']:.2f} land={s['land_px']:.2f} T={s['T_mean']:5.1f}C (Mar07 {o['sst23000']['T_mean']:5.1f}, Sep07 {o['sst27000']['T_mean']:5.1f}) | aer dust={a['dust']:.2f} sulf={a['sulf']:.2f} bc={a['bc']:.2f} bright={a['bright']:.2f} | lightning px={o['lig']['lightning_px']}")
