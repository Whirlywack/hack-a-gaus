import re,sys,json,glob,html
rows=[]
for f in sorted(glob.glob('/home/user/procurement/route3/work/list*.html'),key=lambda x:int(re.findall(r'list(\d+)',x)[0])):
    h=open(f,encoding='utf-8').read()
    for tr in re.findall(r'<tr>\s*<td>\d+</td>(.*?)</tr>',h,re.S):
        tds=[re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',t))).strip() for t in re.findall(r'<td[^>]*>(.*?)</td>',tr,re.S)]
        m=re.search(r'href="([^"]*resourceId=(\d+))"',tr)
        if not m or not tds: continue
        rows.append(dict(url=m.group(1),id=m.group(2),title=tds[0],buyer=tds[2],pub=tds[4],deadline=tds[5],proc=tds[6],step=tds[7],page=f[-7:]))
json.dump(rows,open('/home/user/procurement/route3/work/candidates.json','w'),ensure_ascii=False,indent=1)
for r in rows: print(r['id'],r['url'].split('/')[2],r['step'][:14],'|',r['deadline'][4:16],'|',r['proc'][:30],'|',r['buyer'][:40],'|',r['title'][:60])
