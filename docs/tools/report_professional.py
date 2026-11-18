"""Composition du rapport academique : sommaire lie, figures indexees et captures reelles."""
from pathlib import Path
import html,json,re,statistics,shutil
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY,TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,PageTemplate,Frame,Paragraph,Spacer,PageBreak,NextPageTemplate,
    Table,TableStyle,Image,Preformatted,KeepTogether
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.graphics.shapes import Drawing,Rect,Circle,Line,String,Polygon

ROOT=Path(__file__).resolve().parents[2]
DOCS=ROOT/"docs"
WIDTH,HEIGHT=A4
MARGIN=47
CONTENT=WIDTH-2*MARGIN
FOREST=colors.HexColor("#123e35")
GREEN=colors.HexColor("#28634d")
MOSS=colors.HexColor("#cfedaa")
INK=colors.HexColor("#28372f")
MUTED=colors.HexColor("#718075")
PALE=colors.HexColor("#eff4ea")
RULE=colors.HexColor("#dce5d8")
identity=json.loads((Path(__file__).with_name("report-identity.json")).read_text(encoding="utf-8"))
api=json.loads((DOCS/"evidence/api-tests.json").read_text(encoding="utf-8"))
metrics=api["metrics"]
benchmark=[tuple(map(int,m)) for m in re.findall(r"BENCH,(\d+),(\d+),(\d+),(\d+)",
    (DOCS/"evidence/oracle-benchmark.txt").read_text(encoding="utf-8-sig"))]
fonts=Path("C:/Windows/Fonts")
if (fonts/"arial.ttf").exists():
    for name,file in [("GD","arial.ttf"),("GD-Bold","arialbd.ttf"),("GD-Italic","ariali.ttf")]:
        pdfmetrics.registerFont(TTFont(name,str(fonts/file)))
else:
    from reportlab.pdfbase.pdfmetrics import Font
    for name,base in [("GD","Helvetica"),("GD-Bold","Helvetica-Bold"),("GD-Italic","Helvetica-Oblique")]:
        pdfmetrics.registerFont(Font(name,base,"WinAnsiEncoding"))
pdfmetrics.registerFontFamily("GD",normal="GD",bold="GD-Bold",italic="GD-Italic",boldItalic="GD-Bold")
styles={
 "body":ParagraphStyle("BodyGD",fontName="GD",fontSize=10.2,leading=15.8,textColor=INK,alignment=TA_JUSTIFY,spaceAfter=10),
 "small":ParagraphStyle("SmallGD",fontName="GD",fontSize=8.4,leading=12,textColor=MUTED,spaceAfter=8),
 "h1":ParagraphStyle("ChapterGD",fontName="GD-Bold",fontSize=22,leading=29,textColor=FOREST,spaceAfter=16,keepWithNext=True),
 "h2":ParagraphStyle("SectionGD",fontName="GD-Bold",fontSize=15,leading=21,textColor=FOREST,spaceBefore=14,spaceAfter=10,keepWithNext=True),
 "h3":ParagraphStyle("SubGD",fontName="GD-Bold",fontSize=10.8,leading=16,textColor=GREEN,spaceBefore=9,spaceAfter=6,keepWithNext=True),
 "caption":ParagraphStyle("CaptionGD2",fontName="GD-Italic",fontSize=8.1,leading=11.5,textColor=MUTED,spaceBefore=7,spaceAfter=12),
 "cell":ParagraphStyle("CellGD",fontName="GD",fontSize=8.5,leading=12.5,textColor=INK),
 "th":ParagraphStyle("TableHeaderGD",fontName="GD-Bold",fontSize=8.5,leading=12,textColor=FOREST),
 "code":ParagraphStyle("CodeGD2",fontName="Courier",fontSize=7.5,leading=11,textColor=FOREST,
       backColor=PALE,borderPadding=9,spaceBefore=8,spaceAfter=13),
 "toc0":ParagraphStyle("TOCGD0",fontName="GD-Bold",fontSize=9.8,leading=13.5,textColor=FOREST,spaceBefore=7,spaceAfter=2),
 "toc1":ParagraphStyle("TOCGD1",fontName="GD",fontSize=8.5,leading=11.7,textColor=INK,leftIndent=15,firstLineIndent=0,spaceAfter=1),
 "figindex":ParagraphStyle("FigureIndexGD",fontName="GD",fontSize=8.6,leading=13,textColor=INK,spaceAfter=5),
}
story=[]; source=[]; figure_count=0; bookmark_count=0
class FigureIndex(TableOfContents):
    def notify(self,kind,stuff):
        if kind=="FigureEntry":self.addEntry(*stuff)
