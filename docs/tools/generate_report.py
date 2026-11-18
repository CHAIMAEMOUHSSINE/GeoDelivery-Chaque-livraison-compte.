"""Regenerer depuis la racine : python docs/tools/generate_report.py."""
from pathlib import Path
import json, re, statistics, html
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, Preformatted
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Circle

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
api = json.loads((DOCS/"evidence/api-tests.json").read_text(encoding="utf-8"))
metrics = api["metrics"]
bench = [(int(a), int(b), int(c), int(d)) for a,b,c,d in re.findall(r"BENCH,(\d+),(\d+),(\d+),(\d+)", (DOCS/"evidence/oracle-benchmark.txt").read_text(encoding="utf-8-sig"))]
GREEN, LIME, GRAY = colors.HexColor("#123e35"), colors.HexColor("#eaf2df"), colors.HexColor("#72816b")
font = Path("C:/Windows/Fonts/arial.ttf")
if font.exists():
    pdfmetrics.registerFont(TTFont("Body",str(font)))
    pdfmetrics.registerFont(TTFont("BodyBold","C:/Windows/Fonts/arialbd.ttf"))
else:
    pdfmetrics.registerFontFamily("Body",normal="Helvetica",bold="Helvetica-Bold")
    # Alias standard si les fontes Windows ne sont pas disponibles.
    from reportlab.pdfbase.pdfmetrics import Font
    pdfmetrics.registerFont(Font("Body","Helvetica","WinAnsiEncoding"))
    pdfmetrics.registerFont(Font("BodyBold","Helvetica-Bold","WinAnsiEncoding"))
pdfmetrics.registerFontFamily("Body",normal="Body",bold="BodyBold")
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Text",fontName="Body",fontSize=10,leading=16,textColor=GREEN,spaceAfter=11))
styles.add(ParagraphStyle(name="Heading",fontName="BodyBold",fontSize=23,leading=30,textColor=GREEN,spaceAfter=16))
styles.add(ParagraphStyle(name="Sub",fontName="BodyBold",fontSize=12,leading=18,textColor=GREEN,spaceBefore=10,spaceAfter=9))
styles.add(ParagraphStyle(name="CaptionGD",fontName="Body",fontSize=8,leading=12,textColor=GRAY,spaceAfter=12))
styles.add(ParagraphStyle(name="CodeGD",fontName="Courier",fontSize=7.2,leading=11,textColor=GREEN,backColor=colors.HexColor("#f2f5ee"),borderPadding=10,spaceAfter=15))
story=[]
def p(text): story.append(Paragraph(text,styles["Text"]))
def sub(text): story.append(Paragraph(text,styles["Sub"]))
def title(n,text):
    if story: story.append(PageBreak())
    story.append(Paragraph(f"GEODELIVERY / {n:02d}",styles["CaptionGD"]))
    story.append(Paragraph(text,styles["Heading"]))
def table(headers,rows,widths=None):
    data=[[Paragraph(html.escape(str(x)),styles["CaptionGD"]) for x in headers]]
    data += [[Paragraph(html.escape(str(x)),styles["Text"]) for x in row] for row in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),LIME),("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),
        ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("LINEBELOW",(0,0),(-1,-1),.4,colors.HexColor("#dfe7d8"))]))
    story.append(t); story.append(Spacer(1,12))
def code(text): story.append(Preformatted(text,styles["CodeGD"]))
def screenshot(name,caption,maxh=535):
    path=DOCS/"screenshots"/name
    if path.exists():
        im=Image(str(path))
        scale=min(480/im.imageWidth,maxh/im.imageHeight)
        im.drawWidth=im.imageWidth*scale; im.drawHeight=im.imageHeight*scale
        story.append(im); story.append(Spacer(1,10))
        story.append(Paragraph(caption,styles["CaptionGD"]))
def box(d,x,y,w,h,label):
    d.add(Rect(x,y,w,h,rx=8,fillColor=LIME,strokeColor=colors.HexColor("#d8e4cf")))
    d.add(String(x+w/2,y+h/2-3,label,fontName="BodyBold",fontSize=10,textAnchor="middle",fillColor=GREEN))

