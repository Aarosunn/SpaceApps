# R3: night-lights question pools + region-type separability. Run from notes/feasibility with python3 -I
import numpy as np, itertools, glob
from PIL import Image
D='data/'
def win(a,lat,lon,r,lon0=-168.8,mw=3840,mh=2160):
    cx=((lon-lon0)%360)/360*mw; cy=(90-lat)/180*mh; rx=r/360*mw; ry=r/180*mh
    return a[max(0,int(cy-ry)):int(cy+ry)+1,max(0,int(cx-rx)):int(cx+rx)+1]
nl={t:np.asarray(Image.open(D+f'frames/nlfull_{t}.png').convert('RGB')).astype(float) for t in (0,8,12)}
C={'Mumbai':(19,72.9),'Delhi':(28.6,77.2),'Dhaka':(23.8,90.4),'Beijing':(39.9,116.4),'Shanghai':(31.2,121.5),'Lagos':(6.5,3.4),'Kinshasa':(-4.3,15.3),
'Cairo':(30,31.2),'Damascus':(34,38),'Kyiv':(50.4,30.5),'Paris':(48.9,2.3),'London':(51.5,-0.1),'NewYork':(40.7,-74),'LosAngeles':(34,-118.2),
'SaoPaulo':(-23.5,-46.6),'MexicoCity':(19.4,-99.1),'Tehran':(35.7,51.4),'Riyadh':(24.7,46.7),'Johannesburg':(-26.2,28),'Sydney':(-33.9,151.2),'Moscow':(55.7,37.6),
'Chicago':(41.9,-87.6),'Tokyo':(35.7,139.7),'Seoul':(37.5,127),'Jakarta':(-6.2,106.8),'Manila':(14.6,121),'Addis':(9,38.7),'Nairobi':(-1.3,36.8),
'Karachi':(24.9,67),'Bangkok':(13.8,100.5),'Hanoi':(21,105.8),'Lahore':(31.5,74.3),'Kolkata':(22.6,88.4),'Bangalore':(13,77.6),'Istanbul':(41,29),'Madrid':(40.4,-3.7),'Rome':(41.9,12.5),
'Berlin':(52.5,13.4),'Athens':(38,23.7),'Lima':(-12,-77),'Bogota':(4.7,-74),'BuenosAires':(-34.6,-58.4),'Toronto':(43.7,-79.4),'Houston':(29.8,-95.4),'Miami':(25.8,-80.2),
'Accra':(5.6,-0.2),'Luanda':(-8.8,13.2),'Dar es Salaam':(-6.8,39.3),'Kampala':(0.3,32.6),'Baghdad':(33.3,44.4),'Kabul':(34.5,69.2),'Tashkent':(41.3,69.2),'Almaty':(43.2,76.9),'Ho Chi Minh':(10.8,106.7),'Kuala Lumpur':(3.1,101.7),'Osaka':(34.7,135.5),'Melbourne':(-37.8,145),'Caracas':(10.5,-66.9),'Santiago':(-33.5,-70.7),'Aleppo':(36.2,37.2),'Kharkiv':(50,36.2),'Odesa':(46.5,30.7),'Donetsk':(48,37.8),'Lviv':(49.8,24)}
def nlf(lat,lon,r=1.5):
    a=win(nl[0],lat,lon,r).mean(2); b=win(nl[8],lat,lon,r).mean(2); c=win(nl[12],lat,lon,r)
    bg=np.percentile(a,20); la=np.clip(a-bg-3,0,None).sum(); lb=np.clip(b-bg-3,0,None).sum()
    sg=c[...,2]-c[...,0]; m=c.max(2)>45
    return la,lb,(lb-la)/(la+1e-6),float(((sg>10)&m).mean()),float(((sg<-10)&m).mean()),float(np.percentile(b,99))
