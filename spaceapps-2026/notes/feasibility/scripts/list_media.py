import json,sys,re
for i in sys.argv[2:]:
    d=json.load(open(f"{sys.argv[1]}/{i}.json"))
    print("=====",i,d['title'],d['release_date'][:10])
    for g in d['media_groups']:
        desc=re.sub(r'\|\|.*','',(g.get('description') or ''))[:400]
        print(f"-- group {g['id']} [{g['widget']}] {g.get('title')!r}: {desc}")
        for it in g['items']:
            m=it.get('instance') or {}
            if it['type']!='media':
                print("    (",it['type'],str(m)[:100],")");continue
            print("   ",m.get('media_type'),m.get('filename'),m.get('width'),'x',m.get('height'),m.get('url','')[-0:] if 0 else '', {k:v for k,v in m.items() if k not in('id','url','filename','media_type','alt_text','width','height','pixels') and v})
