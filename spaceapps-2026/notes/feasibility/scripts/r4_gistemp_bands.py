import numpy as np, glob, sys
from PIL import Image
sys.path.insert(0,'.')
from r4_gistemp import rob,bar,year
bands={'global':(-60,75),'Arctic 65-80N':(65,80),'N midlat 30-60N':(30,60),'Tropics 20S-20N':(-20,20),'S midlat 30-60S':(-60,-30)}
fs=sorted(glob.glob(sys.argv[1]+'/f*.png'))
pts={k:[(la,lo) for la in range(b[0],b[1]+1,3) for lo in range(-170,171,6)] for k,b in bands.items()}
print('year',*bands,sep=' | ')
for f in fs:
    im=Image.open(f); a=np.asarray(im.convert('RGB')).astype(float)
    cols,vals=bar(im); yr=year(im); out=[]
    for k,P in pts.items():
        v=[];w=[]
        for la,lo in P:
            x,y=rob(la,lo); p=a[y-2:y+3,x-2:x+3].reshape(-1,3).mean(0)
            d=((cols-p)**2).sum(1); 
            if d.min()**.5<40: v.append(vals[d.argmin()]); w.append(np.cos(np.radians(la)))
        out.append('%+.2f'%np.average(v,weights=w))
    print('%.0f'%yr,*out,sep=' | ')