# Couverture
story.append(Spacer(1,65))
story.append(Paragraph("GLSID 3 · ADMINISTRATION DES BASES DE DONNÉES",styles["CaptionGD"]))
story.append(Spacer(1,22))
story.append(Paragraph("GeoDelivery",ParagraphStyle(name="Cover",fontName="BodyBold",fontSize=48,leading=58,textColor=GREEN)))
story.append(Spacer(1,15))
story.append(Paragraph("Géolocalisation et optimisation<br/>des livraisons avec Oracle Spatial",styles["Heading"]))
story.append(Spacer(1,35))
d=Drawing(480,180)
coords=[(50,75),(150,145),(260,95),(365,145),(430,40)]
for a,b in zip(coords,coords[1:]): d.add(Line(*a,*b,strokeColor=colors.HexColor("#84a65b"),strokeWidth=2))
for i,(x,y) in enumerate(coords):
    d.add(Circle(x,y,17,fillColor=GREEN if i==0 else LIME,strokeColor=None))
    d.add(String(x,y-4,str(i),fontName="BodyBold",fontSize=11,textAnchor="middle",fillColor=colors.white if i==0 else GREEN))
story.append(d)
p("Rapport technique d’implémentation · Année 2026–2027<br/>Version du 18 novembre 2026")
p("<b>Groupe, membres, établissement et encadrant : à compléter avant remise.</b>")
story.append(Spacer(1,20))
p("Ce rapport décrit un MVP exécuté sur Oracle 19c. Les résultats chiffrés proviennent des fichiers de preuves fournis. Les données sont fictives. Aucun calcul routier n’est revendiqué.")

title(1,"Problématique et périmètre")
p("Comment exploiter les données géographiques, les index spatiaux et les opérateurs Oracle pour rapprocher les commandes des livreurs disponibles et réduire la longueur estimée des tournées ? GeoDelivery associe un système de gestion transactionnelle à une visualisation cartographique et à des heuristiques d’optimisation.")
sub("Une distinction centrale")
p("Une distance géodésique suit la géométrie de la Terre entre deux positions WGS84. Elle ne tient compte ni des rues, ni des sens uniques, ni des ponts, ni du trafic. L’application annonce systématiquement le mode <b>GEODESIC</b>. Les segments Leaflet ne sont pas des routes.")
table(["Acteur","Responsabilités"],[
    ("ADMIN","Comptes, livreurs, véhicules, dépôts ; toutes les fonctions de dispatch."),
    ("DISPATCHER","Clients, commandes, proximité, aperçu, confirmation et suivi des tournées."),
    ("DRIVER","Ses tournées et livraisons uniquement ; mise à jour de sa propre position.")
],[100,380])
sub("Hypothèses du MVP")
p("Une optimisation traite un livreur, un dépôt et au plus 60 commandes, avec retour facultatif. La capacité du véhicule est vérifiée. Les priorités sont enregistrées mais ne constituent pas une contrainte de séquencement. Fenêtres horaires, trafic et répartition multi-véhicules ne sont pas modélisés : il s’agit d’une variante simplifiée du TSP, pas d’un solveur VRP complet.")
sub("Critères observables")
p("Trois colonnes spatiales indexées, recherche de voisins disponibles, filtre de rayon, distances calculées dans Oracle, aperçu sans mutation, confirmation transactionnelle, contrôle des rôles et affichage cartographique cohérent.")

