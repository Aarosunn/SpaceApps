import sys
from PIL import Image
out=sys.argv[1]; fs=sys.argv[2:]
W,H=760,430
m=Image.new('RGB',(W*2,H*((len(fs)+1)//2)))
for k,f in enumerate(fs):
    im=Image.open(f).convert('RGB'); im.thumbnail((W,H)); m.paste(im,((k%2)*W,(k//2)*H))
m.save(out,quality=88)
