import subprocess,sys,re,html,time,json,os
UA="gaus-research-test/0.1"
W="/home/user/procurement/route3/work"; D="/home/user/procurement/route3/docs"
BASE="https://viesiejipirkimai.lt"
jar=W+"/jar.txt"
last=[0.0]; nreq={}
def get(url,out,maxbytes=None,tid=None):
    d=2.2-(time.time()-last[0])
    if d>0: time.sleep(d)
    cmd=["curl","-sS","-m","90","-L","-A",UA,"-c",jar,"-b",jar,"-o",out,"-w","%{http_code}|%{num_redirects}|%{url_effective}|%{size_download}|%{content_type}"]
    if maxbytes: cmd+=["--max-filesize",str(maxbytes)]
    cmd.append(url)
    r=subprocess.run(cmd,capture_output=True,text=True)
    last[0]=time.time(); nreq[tid]=nreq.get(tid,0)+1
    return (r.stdout.strip() or "ERR "+r.stderr.strip()[:100])
def text(h):
    t=re.sub(r'<script.*?</script>|<style.*?</style>','',h,flags=re.S)
    return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',t)))
def field(t,label,stops):
    m=re.search(re.escape(label)+r'\s*:?\s*(.*?)\s*(?:'+'|'.join(re.escape(s) for s in stops)+')',t)
    return m.group(1)[:80] if m else None
def run(tid):
    t0=time.time(); nreq[tid]=0; res={"id":tid}
    r=get(f"{BASE}/epps/cft/prepareViewCfTWS.do?resourceId={tid}",f"{W}/n_{tid}.html",tid=tid); res["notice"]=r
    h=open(f"{W}/n_{tid}.html",encoding="utf-8",errors="replace").read(); t=text(h)
    res["login_redirect"]=("authenticate" in r.lower()) or ("cas" in r.split("|")[2].lower() if r.count("|")>=2 else False)
    res["title"]=field(t,"Pavadinimas",["PV Pirkimo","Pirkimo unikalus"])
    res["buyer"]=field(t,"Pirkimo vykdytojo pavadinimas",["Pavadinimas"])
    res["type"]=field(t,"Pirkimo objekto tipas",["Direktyva"])
    res["proc"]=field(t,"Pirkimo būdas",["BVPŽ"])
    res["value"]=field(t,"Numatoma vertė (EUR)",["Virš arba"])
    res["thr"]=field(t,"Virš arba žemiau tarptautinio pirkimo vertės ribos",["Pasiūlymų arba"])
    res["deadline"]=field(t,"Pasiūlymų arba paraiškų dalyvauti pirkime pateikimo terminas",["Kvietimų","Prašymų"])
    res["guarantee"]=field(t,"Pasiūlymo galiojimo terminas dienomis arba mėnesiais",["ES finans"])
    if res["login_redirect"] or not res["title"]:
        res["note"]="notice page not public/parsed: "+r
        json.dump(res,open(f"{W}/res_{tid}.json","w"),ensure_ascii=False); return res
    r=get(f"{BASE}/epps/cft/listContractDocuments.do?resourceId={tid}",f"{W}/ld_{tid}.html",tid=tid); res["doclist"]=r
    h=open(f"{W}/ld_{tid}.html",encoding="utf-8",errors="replace").read()
    docs=[]
    for tr in re.findall(r'<tr>(.*?)</tr>',h,re.S):
        for m in re.finditer(r"downloadDocForAnonymous\('(\d+)'\)\">(.*?)</a>",tr,re.S):
            docs.append((m.group(1),html.unescape(m.group(2)).strip()))
    # non-anonymous-link rows
    res["docs_listed"]=len(docs)
    res["has_zip_button"]="downloadForAnonymousUser" in h
    res["other_login_hooks"]=len(re.findall(r"prepareAssociateUser|authenticate/login",h))
    os.makedirs(f"{D}/{tid}",exist_ok=True)
    files=[];total=0
    for did,name in docs:
        safe=re.sub(r'[^\w.\- ąčęėįšųūžĄČĘĖĮŠŲŪŽ()]','_',name)
        if re.search(r'\.(dwg|dxf|dwf|rvt|ifc|mp4|mov|avi)$',name,re.I):
            files.append(dict(name=name,skipped="CAD/video, not downloaded"));continue
        out=f"{D}/{tid}/{did}_{safe}"
        r=get(f"{BASE}/epps/cft/downloadContractDocument.do?documentId={did}&resourceId={tid}",out,maxbytes=60*1024*1024-total if total<60*1024*1024 else 1,tid=tid)
        sz=os.path.getsize(out) if os.path.exists(out) else 0
        total+=sz
        files.append(dict(name=name,id=did,size=sz,resp=r))
    res["files"]=files; res["total_bytes"]=total
    res["seconds"]=round(time.time()-t0,1); res["requests"]=nreq[tid]
    json.dump(res,open(f"{W}/res_{tid}.json","w"),ensure_ascii=False,indent=1); return res
if __name__=="__main__":
    for tid in sys.argv[1:]:
        r=run(tid)
        print(tid,r.get("type"),"|",r.get("proc"),"|",r.get("thr"),"|",r.get("value"),"|",r.get("deadline"),"|",(r.get("buyer") or "")[:40])
        print("   notice:",r["notice"],"| docs",r.get("docs_listed"),"| zipbtn",r.get("has_zip_button"),"| files",[(f["name"][:30],f.get("size"),f["resp"].split("|")[0] if "resp" in f else f.get("skipped")) for f in r.get("files",[])],"| s",r.get("seconds"),"req",r.get("requests"),r.get("note",""))