title(2,"SIG et modèle spatial Oracle")
p("Un SIG associe des objets métier à une localisation dans un système de référence. Un SRID identifie ce système. GeoDelivery utilise des points 2D de type <b>2001</b> dans le référentiel géographique WGS84, SRID <b>4326</b>.")
code("""MDSYS.SDO_GEOMETRY(
  2001, 4326,
  MDSYS.SDO_POINT_TYPE(-7.6300, 33.5300, NULL),
  NULL, NULL
)""")
p("<b>Attention à l’ordre :</b> X est la longitude, Y la latitude. Les DTO HTTP portent les noms latitude/longitude ; Leaflet attend [latitude, longitude]. La validation refuse les valeurs non finies et les latitudes/longitudes hors bornes.")
sub("Métadonnées et index")
p("CLIENT.position, DRIVER.current_position et DEPOT.position possèdent chacune une entrée USER_SDO_GEOM_METADATA avec les dimensions longitude [-180,180], latitude [-90,90], SRID 4326 et tolérance 0,005. Pour des données géodésiques, cette tolérance est une tolérance métrique Oracle, pas un pas de GPS en degrés. Les index SPATIAL_INDEX_V2 accélèrent le filtrage des candidats.")
table(["Outil","Rôle dans le projet"],[
    ("SDO_GEOM.SDO_DISTANCE","Distance géodésique et matrice symétrique en kilomètres."),
    ("SDO_NN / SDO_NN_DISTANCE","Livreurs disponibles les plus proches, distance associée au même identifiant d’opérateur."),
    ("SDO_WITHIN_DISTANCE","Filtre de rayon en kilomètres utilisant l’index spatial."),
    ("SDO_RELATE / SDO_CS.TRANSFORM","Démonstrations SQL : point dans une zone et transformation de référentiel."),
    ("VALIDATE_GEOMETRY_WITH_CONTEXT","Contrôle des géométries de démonstration.")
],[155,325])

title(3,"Architecture et responsabilités")
d=Drawing(480,205)
box(d,10,140,135,45,"Angular + Leaflet"); box(d,180,140,135,45,"API Spring Boot")
box(d,345,140,125,45,"JWT / rôles")
box(d,25,55,135,45,"Services métier");box(d,185,55,130,45,"NN + 2-opt");box(d,340,55,130,45,"Oracle Spatial")
for a,b in [((145,162),(180,162)),((315,162),(345,162)),((245,140),(245,100)),((160,77),(185,77)),((315,77),(340,77))]:
    d.add(Line(*a,*b,strokeColor=GRAY,strokeWidth=1.4))
story.append(d)
p("L’architecture est un monolithe modulaire. Angular standalone utilise router, HttpClient et formulaires réactifs. Spring Boot 3.5.7 fournit validation, transactions, documentation OpenAPI et sécurité. La base existante Oracle 19c héberge un nouveau schéma applicatif isolé.")
sub("JPA et JDBC complémentaires")
p("Spring Data JPA gère les comptes et l’écriture des commandes. Les catalogues géographiques, les projections tabulaires, les requêtes spatiales et les affectations transactionnelles utilisent JDBC avec paramètres liés. Ce choix évite de masquer les opérateurs Oracle derrière une conversion ORM complexe. Les entités JPA ne sont pas retournées au navigateur.")
sub("Sécurité")
p("Les mots de passe sont hachés avec BCrypt. Les JWT HS256 portent un émetteur vérifié, une date d’expiration d’une heure, l’identifiant utilisateur et le rôle. La clé est injectée par variable d’environnement. La propriété des tournées et des positions est vérifiée côté serveur, indépendamment des restrictions d’affichage Angular.")
sub("Configuration reproductible")
p("Les scripts SQL versionnés constituent l’unique mécanisme d’initialisation ; Hibernate DDL et l’initialisation SQL automatique sont désactivés. Les secrets sont locaux dans .env, ignoré par Git. L’API écoute seulement 127.0.0.1.")

title(4,"Conception relationnelle et intégrité")
table(["Table","Information principale et contraintes"],[
    ("APP_USER","Email unique, hachage, rôle autorisé."),
    ("DRIVER","Profil utilisateur unique facultatif, disponibilité, position GPS."),
    ("VEHICLE","Immatriculation unique, capacité positive, livreur unique."),
    ("CLIENT / DEPOT","Nom, adresse et position spatiale non nulle."),
    ("DELIVERY_ORDER","Référence unique, client existant, poids positif, statut contrôlé."),
    ("DELIVERY_ROUTE","Livreur, dépôt, algorithme, distances et position figée du dépôt."),
    ("ROUTE_STOP","Rang unique par tournée, commande unique historiquement, position figée."),
    ("DELIVERY","Une livraison par commande ; cohérence arrêt/commande par clé étrangère composite.")
],[130,350])
sub("Prévenir les doubles affectations")
p("ROUTE_STOP.order_id est unique dans tout l’historique pour ce MVP. Un index unique fonctionnel interdit deux tournées PLANNED/IN_PROGRESS pour un même livreur. La confirmation verrouille les ressources avant revalidation ; une contrainte ne remplace pas la transaction mais constitue une seconde défense.")
sub("Photographie du parcours")
p("Les coordonnées du dépôt et des arrêts ainsi que les distances par segment sont sauvegardées à la confirmation. Modifier ensuite l’adresse ou la position courante d’un client ne déplace donc pas le parcours historique. Les noms/adresses descriptifs restent des jointures sur les catalogues.")
sub("Données de départ")
p("Le seed crée deux dépôts, dix livreurs, dix véhicules, quarante clients et soixante commandes fictives à Casablanca. Les tests ajoutent des données marquées QA. Le benchmark utilise une table séparée de vingt mille points, sans modifier les positions métier.")

