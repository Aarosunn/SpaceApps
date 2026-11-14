"""Summarise an IRSA SIA2 VOTable for SPHEREx: epochs, detectors, sizes. Usage: python3 -I spherex_sia_summary.py file.xml"""
import re, sys, collections
s = open(sys.argv[1]).read()
names = re.findall(r'<FIELD[^>]*name="([^"]*)"', s)
rows = [dict(zip(names, [re.sub(r'<.*?>', '', a or '') for a in re.findall(r'<TD>(.*?)</TD>|<TD/>', r, re.S)]))
        for r in re.findall(r'<TR>(.*?)</TR>', s, re.S)]
print('rows', len(rows))
mjd = sorted(float(r['t_min']) for r in rows)
print('MJD range', mjd[0], mjd[-1], 'span days', round(mjd[-1] - mjd[0], 1))
print('by detector', collections.Counter(r['energy_bandpassname'] for r in rows))
print('by ISO week', sorted(collections.Counter(r['obs_id'][:7] for r in rows).items()))
print('est size kB', collections.Counter(r['access_estsize'] for r in rows).most_common(3))
print('first url', rows[0]['access_url'])
