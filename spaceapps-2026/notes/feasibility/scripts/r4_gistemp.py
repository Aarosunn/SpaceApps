import numpy as np, glob, math, sys
from PIL import Image
# Robinson projection tables
T=[(0,1.0,0.0),(5,.9986,.062),(10,.9954,.124),(15,.99,.186),(20,.9822,.248),(25,.973,.31),(30,.96,.372),(35,.9427,.434),(40,.9216,.4958),(45,.8962,.5571),(50,.8679,.6176),(55,.835,.6769),(60,.7986,.7346),(65,.7597,.7903),(70,.7186,.8435),(75,.6732,.8936),(80,.6213,.9394),(85,.5722,.9761),(90,.5322,1.0)]
def rob(lat,lon):
    a=abs(lat); i=min(int(a//5),17); f=(a-T[i][0])/5
    plen=T[i][1]+f*(T[i+1][1]-T[i][1]); pdfe=T[i][2]+f*(T[i+1][2]-T[i][2])
    x=961+936*(lon/180)*plen; y=489-math.copysign(1,lat)*474.7*pdfe
    return int(round(x)),int(round(y))
def bar(img):
    # colorbar column x=78, y 790..1062 : 2C top .. -2C bottom (verified visually)
    a=np.asarray(img.convert('RGB')).astype(float)
    ys=np.arange(792,1060); cols=a[ys,78]
    vals=2-4*(ys-790)/(1062-790)
    return cols,vals
def decode(img,x,y,r=6):
    cols,vals=bar(img)
    a=np.asarray(img.convert('RGB')).astype(float)
    p=a[y-r:y+r+1,x-r:x+r+1].reshape(-1,3).mean(0)
    d=((cols-p)**2).sum(1); return vals[d.argmin()], d.min()**.5
def year(img):
    a=np.asarray(img.convert('L')).astype(float)[1020:1030,500:1440].mean(0)
    xs=np.where(a>150)[0]; xe=xs.max()+500 if len(xs) else 512
    return 1880+(xe-512)/6.38
places={'Arctic Svalbard 78N15E':(78,15),'Siberia 65N90E':(65,90),'Europe Paris':(48,2),'Midwest US':(40,-95),'Sahara':(25,10),'India':(22,78),'Equatorial Pacific':(0,-150),'Amazon':(-5,-60),'Antarctic Pen':(-65,-65),'S Ocean':(-55,0),'Australia':(-25,135),'E Pacific nino':(0,-110)}
if __name__=='__main__':
    fs=sorted(glob.glob(sys.argv[1]+'/f*.png'))
    print('year',*places,sep=' | ')
    for f in fs:
        im=Image.open(f); yr=year(im)
        print('%.0f'%yr,*['%+.1f'%decode(im,*rob(*ll)[:2])[0] for ll in places.values()],sep=' | ')
