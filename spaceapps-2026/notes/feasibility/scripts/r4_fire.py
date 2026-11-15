import numpy as np
from PIL import Image
a=np.asarray(Image.open('../data/r4/fire.jpg').convert('RGB')).astype(int)
red=(a[:,:,0]>180)&(a[:,:,1]<110)&(a[:,:,2]<80)
res={}
for yr in range(1983,2026):
    x=int(round(203+40.1*(yr-1983)))
    col=red[100:950,x-6:x+7].mean(1)
    ys=np.where(col>0.8)[0]
    top=ys.min()+100
    res[yr]=(952-top)/81.3
    print(yr,'%.1f'%res[yr],end='; ')
print()
import statistics as s
d=lambda a,b:s.mean(res[y] for y in range(a,b+1))
print('mean 1983-92 %.1f, 1993-2002 %.1f, 2003-12 %.1f, 2013-22 %.1f'%(d(1983,1992),d(1993,2002),d(2003,2012),d(2013,2022)))
