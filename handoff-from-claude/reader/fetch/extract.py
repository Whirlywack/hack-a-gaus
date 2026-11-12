import os,sys,zipfile,subprocess,re,json
D="/home/user/procurement/route3/docs"; T="/home/user/procurement/route3/text"
out={}
def conv(path,tid,rel):
    ext=path.lower().rsplit('.',1)[-1]
    tp=f"{T}/{tid}/{rel.replace('/','__')}.txt"; os.makedirs(os.path.dirname(tp),exist_ok=True)
    txt="";note=""
    try:
        if ext=="pdf":
            subprocess.run(["pdftotext","-layout",path,tp],capture_output=True,timeout=120)
            txt=open(tp,encoding="utf-8",errors="replace").read() if os.path.exists(tp) else ""
            pages=subprocess.run(["pdfinfo",path],capture_output=True,text=True).stdout
            m=re.search(r"Pages:\s+(\d+)",pages); note=f"{m.group(1) if m else '?'}pp"
            if len(txt.strip())<100*int(m.group(1) if m else 1): note+=" SCAN/LOW-TEXT"
        elif ext=="docx":
            import docx
            d=docx.Document(path); parts=[p.text for p in d.paragraphs]
            for t in d.tables:
                for r in t.rows: parts.append(" | ".join(c.text.strip() for c in r.cells))
            txt="\n".join(parts); open(tp,"w",encoding="utf-8").write(txt)
        elif ext in("doc","rtf","odt"):
            td=os.path.dirname(tp)+"/_lo"; os.makedirs(td,exist_ok=True)
            subprocess.run(["soffice","--headless","--convert-to","txt:Text","--outdir",td,path],capture_output=True,timeout=180)
            cand=td+"/"+os.path.splitext(os.path.basename(path))[0]+".txt"
            if os.path.exists(cand): txt=open(cand,encoding="utf-8",errors="replace").read(); open(tp,"w").write(txt); note="via libreoffice"
        elif ext in("xlsx","xlsm"):
            import openpyxl
            wb=openpyxl.load_workbook(path,read_only=True,data_only=True); parts=[]
            for ws in wb.worksheets:
                parts.append(f"## sheet {ws.title}")
                for row in ws.iter_rows(values_only=True):
                    if any(c is not None for c in row): parts.append(" | ".join("" if c is None else str(c) for c in row))
            txt="\n".join(parts); open(tp,"w",encoding="utf-8").write(txt)
        elif ext=="xls":
            return dict(file=rel,type=ext,chars=None,note="not converted (xls)")
        elif ext in("xml","txt"):
            txt=open(path,encoding="utf-8",errors="replace").read(); open(tp,"w").write(txt)
        else:
            return dict(file=rel,type=ext,chars=None,note="not converted")
    except Exception as e:
        return dict(file=rel,type=ext,chars=None,note="ERR "+str(e)[:80])
    return dict(file=rel,type=ext,chars=len(txt.strip()),note=note,size=os.path.getsize(path))
for tid in sorted(os.listdir(D)):
    rows=[]
    for f in sorted(os.listdir(f"{D}/{tid}")):
        p=f"{D}/{tid}/{f}"
        if not os.path.isfile(p) or f.startswith("dl_test"): continue
        if f.lower().endswith(".zip"):
            ud=f"{D}/{tid}/unz_{f[:-4]}"
            try:
                z=zipfile.ZipFile(p); infos=z.infolist()
                tot=sum(i.file_size for i in infos)
                if tot>200*1024*1024: rows.append(dict(file=f,type="zip",note=f"zip too big to unpack ({tot} B)"));continue
                os.makedirs(ud,exist_ok=True)
                for i in infos:
                    if i.is_dir(): continue
                    name=os.path.basename(i.filename.replace("\\","/")) or "x"
                    name=re.sub(r'[^\w.\- ()ąčęėįšųūžĄČĘĖĮŠŲŪŽ]','_',name)
                    with z.open(i) as src, open(f"{ud}/{name}","wb") as dst: dst.write(src.read())
                rows.append(dict(file=f,type="zip",note=f"unpacked {len(infos)} entries, {tot} B",size=os.path.getsize(p)))
                for g in sorted(os.listdir(ud)):
                    gp=f"{ud}/{g}"
                    if g.lower().endswith(".zip"):
                        rows.append(dict(file=f+"/"+g,type="zip",note="nested zip, not unpacked",size=os.path.getsize(gp)));continue
                    rows.append(conv(gp,tid,f"{f[:-4]}/{g}"))
            except Exception as e: rows.append(dict(file=f,type="zip",note="ERR "+str(e)[:80]))
        else: rows.append(conv(p,tid,f))
    out[tid]=rows
json.dump(out,open("/home/user/procurement/route3/work/extract.json","w"),ensure_ascii=False,indent=1)
for tid,rows in out.items():
    print("==",tid,"total chars",sum(r.get("chars") or 0 for r in rows))
    for r in rows: print("  ",r["file"][:70],r["type"],r.get("chars"),r.get("note",""))
