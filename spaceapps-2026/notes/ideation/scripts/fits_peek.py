"""Minimal FITS HDU lister (no astropy). Usage: python3 -I fits_peek.py file.fits"""
import sys, numpy as np
b = open(sys.argv[1], 'rb').read()
pos = 0
while pos < len(b):
    hdr = {}
    while True:
        block = b[pos:pos + 2880]; pos += 2880
        cards = [block[i:i + 80].decode('ascii', 'replace') for i in range(0, 2880, 80)]
        for c in cards:
            if '=' in c[:10]:
                hdr[c[:8].strip()] = c[10:].split('/')[0].strip().strip("'").strip()
        if any(c.startswith('END') for c in cards): break
    n = int(hdr.get('NAXIS', 0)); bp = int(hdr.get('BITPIX', 8))
    shape = [int(hdr[f'NAXIS{i}']) for i in range(n, 0, -1)]
    size = (abs(bp) // 8) * int(np.prod(shape)) if n else 0
    size += int(hdr.get('PCOUNT', 0))
    info = {k: hdr.get(k) for k in ('EXTNAME', 'XTENSION', 'BUNIT', 'CRVAL1', 'CRVAL2', 'CRPIX1', 'CRPIX2', 'DATE-OBS', 'DATE-AVG', 'MJD-AVG', 'DETECTOR') if k in hdr}
    line = f"shape={shape} bitpix={bp} {info}"
    if n and hdr.get('XTENSION', 'IMAGE').startswith('IMAGE') or (n and 'XTENSION' not in hdr):
        dt = {-32: '>f4', -64: '>f8', 16: '>i2', 32: '>i4', 8: 'u1'}[bp]
        a = np.frombuffer(b, dt, int(np.prod(shape)), pos).reshape(shape)
        if a.ndim == 2:
            iy, ix = np.unravel_index(np.nanargmax(a), a.shape)
            line += f" min={np.nanmin(a):.3g} med={np.nanmedian(a):.3g} max={np.nanmax(a):.3g} argmax(x,y)=({ix},{iy})"
    print(line)
    pos += (size + 2879) // 2880 * 2880
