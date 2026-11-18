from pathlib import Path
import pymupdf
from PIL import Image, ImageOps, ImageDraw

docs=Path(__file__).resolve().parents[1]
out=docs/"screenshots/qa"
out.mkdir(parents=True,exist_ok=True)
def render_pdf(source,prefix):
    document=pymupdf.open(docs/source)
    rendered=[]
    for i,page in enumerate(document):
        image=out/f"{prefix}-{i+1:02}.png"
        page.get_pixmap(matrix=pymupdf.Matrix(1.25,1.25)).save(image)
        rendered.append(image)
    return rendered
def montage(files,name,cols=3,width=400):
    thumbnails=[]
    for path in files:
        im=Image.open(path).convert("RGB")
        im.thumbnail((width-20,560))
        frame=Image.new("RGB",(width,im.height+42),"#f2f5ee")
        frame.paste(im,((width-im.width)//2,30))
        ImageDraw.Draw(frame).text((10,8),path.stem,fill="#123e35")
        thumbnails.append(frame)
    height=max(im.height for im in thumbnails)
    result=Image.new("RGB",(width*cols,height*((len(files)+cols-1)//cols)),"white")
    for i,im in enumerate(thumbnails):result.paste(im,((i%cols)*width,(i//cols)*height))
    result.save(out/name)
    print(out/name)
montage(render_pdf("rapport.pdf","rapport"),"rapport-contact-sheet.png")
if (docs/"presentation.pdf").exists():
    montage(render_pdf("presentation.pdf","slide"),"slides-contact-sheet.png")
