# Build mock/out/gaus-prototype.html (full document) and gaus-prototype-page.html (fragment) from dist/index.html
import re, sys
src = open('dist/index.html', encoding='utf-8').read()
styles = re.findall(r'<style[^>]*>(.*?)</style>', src, re.S)
scripts = re.findall(r'<script type="module"[^>]*>(.*?)</script>', src, re.S)
assert len(styles) == 1 and len(scripts) == 1, (len(styles), len(scripts))
css, js = styles[0], scripts[0]
frag = f'<title>gaus prototipas</title>\n<style>{css}</style>\n<div id="root"></div>\n<script type="module">{js}</script>\n'
open('../out/gaus-v2-page.html', 'w', encoding='utf-8').write(frag)
open('../out/gaus-v2.html', 'w', encoding='utf-8').write(src)
for name, t in [('full', src), ('fragment', frag)]:
    bad = [k for k in ['(?<=', '(?<!', '100vh', '100dvh', 'localStorage', 'sessionStorage', 'indexedDB', 'window.open', 'alert(', 'confirm(', 'prompt(', 'document.cookie', 'serviceWorker', 'fetch(', 'XMLHttpRequest', 'history.', 'location.hash ='] if k in t]
    print(name, len(t.encode()), 'bytes; found:', bad or 'none')
print('fragment has html/head/body/doctype/viewport:', [k for k in ['<!doctype', '<!DOCTYPE', '<html', '<head', '<body', 'viewport'] if k in frag] or 'none')