class ReportDoc(BaseDocTemplate):
    def afterFlowable(self,flow):
        if hasattr(flow,"_bookmark"):
            self.canv.bookmarkPage(flow._bookmark)
        if hasattr(flow,"_toc_level"):
            label=flow.getPlainText()
            self.canv.addOutlineEntry(label,flow._bookmark,flow._toc_level,False)
            self.notify("TOCEntry",(flow._toc_level,label,self.page-1,flow._bookmark))
        if hasattr(flow,"_figure_label"):
            self.notify("FigureEntry",(0,flow._figure_label,self.page-1,flow._bookmark))
def header(canvas,doc):
    canvas.saveState();canvas.setStrokeColor(RULE);canvas.setLineWidth(.5)
    canvas.line(MARGIN,HEIGHT-39,WIDTH-MARGIN,HEIGHT-39)
    canvas.setFont("GD-Bold",8);canvas.setFillColor(FOREST)
    canvas.drawString(MARGIN,HEIGHT-29,"GeoDelivery")
    canvas.setFont("GD",7.5);canvas.setFillColor(MUTED)
    canvas.drawRightString(WIDTH-MARGIN,HEIGHT-29,"Administration des bases de données · GLSID 3")
    canvas.line(MARGIN,39,WIDTH-MARGIN,39)
    canvas.drawString(MARGIN,25,"Oracle Spatial · Année universitaire "+identity["academicYear"])
    canvas.drawRightString(WIDTH-MARGIN,25,str(doc.page-1))
    canvas.restoreState()
def cover(canvas,doc):
    canvas.saveState();canvas.setFillColor(FOREST);canvas.rect(0,0,WIDTH,HEIGHT,fill=1,stroke=0)
    pts=[(350,180),(465,285),(390,420),(505,520),(440,660)]
    canvas.setStrokeColor(colors.HexColor("#41664d"));canvas.setLineWidth(1.3)
    for a,b in zip(pts,pts[1:]):canvas.line(*a,*b)
    for i,(x,y) in enumerate(pts):
        canvas.setFillColor(MOSS if i%2==0 else colors.HexColor("#4f825a"));canvas.circle(x,y,8,fill=1,stroke=0)
    canvas.setFont("GD",8);canvas.setFillColor(MOSS)
    canvas.drawString(MARGIN,35,"RAPPORT DE PROJET · "+identity["academicYear"])
    canvas.restoreState()
def heading(text,level=0,page=False):
    global bookmark_count
    if page:story.append(PageBreak())
    bookmark_count+=1
    flow=Paragraph(text,styles["h1" if level==0 else "h2"])
    flow._bookmark=f"section-{bookmark_count}";flow._toc_level=level
    story.append(flow);source.append(("#" if level==0 else "##")+" "+text+"\n")
def sub(text):
    story.append(Paragraph(text,styles["h3"]));source.append("### "+text+"\n")
def p(text):
    story.append(Paragraph(text,styles["body"]));source.append(re.sub("<[^>]+>","",text)+"\n")
def note(text):
    story.append(Paragraph(text,styles["small"]));source.append(text+"\n")
def code(text):
    story.append(Preformatted(text,styles["code"]));source.append("```text\n"+text+"\n```\n")