title(5,"Flux métier et contrats REST")
table(["Ressource","Endpoints principaux"],[
    ("Authentification","POST /api/auth/login ; POST /api/users (ADMIN)."),
    ("Catalogues","GET/POST /api/clients, /drivers, /vehicles, /depots ; PUT par identifiant."),
    ("Commandes","GET/POST /api/orders ; PUT /{id} ; PATCH /{id}/status."),
    ("Proximité","GET /api/spatial/nearest-drivers ; /drivers-within-radius."),
    ("Planification","POST /api/routes/optimize ; POST /api/routes ; GET /api/routes/{id}."),
    ("Exécution","PATCH /api/routes/{id}/status ; PATCH /api/deliveries/{id}/status."),
    ("Statistiques","GET /api/dashboard/stats.")
],[110,370])
sub("De l’aperçu à l’engagement")
p("L’aperçu vérifie l’existence et l’unicité des commandes, leur statut, l’activité du client, la disponibilité du livreur, l’existence d’un véhicule et la capacité totale. Il retourne les arrêts, les métriques, le dépôt, les distances par segment et le retour éventuel sans écrire en base.")
p("La confirmation reçoit à nouveau les identifiants et options, verrouille les ressources, revalide et recalcule le plan. Dans une seule transaction, elle crée tournée, arrêts et livraisons, affecte les commandes et réserve le livreur. Les métriques fournies par le navigateur ne sont jamais considérées comme fiables.")
sub("Transitions et erreurs")
p("Commande : PENDING, ASSIGNED, IN_DELIVERY, DELIVERED ; annulation avant exécution. Tournée : PLANNED, IN_PROGRESS, COMPLETED ; annulation seulement avant départ. La dernière livraison réalisée termine automatiquement la tournée. HTTP 400 : validation ; 401 : authentification ; 403 : accès interdit ; 404 : absence ; 409 : conflit métier ; 503 : indisponibilité Oracle.")

title(6,"Matrice et heuristiques d’optimisation")
p("Pour n commandes, le dépôt occupe l’indice 0 et les destinations les indices 1 à n. SpatialJdbcRepository transmet les points comme paramètres liés dans une CTE Oracle. Une requête calcule les paires i&lt;j avec SDO_GEOM.SDO_DISTANCE(...,0.005,'unit=KM'). La symétrie remplit la seconde moitié de la matrice et la diagonale est nulle.")
sub("Nearest Neighbor")
p("À partir du dépôt, choisir à chaque étape le point non visité le plus proche. Un balayage simple sur la matrice coûte O(n²). En cas d’égalité, l’ordre d’entrée rend le comportement déterministe. Le dépôt de retour est ajouté seulement si l’option est activée.")
sub("2-opt")
p("L’algorithme inverse un segment si cela réduit la distance totale. Le dépôt initial ne bouge jamais ; le dépôt final est conservé pour une tournée fermée. Une tournée ouverte permet de modifier le dernier point. La formule de variation utilisée suppose une matrice symétrique ; elle ne doit pas être réutilisée telle quelle pour un réseau routier asymétrique. L’exécution s’arrête après stabilité ou 200 passes.")
sub("Mesure honnête du gain")
p("La distance initiale est celle de Nearest Neighbor, pas une séquence aléatoire. Le gain exprime uniquement l’apport de 2-opt sur cette même matrice. Si la distance initiale est nulle, le pourcentage est null et non un zéro artificiel.")
table(["Mesure réelle sur cinq commandes QA","Valeur"],[
    ("Distance NN",f'{metrics["initialDistanceKm"]:.3f} km'),
    ("Distance après 2-opt",f'{metrics["optimizedDistanceKm"]:.3f} km'),
    ("Gain",f'{metrics["improvementPercent"]:.2f} %'),
    ("Temps du service (validation + Oracle + heuristiques)",f'{metrics["computationTimeMs"]:.1f} ms'),
],[330,150])
p("Il s’agit d’un exemple mesuré, pas d’une performance garantie ni d’une preuve d’optimum global.")

