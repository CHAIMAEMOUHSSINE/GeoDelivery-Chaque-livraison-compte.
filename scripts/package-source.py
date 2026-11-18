"""Archive les seuls livrables, sans .env, dependances, caches ni historique Git."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED

root=Path(__file__).resolve().parents[1]
output=root/"GeoDelivery-source.zip"
skip_dirs={"node_modules","target","dist",".angular",".git",".idea",".vscode","__pycache__","recordings","narration","archive","qa"}
skip_extensions={".log",".pyc"}
stack=[root]
files=[]
while stack:
    directory=stack.pop()
    for p in directory.iterdir():
        if p.is_dir():
            if p.name not in skip_dirs: stack.append(p)
        elif p.is_file() and p!=output:
            if (p.name==".env" or p.name.startswith(".env.")) and p.name!=".env.example": continue
            if p.suffix not in skip_extensions: files.append(p)
with ZipFile(output,"w",ZIP_DEFLATED,compresslevel=6) as archive:
    for p in sorted(files): archive.write(p,"GeoDelivery/"+p.relative_to(root).as_posix())
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert not any(Path(n).name==".env" for n in archive.namelist())
print(f"Archive verifiee : {output.name} ({len(files)} fichiers, {output.stat().st_size/1024/1024:.1f} Mo)")