def table(headers,rows,widths=None):
    if widths is None:widths=[CONTENT/len(headers)]*len(headers)
    data=[[Paragraph(html.escape(str(x)),styles["th"]) for x in headers]]
    data.extend([[Paragraph(html.escape(str(x)),styles["cell"]) for x in row] for row in rows])
    t=Table(data,colWidths=widths,repeatRows=1,hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),PALE),("VALIGN",(0,0),(-1,-1),"TOP"),
       ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
       ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
       ("LINEBELOW",(0,0),(-1,-1),.35,RULE)]))
    story.extend([t,Spacer(1,12)])
    source.append("| "+" | ".join(headers)+" |\n| "+" | ".join("---" for _ in headers)+" |")
    source.extend("| "+" | ".join(str(x) for x in row)+" |" for row in rows);source.append("")
def caption(text):
    global figure_count,bookmark_count
    figure_count+=1;bookmark_count+=1
    label=f"Figure {figure_count} — {text}"
    flow=Paragraph(html.escape(label),styles["caption"]);flow._figure_label=label;flow._bookmark=f"figure-{figure_count}"
    story.append(flow);source.append("*"+label+"*\n")
def image(name,text,max_height=285,max_width=CONTENT):
    path=DOCS/"screenshots/interfaces"/(name+".png")
    if not path.exists():raise FileNotFoundError(f"Capture obligatoire absente : {path}")
    im=Image(str(path))
    scale=min(max_width/im.imageWidth,max_height/im.imageHeight)
    im.drawWidth=im.imageWidth*scale;im.drawHeight=im.imageHeight*scale
    im.hAlign="CENTER"
    story.append(im);caption(text)
    source.append(f"![{text}](screenshots/interfaces/{name}.png)\n")
def ui_page(title,images,paragraphs,steps=None,technical=None):
    heading(title,1,page=True)
    for name,label,height,width in images:image(name,label,height,width)
    sub("Lecture de l’interface")
    for text in paragraphs:p(text)
    if steps:
        sub("Manipulation présentée")
        for i,text in enumerate(steps,1):p(f"<b>{i}.</b> {text}")
    if technical:
        sub("Lien avec le backend et Oracle")
        p(technical)
def box(d,x,y,w,h,title,lines=()):
    d.add(Rect(x,y,w,h,rx=7,fillColor=PALE,strokeColor=RULE))
    d.add(String(x+9,y+h-18,title,fontName="GD-Bold",fontSize=9,fillColor=FOREST))
    for i,line in enumerate(lines):d.add(String(x+9,y+h-35-i*13,line,fontName="GD",fontSize=7.8,fillColor=INK))
def arrow(d,x1,y1,x2,y2):
    import math
    d.add(Line(x1,y1,x2,y2,strokeColor=GREEN,strokeWidth=1.1))
    angle=math.atan2(y2-y1,x2-x1);a=angle+.45;b=angle-.45
    d.add(Polygon([x2,y2,x2-7*math.cos(a),y2-7*math.sin(a),x2-7*math.cos(b),y2-7*math.sin(b)],fillColor=GREEN,strokeColor=None))
def architecture():
    d=Drawing(CONTENT,245)
    box(d,0,165,148,65,"Présentation",["Angular standalone","Leaflet · formulaires réactifs"])
    box(d,175,165,150,65,"API Spring Boot",["REST · validation · JWT","Contrôle des rôles"])
    box(d,350,165,150,65,"Persistance",["Oracle Database 19c","Schéma GEODELIVERY"])
    arrow(d,148,197,175,197);arrow(d,325,197,350,197)
    box(d,8,32,145,83,"Services métier",["Clients · commandes","Tournées · livraisons","Transactions et verrous"])
    box(d,179,32,145,83,"Optimisation",["Matrice Oracle","Nearest Neighbor","Amélioration 2-opt"])
    box(d,350,32,150,83,"Couche de données",["JPA : comptes/commandes","JDBC : géométries","Requêtes natives"])
    arrow(d,248,165,248,115);arrow(d,153,74,179,74);arrow(d,324,74,350,74)
    return d