R={n:nlf(*ll,) for n,ll in C.items()}
lit=[n for n in R if R[n][0]>1500]
print('cities',len(C),'with 2012 lights above floor >1500:',len(lit))
rel={n:R[n][2] for n in lit}
ch=np.array([rel[n] for n in lit]); cm=np.array([R[n][3]-R[n][4] for n in lit])
print('sign(rel) vs sign(changemap purple-orange): agree %.2f ; |rel|>=0.25 : %d / %d ; up>=+25%%: %d ; down<=-15%%: %d'%(np.mean(np.sign(ch)==np.sign(cm)),(abs(ch)>=.25).sum(),len(ch),(ch>=.25).sum(),(ch<=-.15).sum()))
# then-vs-now rounds: city with |rel|>=0.30 AND change-map sign agrees
tv=[n for n in lit if abs(rel[n])>=.30 and np.sign(rel[n])==np.sign(R[n][3]-R[n][4])]
print('then-vs-now rounds (|rel|>=30% & change-map agrees):',len(tv)); print({n:round(rel[n],2) for n in sorted(tv,key=lambda n:rel[n])})
# which-has-more across time: pairs with gap >=0.30 and both agreeing signs rank
pairs=[(a,b) for a,b in itertools.combinations(lit,2) if abs(rel[a]-rel[b])>=.30]
print('pairs total',len(lit)*(len(lit)-1)//2,'with change gap>=30pts:',len(pairs),'>=50pts:',sum(abs(rel[a]-rel[b])>=.5 for a,b in itertools.combinations(lit,2)))
# static "which has more light" 2023: log-lights gap >= 2x
L23={n:R[n][1] for n in lit}
sp=[(a,b) for a,b in itertools.combinations(lit,2) if max(L23[a],L23[b])>=2*min(L23[a],L23[b])]
print('static 2023 pairs with >=2x light-sum ratio:',len(sp),'of',len(lit)*(len(lit)-1)//2,' >=4x:',sum(max(L23[a],L23[b])>=4*min(L23[a],L23[b]) for a,b in itertools.combinations(lit,2)))
# rank-3: triples with all pairwise gaps >=25 pts
tr=[t for t in itertools.combinations(lit,3) if all(abs(rel[x]-rel[y])>=.25 for x,y in itertools.combinations(t,2))]
print('rank-3 triples (all pairwise >=25 pts):',len(tr),'of',len(list(itertools.combinations(lit,3))))
# odd one out: 2 up-ish (>=+25%) one down (<=-15%) or reverse
up=[n for n in lit if rel[n]>=.25]; dn=[n for n in lit if rel[n]<=-.15]
ooo=len(list(itertools.combinations(up,2)))*len(dn)+len(list(itertools.combinations(dn,2)))*len(up)
print('odd-one-out triples (2 up + 1 down or v.v.):',ooo,' (ups',len(up),'downs',len(dn),')')
print('downs:',{n:round(rel[n],2) for n in dn})
# region type separability: NL p99/floor + SST validity + lightning
pts={'city':[('Chicago',41.9,-87.6),('Tokyo',35.7,139.7),('Delhi',28.6,77.2),('Lagos',6.5,3.4),('Cairo',30,31.2)],
'ocean':[('MidPac',0,-150),('SouthAtl',-35,-20),('Indian',-20,80),('NPacific',35,-150),('SouthernOc',-55,60)],
'desert':[('Sahara',23,10),('Gobi',42,105),('RubAlKhali',20,50),('Outback',-25,133),('Atacama',-23,-69)],
'forest':[('Amazon',-3,-60),('Congo',-1,23),('Borneo',1,114),('Taiga',62,95),('Canada boreal',55,-100)]}
print('\nregion type: name | NL p99(2023) | NL mean floor | ')
for k,v in pts.items():
    for n,la,lo in v:
        b=win(nl[8],la,lo,2).mean(2); print(f'{k:7s}{n:14s} p99 {np.percentile(b,99):6.1f} median {np.median(b):5.1f} frac>40 {np.mean(b>40):.4f}')
