"""Controle les pages et cree des planches de douze pages pour la relecture visuelle."""
from pathlib import Path
import json
import pymupdf
from PIL import Image,ImageDraw

root=Path(__file__).resolve().parents[2]
out=root/"docs/screenshots/qa/professional"
out.mkdir(parents=True,exist_ok=True)
doc=pymupdf.open(root/"docs/rapport.pdf")
imgs=[];overflow=[];short=[]
for i,page in enumerate(doc):
    path=out/f"page-{i+1:02}.png"
    page.get_pixmap(matrix=pymupdf.Matrix(1.3,1.3)).save(path)
    imgs.append(path)
    text=page.get_text()
    if len(text)<400 and i>0:short.append(i+1)
    for block in page.get_text("blocks"):
        x0,y0,x1,y1,*_=block
        if x0<0 or y0<0 or x1>page.rect.width+.5 or y1>page.rect.height+.5:
            overflow.append({"page":i+1,"bbox":[x0,y0,x1,y1]})
for start in range(0,len(imgs),12):
    subset=imgs[start:start+12];width=390;height=585
    sheet=Image.new("RGB",(width*3,height*((len(subset)+2)//3)),"#eef3e9")
    for j,path in enumerate(subset):
        im=Image.open(path).convert("RGB");im.thumbnail((width-15,height-35))
        x=(j%3)*width+(width-im.width)//2;y=(j//3)*height+25
        sheet.paste(im,(x,y))
        ImageDraw.Draw(sheet).text(((j%3)*width+10,(j//3)*height+6),path.stem,fill="#123e35")
    target=out/f"planche-{start//12+1}.png";sheet.save(target);print(target)
assert not overflow,overflow
meta=json.loads((root/"docs/evidence/report-professional.json").read_text(encoding="utf-8"))
result={"pageCount":len(doc),"figures":meta["figures"],
    "pdfBookmarks":len(doc.get_toc()),"hyperlinks":sum(len(p.get_links()) for p in doc),"overflowBlocks":overflow,
    "shortPagesToReview":short}
(root/"docs/evidence/report-visual-qa.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(result,ensure_ascii=False))