title(7,"Vérification et résultats fonctionnels")
p(f'La campagne HTTP exécutée le {api["executedAt"][:10]} a validé <b>{len(api["tests"])} contrôles</b> contre la base Oracle réelle. Les 9 tests JUnit ont également réussi sous Java 21. Un test paramétré interne vérifie 200 variantes déterministes de parcours ouverts et fermés.')
table(["Famille","Vérifications réellement exécutées"],[
    ("Spatial","Cinq disponibles triés par distance ; tous les résultats du rayon dans 5 km."),
    ("Validation","GPS hors bornes, IDs dupliqués, commande absente, pagination invalide."),
    ("Capacité","Commande de 151 kg refusée pour un véhicule de 150 kg."),
    ("Persistance","Aperçu sans changement de statut ; confirmation avec cinq arrêts."),
    ("Exécution","Démarrage, mise à jour GPS, livraisons, clôture et libération du livreur."),
    ("Sécurité","401 sans JWT, 403 pour gestion clients par DRIVER et GPS d’un autre livreur."),
    ("Concurrence","Deux confirmations simultanées sur les mêmes commandes : un 201 et un 409."),
    ("Interface","Sept listes chargées, formulaire client, proximité, aperçu, confirmation, livraison, mobile sans débordement.")
],[105,375])
sub("Preuves et limites des tests")
p("Les résultats bruts sont dans docs/evidence/api-tests.json, ui-tests.json, concurrency-test.json et oracle-benchmark.txt. Le runner navigateur a signalé zéro erreur console lors du scénario réussi. Des requêtes de tuiles ont été annulées lors des changements de carte ; cela ne représente pas un échec de l’API.")
p("Ces contrôles ne remplacent pas un test de charge multi-utilisateur, un audit de sécurité, une restauration de sauvegarde ni une campagne de compatibilité sur plusieurs versions Oracle. La connexion Oracle et les captures SQL Developer finales doivent aussi être démontrées personnellement.")

title(8,"Index spatial : expérience mesurée")
p("Le benchmark utilise 20 000 points indépendants des données métier et un centre fixe à Casablanca. Deux échauffements précèdent dix répétitions. Chaque répétition exécute le filtre spatial indexé et le calcul de distance par balayage, puis vérifie que les nombres de résultats sont égaux.")
table(["Paramètre","Valeur"],[
    ("Rayon / SRID","5 km / 4326"),
    ("Résultats par méthode",str(bench[0][1])),
    ("Moyenne filtre indexé",f'{statistics.mean(r[2] for r in bench):.1f} ms'),
    ("Moyenne balayage SDO_DISTANCE",f'{statistics.mean(r[3] for r in bench):.1f} ms'),
    ("Médiane balayage",f'{statistics.median(r[3] for r in bench):.1f} ms'),
    ("Résolution du chronomètre","10 ms (DBMS_UTILITY.GET_TIME)")
],[280,200])
sub("Lecture des plans")
p("Le plan indexé contient DOMAIN INDEX sur IDX_GD_BENCH_POSITION, puis TABLE ACCESS BY INDEX ROWID. Le plan de la seconde méthode contient TABLE ACCESS FULL. SDO_DISTANCE est alors évaluée sur les lignes du balayage. L’index lui-même reste présent ; c’est l’expression utilisée qui ne l’exploite pas.")
sub("Interprétation et prudence")
p("Les valeurs de 0 ms du filtre indexé signifient « sous la résolution de mesure », jamais « coût nul ». Les temps dépendent du cache, de la charge de cette machine, de la distribution des points et du rayon. L’ordre des deux méthodes est fixe dans chaque répétition : cette limite et le faible nombre de répétitions empêchent une généralisation.")
p("On ne lance pas SDO_NN sans index pour fabriquer une comparaison invalide. Les coûts EXPLAIN PLAN ne sont pas des durées réelles : ils sont étudiés séparément des mesures chronométrées. Les résultats bruts et les plans complets sont livrés.")

