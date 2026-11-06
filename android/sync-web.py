from pathlib import Path
import shutil, json, hashlib
project=Path(__file__).resolve().parent
source=project.parent/'web'
dest=project/'app/src/main/assets/web'
dest.mkdir(parents=True,exist_ok=True)
hashes={}
for p in source.rglob('*'):
    if not p.is_file() or p.suffix=='.md' or p.name in ['mobile-layout.css','mobile-layout.js']:continue
    rel=p.relative_to(source)
    target=dest/rel
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(p,target)
    hashes[rel.as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest()
index=dest/'index.html'
index.write_text(index.read_text(encoding='utf-8').replace('<link rel="stylesheet" href="mobile-layout.css?v=entry21">','<link rel="stylesheet" href="native-layout.css?v=entry21">').replace('<script src="mobile-layout.js" defer></script>','<script src="native.js" defer></script>'),encoding='utf-8')
for name in ['play.js','archive.js']:
    p=dest/name
    text=p.read_text(encoding='utf-8')
    marker='canvas.toBlob(blob=>{'
    assert text.count(marker)==1
    text=text.replace(marker,marker+"if(window.YujiAndroid){if(blob)window.YujiSavePng(blob,name);return;}",1)
    p.write_text(text,encoding='utf-8')
(project/'web-source-manifest.json').write_text(json.dumps(hashes,ensure_ascii=False,indent=2),encoding='utf-8')

print('Synced',len(hashes),'web files; browser original unchanged')