def relational():
    d=Drawing(CONTENT,355)
    positions={
      "APP_USER":(0,270), "DRIVER":(178,270), "VEHICLE":(356,270),
      "CLIENT":(0,150), "DELIVERY_ORDER":(178,150), "DELIVERY_ROUTE":(356,150),
      "DEPOT":(0,25), "ROUTE_STOP":(178,25), "DELIVERY":(356,25)}
    descriptions={
     "APP_USER":["PK id · email unique","BCrypt · rôle"],
     "DRIVER":["PK id · FK user_id unique","current_position"],
     "VEHICLE":["FK driver_id unique","capacité > 0"],
     "CLIENT":["PK id · actif","position"],
     "DELIVERY_ORDER":["FK client_id · référence","poids > 0 · statut"],
     "DELIVERY_ROUTE":["FK driver_id · depot_id","état · distances"],
     "DEPOT":["PK id · nom","position"],
     "ROUTE_STOP":["FK route_id · order_id","rang unique · GPS figé"],
     "DELIVERY":["order_id unique","FK composite arrêt/ordre"]}
    for name,(x,y) in positions.items():box(d,x,y,145,74,name,descriptions[name])
    # Liaisons directes et coudes : aucune relation DRIVER->ORDER ou DEPOT->STOP.
    for a,b in [((145,307),(178,307)),((323,307),(356,307)),((145,187),(178,187)),
         ((250,150),(250,99)),((323,62),(356,62))]:arrow(d,*a,*b)
    for points in [
        [(250,270),(250,248),(428,248),(428,224)],  # DRIVER -> DELIVERY_ROUTE
        [(70,99),(70,122),(474,122),(474,150)],     # DEPOT -> DELIVERY_ROUTE
        [(356,180),(340,180),(340,75),(323,75)]     # DELIVERY_ROUTE -> ROUTE_STOP
    ]:
        for a,b in zip(points[:-2],points[1:-1]):
            d.add(Line(*a,*b,strokeColor=GREEN,strokeWidth=1.1))
        arrow(d,*points[-2],*points[-1])
    return d
def workflow():
    d=Drawing(CONTENT,205)
    for i,(title,lines) in enumerate([
      ("1. Aperçu",["Validation des ressources","Matrice Oracle · NN + 2-opt"]),
      ("2. Confirmation",["Verrous et revalidation","Écritures transactionnelles"]),
      ("3. Exécution",["Démarrage · GPS","Livraisons puis clôture"])]):
        x=i*174;box(d,x,90,153,90,title,lines)
        if i<2:arrow(d,x+153,136,x+174,136)
    d.add(String(10,42,"L’aperçu n’affecte aucune commande. Seule la confirmation engage les ressources.",fontName="GD-Italic",fontSize=8,fillColor=MUTED))
    return d