title(9,"Interface : centre de contrôle")
screenshot("dashboard.png","Capture réelle : KPI et positions lus depuis Oracle. Les compteurs évoluent après les scénarios QA ; ils ne correspondent pas nécessairement au seed initial.",540)

title(10,"Interface : aperçu et parcours")
screenshot("optimization.png","Capture réelle : sélection de cinq commandes, matrice géodésique, résultat NN + 2-opt, segments droits et confirmation explicite.",540)

title(11,"Reproduction, limites et perspectives")
sub("Reproduire sans écraser l’existant")
p("Sur cette machine, le schéma GEODELIVERY est déjà installé dans ORCLPDB. Démarrer scripts/backend.ps1 puis npm start dans frontend/. Se connecter sur http://localhost:4200 avec les valeurs locales .env. Swagger est accessible via 127.0.0.1:8080. Les scripts SQL de création ne sont pas idempotents et ne suppriment aucun objet.")
p("Sur une autre machine, utiliser la méthode manuelle documentée dans README.md ou le bootstrap local si l’authentification OS DBA est disponible. Le schéma n’a pas le rôle DBA. Le droit INHERIT PRIVILEGES est accordé à MDSYS pour ce seul utilisateur, afin d’exécuter les packages invoker-rights sur l’installation 19c testée.")
sub("Limites explicites")
p("La replanification historique est exclue par l’unicité globale de ROUTE_STOP.order_id. Une tournée annulée conserve ses arrêts et annule ses commandes. Un échec de livraison bloque la clôture, sans workflow de reprise dans ce MVP. Les sélecteurs et la carte chargent au plus 200 éléments ; un chargement incrémental devra être ajouté pour de plus grands volumes.")
p("Les tuiles OSM et les fontes nécessitent Internet ; une vidéo de secours est utile. La vidéo automatisée locale n’est pas une soutenance orale et ne montre pas SQL Developer. Les membres du groupe, l’encadrement et les captures SQL Developer restent à compléter avant remise.")
sub("Perspectives prioritaires")
p("Intégrer un moteur OSRM/GraphHopper avec contrat ROAD distinct ; gérer une matrice asymétrique ; permettre la reprise d’échecs et les affectations actives avec historique ; intégrer des fenêtres horaires et un solveur multi-véhicules. Avant exposition externe : HTTPS, protection contre les tentatives répétées, rotation des secrets, révocation des sessions, audit des dépendances, sauvegardes et supervision.")
sub("Références techniques")
p("Oracle Database 19c Spatial and Graph Developer’s Guide : docs.oracle.com/en/database/oracle/oracle-database/19/spatl/ ; Spring Boot Reference : docs.spring.io/spring-boot/ ; Angular : angular.dev ; Leaflet : leafletjs.com ; politique de tuiles : operations.osmfoundation.org/policies/tiles/. Ces liens sont des références techniques, pas une bibliographie de recherche prétendument consultée.")

def page_decor(canvas,doc):
    canvas.setFillColor(GREEN);canvas.setFont("BodyBold",8)
    canvas.drawString(48,30,"GeoDelivery · Oracle Spatial")
    canvas.setFillColor(GRAY);canvas.setFont("Body",8)
    canvas.drawRightString(A4[0]-48,30,f"GLSID 3 · {doc.page}")
doc=SimpleDocTemplate(str(DOCS/"rapport.pdf"),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=42,bottomMargin=48,
    title="GeoDelivery — Rapport technique",author="Équipe GeoDelivery (à compléter)")
doc.build(story,onFirstPage=page_decor,onLaterPages=page_decor)
print("PDF créé :",DOCS/"rapport.pdf")
