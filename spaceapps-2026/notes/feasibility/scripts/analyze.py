import numpy as np, json, colorsys
from PIL import Image
D='data/'
P={ # name:(lat,lon,type)
'Amazon':(-3,-60,'land'),'Congo':(-1,23,'land'),'Borneo':(1,114,'land'),'Sahara':(23,10,'land'),
'Tokyo':(35.7,139.7,'land'),'Lagos':(6.5,3.4,'land'),'Chicago':(41.9,-87.6,'land'),'Cairo/Nile':(30,31,'land'),
'Siberia':(62,95,'land'),'IndoGangetic':(26.5,82,'land'),
'GulfStream':(38,-70,'sea'),'Kuroshio':(33,140,'sea'),'SouthernOcean':(-55,60,'sea'),'MidPacific':(0,-150,'sea')}
def win(a,W,H,x0,y0,mw,mh,lat,lon,r,lon0=-180):
    # equirect map occupying mw x mh px at (x0,y0)
    cx=x0+((lon-lon0)%360)/360*mw; cy=y0+(90-lat)/180*mh
    rx=r/360*mw; ry=r/180*mh
    return a[int(cy-ry):int(cy+ry)+1,int(cx-rx):int(cx+rx)+1]
nl={t:np.asarray(Image.open(D+f'frames/nlfull_{t}.png').convert('RGB')).astype(float) for t in (0,8,12)}
def lum(w): return w.mean(2)
out={}
for n,(lat,lon,ty) in P.items():
    o={}
    # night lights: left copy x0=0,mw=3840, map rows 120..2040 (mh=1920). lon0=-180
    r=3
    for t,k in ((0,'nl2012'),(8,'nl2023')):
        w=win(nl[t],0,0,0,0,3840,2160,lat,lon,r,lon0=-168.8); L=lum(w)
        o[k+'_mean']=L.mean(); o[k+'_p99']=np.percentile(L,99); o[k+'_frac40']=(L>40).mean()
    o['nl_dmean']=o['nl2023_mean']-o['nl2012_mean']
    w=win(nl[12],0,0,0,0,3840,2160,lat,lon,r,lon0=-168.8)  # change map: purple=new, orange=lost
    sgn=(w[...,2]-w[...,0]); br=w.max(2)
    m=br>45
    o['chg_signed_brightweighted']=float((sgn*br).sum()/(br.sum()+1e-9)) # >0 purple
    o['chg_frac_purple']=float(((sgn>10)&m).mean()); o['chg_frac_orange']=float(((sgn<-10)&m).mean())
    out[n]=o
json.dump(out,open(D+'nl_feats.json','w'),indent=1,default=float)