def build():
    from report_sections import compose
    # Sauvegarde de la premiere version uniquement, sans ecraser une archive existante.
    original=DOCS/"rapport.pdf";backup=DOCS/"archive/rapport-technique-v1.pdf"
    if original.exists() and not backup.exists():
        backup.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(original,backup)
    cover_style=ParagraphStyle("CoverTitle",fontName="GD-Bold",fontSize=46,leading=55,textColor=colors.white,spaceAfter=24)
    cover_sub=ParagraphStyle("CoverSub",fontName="GD",fontSize=21,leading=30,textColor=MOSS,spaceAfter=26)
    cover_small=ParagraphStyle("CoverSmall",fontName="GD",fontSize=10,leading=17,textColor=colors.HexColor("#d4e2d5"),spaceAfter=10)
    story.extend([Spacer(1,75),Paragraph("RAPPORT DE PROJET",cover_small),Spacer(1,22),Paragraph("GeoDelivery",cover_style),
       Paragraph("Géolocalisation et optimisation<br/>des livraisons avec Oracle Spatial",cover_sub),
       Spacer(1,35),Paragraph("Module : Administration des bases de données<br/>Filière : GLSID 3<br/>Année universitaire : "+identity["academicYear"],cover_small)])
    if identity["authors"]:story.append(Paragraph("Réalisé par :<br/>"+"<br/>".join(html.escape(a) for a in identity["authors"]),cover_small))
    for key,label in [("institution","Établissement"),("group","Groupe"),("supervisor","Encadré par")]:
        if identity.get(key):story.append(Paragraph(label+" : "+html.escape(identity[key]),cover_small))
    story.extend([Spacer(1,50),Paragraph("Rapport de conception, de réalisation et de validation<br/>Données de démonstration fictives · Casablanca",cover_small),
        NextPageTemplate("Body"),PageBreak()])
    heading("Résumé",0)
    p("GeoDelivery est une application web de gestion des livraisons qui met Oracle Spatial au centre du traitement géographique. Elle associe la gestion des clients, des livreurs, des véhicules, des dépôts et des commandes à des recherches de proximité et à l’organisation d’une tournée. Le backend Spring Boot applique les règles métier et les transactions ; Angular et Leaflet rendent les informations exploitables par le dispatcher.")
    p("Les positions sont enregistrées sous forme de points WGS84 de SRID 4326. Les index spatiaux et les opérateurs Oracle fournissent les recherches de voisinage, les filtres de rayon et les distances géodésiques. Une matrice symétrique alimente ensuite Nearest Neighbor, puis une amélioration 2-opt. La consultation d’un aperçu est séparée de la confirmation qui affecte réellement les ressources.")
    p("La réalisation est validée sur une base Oracle 19c locale, par des tests unitaires, des requêtes HTTP et un parcours navigateur. Ce rapport présente les fondements, la conception, les choix d’implémentation, les interfaces accompagnées de captures réelles et les résultats mesurés. Les distances affichées ne sont pas des distances routières et les heuristiques ne garantissent pas l’optimum global.")
    sub("Mots-clés")
    p("Oracle Spatial ; SDO_GEOMETRY ; index spatial ; WGS84 ; livraison ; géolocalisation ; Nearest Neighbor ; 2-opt ; Spring Boot ; Angular ; Leaflet.")
    sub("Périmètre du document")
    p("Les captures présentent une démonstration locale avec des données fictives. Les compteurs peuvent évoluer après les scénarios de test. Le rapport distingue les fonctionnalités réalisées, leurs limites et les extensions proposées ; il ne présente pas le prototype comme un service prêt à une exposition publique.")
    heading("Table des matières",0,page=True)
    toc=TableOfContents();toc.levelStyles=[styles["toc0"],styles["toc1"]];toc.dotsMinLevel=0
    story.append(toc)
    heading("Liste des figures",0,page=True)
    figures=FigureIndex();figures.levelStyles=[styles["figindex"]];figures.dotsMinLevel=0
    story.append(figures)
    compose()
    document=ReportDoc(str(original),pagesize=A4,leftMargin=MARGIN,rightMargin=MARGIN,
        topMargin=58,bottomMargin=52,title="GeoDelivery — Rapport de conception et de réalisation",
        author=", ".join(identity["authors"]) if identity["authors"] else "Équipe GeoDelivery",
        subject="Oracle Spatial · Administration des bases de données · GLSID 3")
    frame=Frame(MARGIN,52,CONTENT,HEIGHT-110,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
    document.addPageTemplates([
       PageTemplate("Cover",[Frame(MARGIN,55,CONTENT,HEIGHT-110,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=cover),
       PageTemplate("Body",[frame],onPage=header)])
    document.multiBuild(story,maxPasses=6)
    (DOCS/"rapport-professionnel.md").write_text("\n\n".join(source),encoding="utf-8")
    import pymupdf
    pdf=pymupdf.open(original)
    (DOCS/"evidence/report-professional.json").write_text(json.dumps({
       "pages":len(pdf),"figures":figure_count,"chapters":6,"language":"fr",
       "hasLinkedContents":True,"screenshotsDirectory":"docs/screenshots/interfaces",
       "output":"docs/rapport.pdf"},ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"Rapport professionnel : {len(pdf)} pages, {figure_count} figures.")

if __name__=="__main__":
    import sys
    sys.modules["report_professional"]=sys.modules[__name__]
    build()
