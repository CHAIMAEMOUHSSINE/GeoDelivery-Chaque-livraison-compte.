"""Contenu redactionnel du rapport GeoDelivery, separe de sa mise en page."""
from report_professional import (
    p,sub,heading,table,code,note,ui_page,image,caption,story,styles,
    architecture,relational,workflow,metrics,api,benchmark,CONTENT
)
from reportlab.platypus import PageBreak,Paragraph,Spacer
import statistics

def compose():
    heading("Introduction générale",0,page=True)
    p("La livraison du dernier kilomètre constitue un maillon sensible de la chaîne logistique. Le dispatcher doit rapprocher des commandes, des adresses, des ressources humaines et des moyens de transport, tout en conservant une vision fiable de l’avancement. Une gestion uniquement tabulaire permet de suivre les demandes, mais elle exploite difficilement les relations de proximité entre les lieux. La géolocalisation apporte cette dimension spatiale à la décision.")
    p("Dans le cadre du module Administration des bases de données, GeoDelivery a été conçu pour montrer comment une base Oracle peut participer activement à cette organisation. Le projet ne se limite pas à afficher des marqueurs sur une carte : les positions sont stockées dans des colonnes géométriques, les recherches utilisent des index spatiaux et les distances nécessaires au calcul sont mesurées dans Oracle.")
    sub("Problématique")
    p("<b>Comment exploiter Oracle Spatial pour rechercher des livreurs disponibles à proximité, construire une tournée cohérente et assurer la continuité entre le calcul géographique et l’exécution des livraisons ?</b>")
    sub("Objectifs et démarche")
    p("Le travail poursuit quatre objectifs complémentaires : concevoir un schéma relationnel contraint ; démontrer les opérateurs spatiaux ; proposer des API métier fiables ; rendre les résultats accessibles dans une interface cartographique. La démarche part de la base de données, poursuit par le backend et les heuristiques d’optimisation, puis aboutit aux interfaces et à une campagne de validation reproductible.")
    sub("Organisation du rapport")
    p("Le premier chapitre expose les besoins et les règles métier. Le deuxième présente les fondements géographiques et les technologies retenues. Le troisième décrit la conception. Le quatrième détaille l’implémentation. Le cinquième documente chaque interface par des captures réelles et une explication de son fonctionnement. Le sixième analyse les tests et les performances. Une conclusion précise les limites et les perspectives.")
    note("Distinction de lecture : le terme « optimisation » désigne ici une amélioration heuristique d’un parcours géodésique. Il n’implique ni la résolution exacte du TSP, ni le calcul d’un plus court chemin routier.")

    heading("Chapitre 1 — Contexte et analyse des besoins",0,page=True)
    heading("1.1 Contexte du projet et objectifs opérationnels",1)
    p("GeoDelivery prend pour contexte une activité fictive de distribution urbaine à Casablanca. Un gestionnaire prépare des commandes pour différents clients ; des livreurs dotés de véhicules quittent un dépôt et réalisent plusieurs arrêts. La disponibilité, la position et la capacité doivent être prises en compte avant de réserver une ressource.")
    p("La valeur attendue de l’application est double. Sur le plan opérationnel, elle centralise les informations et rend les affectations plus lisibles. Sur le plan pédagogique, elle fournit une chaîne démontrable reliant les données géographiques Oracle à un résultat exploitable dans une application web.")
    table(["Objectif","Critère de vérification"],[
      ("Stocker les positions","Trois colonnes SDO_GEOMETRY avec SRID 4326, métadonnées et index valides."),
      ("Rechercher la proximité","Voisins disponibles ordonnés par distance et filtre de rayon en kilomètres."),
      ("Améliorer un parcours","Même jeu d’arrêts ; distance 2-opt inférieure ou égale au résultat NN."),
      ("Fiabiliser l’affectation","Aperçu sans écriture, confirmation transactionnelle, capacité et unicité."),
      ("Suivre l’exécution","États synchronisés et libération du livreur après le dernier arrêt livré.")
    ],[145,CONTENT-145])
    heading("1.2 Acteurs et responsabilités",1)
    table(["Rôle","Responsabilités","Restrictions principales"],[
      ("ADMIN","Comptes, livreurs, véhicules, dépôts et fonctions de dispatch.","Accès à protéger ; aucune publication des secrets."),
      ("DISPATCHER","Clients, commandes, proximité et préparation des tournées.","Pas d’administration des comptes ou des ressources réservées à ADMIN."),
      ("DRIVER","Ses tournées, ses livraisons et sa propre position.","Contrôle de propriété côté serveur, pas seulement dans le menu Angular.")
    ],[83,220,CONTENT-303])
    p("L’administration des comptes est fournie par API et Swagger. Il n’existe pas de page dédiée à cette fonction dans la version présentée ; le rapport ne lui attribue donc pas une interface fictive.")
    heading("1.3 Besoins fonctionnels et exigences de qualité",1,page=True)
    sub("Fonctions essentielles")
    p("Les catalogues doivent permettre de saisir les clients et leurs positions, de gérer les livreurs et les véhicules, puis de définir les dépôts. Les commandes associent un client actif à une référence, un poids et une priorité. La carte complète ces listes par des recherches de voisinage. Le planificateur sélectionne les ressources, calcule un aperçu et confirme un plan choisi. Enfin, les livraisons mettent à jour l’exécution de chaque arrêt.")
    sub("Fiabilité et cohérence")
    p("Les coordonnées, les identifiants, les capacités et les transitions de statut sont validés côté backend. Les contraintes relationnelles constituent une seconde protection. Les requêtes SQL lient leurs paramètres. Les lectures volumineuses sont limitées et paginées. Les secrets restent dans la configuration locale et les mots de passe sont stockés sous forme de hachages.")
    heading("1.4 Cycle de vie et contraintes métier",1)
    table(["Objet","Évolution normale","Règle à retenir"],[
      ("Commande","PENDING → ASSIGNED → IN_DELIVERY → DELIVERED","L’affectation et la livraison passent par leurs services ; une ligne ne peut pas être arbitrairement déclarée livrée."),
      ("Tournée","PLANNED → IN_PROGRESS → COMPLETED","Annulation avant démarrage seulement ; un livreur ne possède pas deux tournées actives."),
      ("Livraison","PENDING → IN_PROGRESS → DELIVERED","FAILED représente un échec terminal dans le MVP et bloque la clôture.")
    ],[85,190,CONTENT-275])
    p("La somme des poids doit rester inférieure ou égale à la capacité du véhicule. Toutes les commandes du plan doivent être en attente et uniques. Pour cette première version, une commande ne peut apparaître que dans une seule tournée, même historique. Annuler un plan annule donc ses commandes ; la replanification avec conservation d’historique constitue une extension.")
    heading("1.5 Périmètre retenu",1)
    p("L’optimisation porte sur un dépôt, un livreur et plusieurs arrêts, avec retour facultatif. Le prototype ne traite ni le trafic, ni les fenêtres horaires, ni la distribution simultanée sur plusieurs véhicules. Les priorités sont enregistrées mais ne sont pas une contrainte du calcul. Ces choix limitent la complexité afin de concentrer la réalisation sur Oracle Spatial et sur un flux métier vérifiable.")

    heading("Chapitre 2 — Fondements géographiques et technologies",0,page=True)
    heading("2.1 Géolocalisation, SIG et système de référence",1)
    p("Un système d’information géographique associe les propriétés d’un objet à sa localisation. La latitude décrit la position nord-sud ; la longitude décrit la position est-ouest. Ces coordonnées n’ont de sens que dans un référentiel connu. Le SRID identifie ce référentiel dans la base.")
    p("GeoDelivery utilise WGS84, SRID 4326, adapté à la représentation de positions GPS. Les objets du MVP sont des points 2D : client, dépôt et position courante d’un livreur. Un point représente une localisation, pas un tronçon de route ni un itinéraire détaillé.")
    heading("2.2 Représentation SDO_GEOMETRY",1)
    code("""MDSYS.SDO_GEOMETRY(
    2001,
    4326,
    MDSYS.SDO_POINT_TYPE(-7.6300, 33.5300, NULL),
    NULL,
    NULL
)""")
    table(["Élément","Signification"],[
      ("2001","Géométrie ponctuelle en deux dimensions."),
      ("4326","Identifiant du système de référence WGS84."),
      ("SDO_POINT_TYPE(X,Y,NULL)","X = longitude ; Y = latitude ; absence d’altitude dans ce MVP."),
      ("SDO_ELEM_INFO / SDO_ORDINATES","Non nécessaires pour le point simple représenté avec SDO_POINT.")
    ],[180,CONTENT-180])
    p("L’API expose des champs nommés latitude et longitude pour éviter une convention implicite. Leaflet reçoit ensuite [latitude, longitude]. Les bornes autorisées sont respectivement [-90,90] et [-180,180]. Les valeurs non finies sont rejetées.")
    heading("2.3 Métadonnées et index spatiaux",1,page=True)
    p("Les entrées de USER_SDO_GEOM_METADATA déclarent les dimensions, leurs bornes, la tolérance et le SRID. Elles sont créées avant les index. La configuration est reproduite sur CLIENT.position, DRIVER.current_position et DEPOT.position.")
    code("""CREATE INDEX idx_driver_position
ON DRIVER(current_position)
INDEXTYPE IS MDSYS.SPATIAL_INDEX_V2;""")
    p("L’index spatial permet de sélectionner rapidement les candidats pertinents avant un traitement géométrique plus précis. Il ne remplace ni le filtre métier de disponibilité, ni les contrôles transactionnels. La tolérance de 0,005 est interprétée dans le contexte géodésique Oracle ; elle n’est pas un pas arbitraire de GPS en degrés.")
    heading("2.4 Opérateurs exploités",1)
    table(["Opérateur","Usage effectif"],[
      ("SDO_NN","Recherche des livreurs les plus proches du point client."),
      ("SDO_NN_DISTANCE","Distance associée au voisinage ; même identifiant de corrélation."),
      ("SDO_WITHIN_DISTANCE","Sélection des livreurs dans un rayon exprimé en kilomètres."),
      ("SDO_GEOM.SDO_DISTANCE","Distance entre deux géométries et matrice géodésique."),
      ("SDO_RELATE","Démonstration SQL de relation entre un point et une zone."),
      ("SDO_CS.TRANSFORM","Démonstration SQL de changement de référentiel."),
      ("VALIDATE_GEOMETRY_WITH_CONTEXT","Validation des géométries de démonstration.")
    ],[215,CONTENT-215])
    p("Les opérateurs de voisinage et de rayon utilisent les index spatiaux. Le benchmark n’essaie pas de faire fonctionner SDO_NN sans index. Il compare deux expressions valides d’un même filtre de rayon : l’opérateur indexé et un balayage évaluant SDO_DISTANCE sur les lignes.")
    heading("2.5 Distance géodésique et distance routière",1)
    p("Une distance géodésique mesure la séparation sur la surface terrestre selon le modèle géographique utilisé. Une distance routière suit un réseau accessible, avec ses connexions et ses règles. Les obstacles, les sens uniques et les détours expliquent l’écart entre les deux mesures.")
    p("Le contrat de réponse annonce donc <b>GEODESIC</b>. Les lignes affichées dans Leaflet relient les positions par des segments indicatifs. Un futur moteur OSRM ou GraphHopper devra fournir une matrice ROAD distincte, potentiellement asymétrique.")
    heading("2.6 Choix technologiques",1,page=True)
    table(["Couche","Choix","Motivation"],[
      ("Base","Oracle Database 19c + Spatial","Types, métadonnées, index et opérateurs géographiques réellement démontrés."),
      ("Backend","Java 21, Spring Boot 3.5.7","API REST, validation, sécurité et transactions."),
      ("Persistance","Spring Data JPA et JDBC","JPA pour comptes/commandes ; JDBC pour maîtriser géométries et requêtes spatiales."),
      ("Frontend","Angular standalone","Routage, services HTTP et formulaires réactifs."),
      ("Carte","Leaflet + fond OSM","Marqueurs, fenêtres d’information, légende et polylignes explicites."),
      ("Documentation","OpenAPI / Swagger","Consultation et essai des contrats REST.")
    ],[75,160,CONTENT-235])
    p("Le choix d’un monolithe modulaire réduit les coûts de déploiement et de coordination. Les scripts SQL versionnés constituent le seul mécanisme d’initialisation. Hibernate ne crée ni ne modifie les tables ; Flyway n’est pas activé en parallèle.")
    sub("Conditions d’exploitation")
    p("L’application reste locale. Le backend écoute sur 127.0.0.1 et le serveur Angular sur localhost. Le fond de carte OpenStreetMap et les fontes externes nécessitent Internet. Les données métier, les requêtes Oracle et le calcul ne dépendent pas d’un service de routage externe.")

    heading("Chapitre 3 — Conception de la solution",0,page=True)
    heading("3.1 Architecture applicative",1)
    story.append(architecture());caption("Architecture du monolithe modulaire GeoDelivery.")
    p("La couche de présentation s’adresse à l’API via HTTP JSON. Les contrôleurs traduisent les requêtes en appels de services. Les services appliquent les autorisations, les contraintes métier et les transactions. Le calcul délègue les mesures géographiques à la couche spatiale avant d’exécuter les heuristiques.")
    p("Les catalogues géographiques sont manipulés en JDBC pour contrôler explicitement SDO_GEOMETRY. Les comptes et l’écriture des commandes utilisent JPA. Les projections de lecture sont retournées avec des clés camelCase, sans exposer directement les entités JPA au navigateur.")
    heading("3.2 Modèle relationnel et liens entre objets",1,page=True)
    diagram=relational();diagram.scale(.85,.85);diagram.width*=.85;diagram.height*=.85;diagram.hAlign="CENTER"
    story.append(diagram);caption("Vue synthétique des neuf tables métier et de leurs dépendances.")
    p("CLIENT et DELIVERY_ORDER portent la demande. DRIVER, VEHICLE et DEPOT portent les ressources. DELIVERY_ROUTE décrit un plan confirmé, ROUTE_STOP conserve son séquencement et DELIVERY porte l’état d’exécution. APP_USER identifie le compte et son rôle ; le lien unique user_id permet de rattacher un profil livreur à un utilisateur.")
    p("Une clé étrangère composite assure qu’une livraison et l’arrêt qui lui est associé concernent la même commande. Les positions du dépôt et des arrêts sont copiées dans les tables de planification pour préserver la géométrie du parcours historique.")
    heading("3.3 Contraintes d’intégrité et réservations",1)
    table(["Contrainte","Risque évité"],[
      ("Email, immatriculation et référence uniques","Création ambiguë de comptes, véhicules ou commandes."),
      ("Poids et capacité strictement positifs","Entrée métier dépourvue de sens."),
      ("Rang unique par tournée","Deux arrêts au même rang."),
      ("Commande unique dans ROUTE_STOP","Double affectation historique dans le MVP."),
      ("Index fonctionnel sur le livreur actif","Deux tournées PLANNED/IN_PROGRESS pour le même livreur.")
    ],[235,CONTENT-235])
    heading("3.4 Séparation entre aperçu et confirmation",1,page=True)
    story.append(workflow());caption("Flux de préparation, d’engagement et d’exécution.")
    p("L’aperçu doit rester réversible : il vérifie les données, calcule et retourne un plan sans changer le statut des commandes. Le dispatcher peut comparer les algorithmes ou modifier la sélection. Seule une confirmation explicite déclenche les écritures.")
    p("La confirmation ne fait pas confiance aux métriques transmises par le navigateur. Elle verrouille les ressources, revalide la situation et recalcule le parcours. La tournée, les arrêts, les livraisons et les statuts sont ensuite enregistrés dans la même transaction.")
    heading("3.5 Conception de la sécurité",1)
    p("Le mot de passe est vérifié contre un hachage BCrypt. Le jeton JWT signé contient un identifiant utilisateur, un rôle, un émetteur et une expiration d’une heure. Les restrictions de méthode limitent les fonctions d’administration et de dispatch. Une vérification supplémentaire de propriété protège les données appartenant à un livreur.")
    p("Le frontend masque les liens non autorisés pour améliorer l’expérience, mais le backend demeure l’autorité. Une requête directe à l’API ne doit pas permettre de contourner les règles. La clé JWT et les mots de passe de connexion ne sont ni inclus dans les captures, ni intégrés à l’archive de remise.")

    heading("Chapitre 4 — Implémentation et optimisation",0,page=True)
    heading("4.1 Installation du schéma Oracle",1)
    p("La réalisation testée utilise une installation Oracle 19c existante et la PDB ORCLPDB. Un schéma GEODELIVERY dédié a été ajouté sans supprimer ni réinitialiser les schémas préexistants. Il ne dispose pas du rôle DBA. Le droit INHERIT PRIVILEGES accordé à MDSYS vise ce seul utilisateur, en réponse à la restriction invoker-rights observée sur cette installation.")
    table(["Étape","Fichier ou répertoire"],[
      ("Créer le schéma applicatif","database/schema/00_create_user.sql"),
      ("Créer les neuf tables et leurs contraintes","database/schema/01_schema.sql"),
      ("Déclarer le SRID et les dimensions","database/spatial/02_metadata.sql"),
      ("Créer les trois index spatiaux","database/spatial/03_indexes.sql"),
      ("Charger les données fictives","database/seed/04_seed.sql"),
      ("Vérifier la cohérence et les géométries","database/tests/06_acceptance.sql et procedures/10_validate_spatial_data.sql")
    ],[215,CONTENT-215])
    p("Les scripts de création ne sont pas idempotents. Une installation interrompue doit être examinée avant reprise : relancer l’ensemble sur un schéma partiel ne constitue pas une procédure de récupération. Aucun reset automatique n’est livré.")
    heading("4.2 API REST et validation",1)
    p("Les endpoints sont répartis entre authentification, catalogues, commandes, géographie, tournées, livraisons et statistiques. Les DTO contrôlent les bornes GPS, les poids et les identifiants. Les erreurs renvoient des statuts cohérents : 400 pour la validation, 401 pour l’absence d’authentification, 403 pour une permission refusée, 404 pour une ressource absente et 409 pour un conflit métier.")
    heading("4.3 Recherches spatiales et disponibilité",1,page=True)
    p("La recherche de voisins doit renvoyer des livreurs disponibles, pas simplement les points les plus proches. La stratégie sdo_batch_size permet de poursuivre la recherche de candidats tout en appliquant le filtre AVAILABLE et la limite. Le numéro de corrélation 1 relie SDO_NN à SDO_NN_DISTANCE.")
    code("""SELECT d.id, d.name, SDO_NN_DISTANCE(1) AS distance_km
FROM DRIVER d
WHERE d.status = 'AVAILABLE'
  AND SDO_NN(d.current_position, :point,
      'sdo_batch_size=10 unit=KM', 1) = 'TRUE'
  AND ROWNUM <= :limit
ORDER BY distance_km;""")
    p("Dans la requête JDBC réelle, le point est construit avec des coordonnées liées. Le filtre de rayon lie également son paramètre d’opérateur ; une chaîne provenant du navigateur n’est pas concaténée dans le SQL.")
    heading("4.4 Construction de la matrice",1)
    p("Pour n commandes, le dépôt occupe l’indice 0 et les destinations les indices 1 à n. Les points sont transmis dans une expression de table commune Oracle. SDO_GEOM.SDO_DISTANCE calcule les paires i&lt;j en kilomètres ; la symétrie complète la seconde moitié de la matrice et la diagonale reste nulle.")
    p("Cette matrice découple l’algorithme des requêtes SQL : les heuristiques travaillent ensuite sur des nombres homogènes sans interroger Oracle pour chaque comparaison. Le prototype limite la sélection à 60 arrêts pour maîtriser le nombre de paires.")
    heading("4.5 Nearest Neighbor et amélioration 2-opt",1,page=True)
    sub("Construction initiale")
    p("Nearest Neighbor part du dépôt puis choisit successivement le point non visité le plus proche. Un parcours simple de la matrice produit une complexité usuelle O(n²). L’ordre d’entrée rend les égalités déterministes. Le dépôt final est ajouté uniquement lorsque le retour est demandé.")
    code("""parcours = [depot]
tant qu'il reste des commandes non visitees :
    choisir la destination la plus proche du point courant
    l'ajouter au parcours et la marquer visitee
si retour demande : ajouter le depot""")
    sub("Amélioration locale")
    p("2-opt inverse des segments lorsqu’une inversion réduit la distance totale. Le dépôt de départ n’est jamais déplacé. Une tournée fermée conserve aussi le dépôt final ; une tournée ouverte autorise l’amélioration du dernier point. Le calcul s’arrête après stabilité ou après une limite de 200 passes.")
    p("La formule de variation suppose une matrice symétrique, ce qui est cohérent avec les distances géodésiques du MVP. Elle devra être adaptée si un service routier produit des coûts asymétriques. Ces deux algorithmes sont des heuristiques et n’apportent aucune preuve d’optimalité globale.")
    heading("4.6 Contrat de calcul et métriques",1)
    code("""{
  "driverId": 3,
  "depotId": 1,
  "orderIds": [12, 15, 18, 21, 24],
  "algorithm": "TWO_OPT",
  "returnToDepot": true
}""")
    p("Les identifiants ci-dessus illustrent le format du contrat ; ils ne constituent pas une requête à rejouer aveuglément sur une base déjà utilisée. La réponse contient le dépôt, tous les arrêts ordonnés, les distances par segment, le retour et les métriques. Le pourcentage compare 2-opt au résultat NN sur la même matrice ; il vaut null si la distance de référence est nulle.")

    heading("Chapitre 5 — Réalisation et présentation des interfaces",0,page=True)
    p("Ce chapitre constitue un guide de lecture de l’application réalisée. Chaque capture provient d’une exécution réelle avec des données fictives. Les listes sont paginées ; les captures montrent les premières lignes visibles et ne représentent pas l’ensemble du jeu. Les formulaires sont photographiés avant enregistrement, puis le scénario vérifie leur validation effective.")
    table(["Interface","Fonction démontrée"],[
      ("Connexion et tableau de bord","Authentification et vue globale des opérations."),
      ("Clients, livreurs, véhicules et dépôts","Gestion des destinations et des ressources géographiques."),
      ("Commandes","Création, filtres de statut et données de préparation."),
      ("Carte","Visualisation, voisins disponibles et rayon géodésique."),
      ("Planificateur et résultats","Sélection, NN, 2-opt et comparaison avant confirmation."),
      ("Tournées, GPS et livraisons","Engagement, démarrage, exécution et clôture."),
    ],[205,CONTENT-205])
    p("Le scénario de démonstration de dix minutes suit cette progression : il prépare les ressources dans les interfaces, crée une commande et complète un jeu fictif, compare les parcours, confirme la tournée puis livre ses cinq arrêts. Les explications renvoient aux règles Oracle et aux API au lieu de présenter les pages comme de simples écrans décoratifs.")

    ui_page("5.1 Connexion et accès sécurisé",[
      ("01-connexion","Page de connexion à GeoDelivery.",305,CONTENT)
    ],[
      "La page d’entrée sépare l’identité visuelle du formulaire d’authentification. L’utilisateur renseigne son adresse électronique et son mot de passe. Le bouton reste désactivé tant que les champs requis ne sont pas valides ; les identifiants incorrects provoquent un message d’erreur sans exposer le hachage ni les détails Oracle.",
      "Après succès, le rôle détermine la destination et les liens visibles. Le jeton expire après une heure ; l’API vérifie sa signature et son émetteur à chaque requête protégée."
    ],technical="POST /api/auth/login émet un JWT après vérification BCrypt. Les mots de passe et les jetons sont volontairement absents des captures du rapport.")
    ui_page("5.2 Tableau de bord des opérations",[
      ("02-tableau-de-bord","Vue d’ensemble : KPI, carte et flotte.",315,CONTENT)
    ],[
      "Les indicateurs donnent une lecture immédiate de la charge : commandes totales, disponibilités et tournées actives. Les kilomètres économisés représentent un gain estimé par rapport à Nearest Neighbor pour les plans enregistrés, pas une économie routière réellement parcourue.",
      "La carte et la flotte complètent ces nombres par une lecture géographique et humaine. Les dernières commandes permettent d’identifier les demandes récentes. Les valeurs peuvent évoluer après chaque scénario de test."
    ],technical="GET /api/dashboard/stats calcule les agrégats dans Oracle. Les points et les informations de flotte proviennent des catalogues via des requêtes dédiées.")
    ui_page("5.3 Clients : liste et recherche",[
      ("03-clients","Catalogue des clients et actions disponibles.",300,CONTENT)
    ],[
      "La liste présente le nom, l’adresse, le téléphone et l’activité. La recherche agit sur la page chargée et les boutons de navigation accèdent aux autres pages. Il ne faut pas présenter ce filtre comme une recherche globale sur une quantité illimitée de clients.",
      "Modifier conserve l’identité du client ; désactiver retire une ressource du flux actif sans supprimer son historique. Une désactivation est refusée tant que des commandes actives lui sont associées."
    ],technical="Les opérations utilisent /api/clients. CLIENT.position reste une colonne SDO_GEOMETRY indexée ; le statut actif intervient lors de la création et de la planification des commandes.")
    ui_page("5.4 Formulaire de création d’un client",[
      ("04-formulaire-client","Saisie d’un client fictif et de sa position WGS84.",285,390)
    ],[
      "Le formulaire associe des données de contact à un point géographique. Dans le scénario, une adresse explicitement fictive est saisie pour éviter toute confusion avec une personne réelle. Le nom et l’adresse sont obligatoires ; les coordonnées doivent rester dans les bornes WGS84.",
      "Après Enregistrer, la fermeture du formulaire et le message de succès confirment la réponse du backend. La persistance est ensuite relue par l’API ; la capture n’est donc pas utilisée comme seule preuve d’écriture."
    ],technical="La requête transmet position.latitude et position.longitude. Le service construit SDO_POINT_TYPE(longitude, latitude, NULL), puis l’index spatial intègre le nouveau point.")
    ui_page("5.5 Livreurs et disponibilité",[
      ("05-livreurs","Liste des livreurs : état et coordonnées courantes.",210,CONTENT),
      ("06-formulaire-livreur","Formulaire d’un nouveau livreur de démonstration.",190,330)
    ],[
      "La liste distingue les livreurs disponibles, occupés et hors ligne. La position affichée est la dernière position enregistrée, pas une mesure issue d’un capteur temps réel. Le formulaire permet à l’administrateur d’ajouter un profil fictif.",
      "Un profil occupé par une tournée ne peut pas être librement réaffecté. Les droits d’administration et le contrôle de propriété du GPS complètent les contraintes d’affectation."
    ],technical="Les profils sont gérés via /api/drivers. La colonne current_position porte l’index utilisé par les recherches de proximité.")
    ui_page("5.6 Véhicules et contrôle de capacité",[
      ("07-vehicules","Catalogue des véhicules et affectation au livreur.",205,CONTENT),
      ("08-formulaire-vehicule","Saisie d’une immatriculation et d’une capacité de 150 kg.",185,350)
    ],[
      "L’interface véhicule relie un moyen de transport à un livreur. L’immatriculation est unique ; la capacité est strictement positive. Le scénario crée un véhicule de 150 kg pour le nouveau profil.",
      "Cette saisie ne réserve pas encore le véhicule pour un plan. Le contrôle du poids total est réexécuté à l’aperçu puis à la confirmation pour empêcher une sélection ou une modification concurrente incohérente."
    ],technical="VEHICLE.driver_id est unique. Une ressource engagée dans une tournée active ne peut pas être modifiée comme une ressource libre.")
    ui_page("5.7 Dépôts et points de départ",[
      ("09-depots","Liste des dépôts et de leurs positions.",205,CONTENT),
      ("10-formulaire-depot","Création d’un hub fictif à Casablanca.",185,350)
    ],[
      "Un dépôt combine une désignation, une adresse et un point géographique. L’interface constitue le catalogue des origines possibles du calcul. Le retour vers ce point reste une option du planificateur.",
      "Le scénario ajoute un hub fictif pour conserver une chaîne démontrable de bout en bout. Lors de la confirmation, la position de départ est figée dans la tournée."
    ],technical="DEPOT.position possède son entrée de métadonnées et son index spatial. L’édition d’un dépôt engagé dans une tournée active est contrôlée par le service.")
    ui_page("5.8 Commandes et filtre de statut",[
      ("11-commandes","Liste des commandes avec poids, priorité et statut.",220,CONTENT),
      ("12-commandes-filtrees","Vue filtrée sur les commandes en attente.",190,CONTENT)
    ],[
      "La référence identifie la demande ; le client fournit sa destination. Le poids prépare le contrôle de capacité, tandis que le statut matérialise la progression métier. Le filtre distingue les commandes prêtes à être planifiées des commandes déjà engagées.",
      "Une commande affectée ne doit pas être modifiée directement pour contourner une tournée. L’interface n’affiche donc les actions de modification et d’annulation que dans les situations permises, et le backend recontrôle ces conditions."
    ])
    ui_page("5.9 Création d’une commande",[
      ("13-formulaire-commande","Formulaire de commande pour le client de démonstration.",300,390)
    ],[
      "La création demande un client actif, une référence unique, un poids strictement positif et une priorité autorisée. Le scénario saisit une commande de cinq kilogrammes. Elle est enregistrée avec le statut PENDING.",
      "Quatre commandes fictives supplémentaires complètent le jeu du parcours. Le prototype conserve la priorité comme information descriptive ; l’ordre d’arrêt n’est pas forcé par cette valeur."
    ],technical="POST /api/orders valide le client et persiste la commande. Les données classiques utilisent le repository JPA ; les jointures de lecture restituent la destination et le nom du client.")
    ui_page("5.10 Carte générale et lecture des positions",[
      ("14-carte-generale","Carte des clients, livreurs et dépôts.",320,CONTENT)
    ],[
      "La carte utilise une légende et des marqueurs différenciés. Un clic ouvre une information descriptive. Le fond OpenStreetMap sert de repère visuel ; les coordonnées proviennent des enregistrements Oracle.",
      "L’utilisateur peut rapprocher la lecture tabulaire d’une lecture spatiale. Les sélecteurs et les jeux chargés sont limités à 200 éléments par catégorie dans le MVP ; un déploiement plus volumineux nécessiterait un chargement progressif."
    ],technical="Les DTO GPS évitent l’échange direct de SDO_GEOMETRY. La conversion vers les couples Leaflet est explicite, avec l’attribution OSM conservée.")
    ui_page("5.11 Recherche des voisins disponibles",[
      ("15-plus-proches-voisins","Résultat réel de la recherche des cinq livreurs proches.",320,CONTENT)
    ],[
      "Le client sélectionné devient la position de référence. Le nombre de voisins fixe le nombre souhaité de livreurs disponibles ; les distances sont triées en kilomètres. La liste et la carte décrivent le même résultat.",
      "L’opérateur travaille avec la disponibilité : il ne s’agit pas de retenir cinq points puis de perdre des résultats après filtrage. Les ressources disponibles les plus proches sont ainsi exploitables pour préparer une affectation."
    ],technical="GET /api/spatial/nearest-drivers déclenche SDO_NN et SDO_NN_DISTANCE dans Oracle. Le résultat n’est pas une estimation du temps de conduite.")
    ui_page("5.12 Recherche dans un rayon",[
      ("16-recherche-par-rayon","Livreurs disponibles dans le rayon géodésique choisi.",320,CONTENT)
    ],[
      "Le rayon répond à un critère d’appartenance, et non à un nombre fixe de personnes. Il peut retourner moins ou plus de cinq livreurs. Le scénario utilise cinq kilomètres pour illustrer cette différence avec le voisinage.",
      "Le filtre spatial sert à réduire les candidats à proximité. Il ne garantit pas qu’un trajet routier vers le client soit inférieur à cinq kilomètres : la mesure reste géodésique."
    ],technical="GET /api/spatial/drivers-within-radius utilise SDO_WITHIN_DISTANCE avec unité KM et les coordonnées du client de référence.")
    ui_page("5.13 Historique des tournées",[
      ("17-historique-tournees","Historique des plans confirmés et de leurs états.",310,CONTENT)
    ],[
      "Les tournées enregistrées sont accessibles sous forme de liste. Le livreur, le dépôt, la distance et le statut facilitent le suivi. Le lien de détail donne accès au séquencement et à l’exécution.",
      "La liste appartient au périmètre de l’utilisateur connecté. Un compte livreur ne doit voir que ses tournées ; un administrateur ou un dispatcher dispose d’une vue opérationnelle plus large."
    ],technical="GET /api/routes applique le filtre de propriété pour DRIVER. Les distances affichées proviennent du plan confirmé, pas d’un nouveau calcul routier.")
    ui_page("5.14 Préparation de la sélection",[
      ("18-planification","Choix du dépôt, du livreur et de cinq commandes.",310,CONTENT)
    ],[
      "Le planificateur sépare le choix des ressources du résultat. Il affiche les commandes en attente, le poids total et l’option de retour au dépôt. Les cinq références de démonstration sont sélectionnées pour comparer les algorithmes sur les mêmes points.",
      "Toute modification de la sélection invalide l’ancien aperçu. Le dispatcher ne confirme donc pas par erreur une réponse correspondant à un dépôt ou à un ensemble de commandes différent."
    ],technical="OptimizeRouteRequest contient les IDs, l’algorithme et le retour. Le service impose les règles de disponibilité, d’unicité, de statut et de capacité avant le calcul.")
    ui_page("5.15 Aperçu Nearest Neighbor",[
      ("19-resultat-nearest-neighbor","Premier parcours calculé avec Nearest Neighbor seul.",315,CONTENT)
    ],[
      "Le premier ordre relie successivement le point courant à la destination non visitée la plus proche. La carte numérote les arrêts et le résultat expose les distances. Le dépôt reste l’origine.",
      "Ce premier résultat sert de référence à 2-opt. Il ne réserve aucune ressource et peut être recalculé. Les segments droits illustrent l’ordre de visite sans se confondre avec une route réelle."
    ],technical="POST /api/routes/optimize retourne l’aperçu en mode GEODESIC, sans INSERT de tournée ni changement de statut des commandes.")
    ui_page("5.16 Aperçu 2-opt et interprétation des métriques",[
      ("20-resultat-deux-opt","Parcours après amélioration locale 2-opt.",225,CONTENT),
      ("21-metriques-optimisation","Distance initiale, distance améliorée et gain.",175,CONTENT)
    ],[
      "L’interface compare la distance NN et celle du parcours amélioré sur la même matrice. Les arrêts restent identiques ; seul leur ordre peut changer. Le poids, la capacité et le temps de service aident à vérifier le résultat avant engagement.",
      "Un gain positif n’est pas une preuve d’optimum. Un gain nul n’est pas non plus une erreur si le voisinage testé n’apporte aucune amélioration. La confirmation demeure une action séparée."
    ])
    ui_page("5.17 Détail d’une tournée confirmée",[
      ("22-detail-tournee-planifiee","Plan confirmé : arrêts figés et action de démarrage.",315,CONTENT)
    ],[
      "Le détail d’un plan confirmé affiche l’algorithme, la distance, les arrêts et le retour éventuel. L’ordre et les coordonnées ont été persistés. Les commandes deviennent affectées et le livreur est réservé.",
      "Les actions de démarrage et d’annulation dépendent de l’état. L’annulation avant départ annule les commandes du plan dans ce MVP ; elle ne crée pas automatiquement une nouvelle affectation historique."
    ],technical="POST /api/routes verrouille puis revalide les ressources et enregistre le plan en transaction. Les contraintes uniques protègent aussi contre les confirmations concurrentes.")
    ui_page("5.18 Exécution et actualisation GPS",[
      ("23-tournee-en-cours","Tournée démarrée : les arrêts deviennent exécutables.",220,CONTENT),
      ("24-position-gps","Formulaire de mise à jour de la position du livreur.",130,CONTENT)
    ],[
      "Le démarrage fait passer les commandes en livraison. Les boutons d’arrêt permettent alors de déclarer une réussite ou un échec. Le GPS actualise la position courante du livreur, pas la géométrie figée du plan.",
      "La validation des coordonnées est renouvelée à cette étape. Le statut de réussite d’enregistrement confirme la persistance ; il ne signifie pas qu’un flux temps réel est activé."
    ],technical="PATCH /api/routes/{id}/status synchronise le démarrage. PUT /api/drivers/{id}/position applique le contrôle de propriété et écrit dans DRIVER.current_position.")
    ui_page("5.19 Livraisons et clôture automatique",[
      ("25-livraisons","Suivi des livraisons par commande et par tournée.",215,CONTENT),
      ("26-tournee-terminee","État obtenu après la livraison des cinq arrêts.",195,CONTENT)
    ],[
      "Chaque arrêt livré met à jour la livraison et sa commande. Après le dernier succès, le plan passe automatiquement à COMPLETED et le livreur redevient disponible. Le scénario vérifie cet état par une relecture de l’API.",
      "FAILED n’est pas présenté comme un succès. Dans cette version, il bloque la clôture et reste à traiter par une évolution du workflow. Aucune reprise ou replanification automatique n’est revendiquée."
    ])
    ui_page("5.20 Retour au tableau de bord",[
      ("27-tableau-de-bord-final","Retour aux indicateurs après la clôture du parcours.",315,CONTENT)
    ],[
      "La consultation finale met en relation le scénario détaillé et les agrégats. La création des commandes et leur livraison ont modifié les états en base. La disponibilité du livreur et les tournées actives reflètent ces changements.",
      "Cette étape ferme la démonstration de bout en bout : la carte, les services géographiques, les transactions et les interfaces de suivi participent au même flux métier. Les compteurs ne sont pas des valeurs statiques inscrites dans la page."
    ])

    heading("Chapitre 6 — Tests, résultats et discussion",0,page=True)
    heading("6.1 Stratégie de validation",1)
    p("La validation distingue la justesse des heuristiques, la cohérence des API, les manipulations spatiales et la qualité du rendu. Les tests unitaires n’exigent pas Oracle. Les contrôles d’intégration exécutent en revanche le véritable schéma applicatif et y ajoutent des données fictives marquées QA.")
    table(["Niveau","Résultat observé","Preuve"],[
      ("Unitaires","9 tests JUnit réussis ; 200 variantes déterministes incluses dans un test de parcours.","Rapports Surefire après Maven verify."),
      ("API / Oracle",f"{len(api['tests'])} contrôles HTTP validés.","docs/evidence/api-tests.json"),
      ("Concurrence","Une confirmation 201 et une réponse 409 sur les mêmes commandes.","docs/evidence/concurrency-test.json"),
      ("Interface","Listes, création client, carte, aperçu, confirmation et livraison validés.","docs/evidence/ui-tests.json"),
      ("Scénario complet","Toutes les interfaces et formulaires, jusqu’à la clôture des cinq arrêts.","docs/evidence/demo-complete-rehearsal.json")
    ],[85,245,CONTENT-330])
    heading("6.2 Cas d’acceptation métier",1)
    table(["Situation testée","Attendu et constat"],[
      ("Coordonnées hors bornes","Rejet HTTP 400."),
      ("Sélection dupliquée","Rejet HTTP 400, aucun plan enregistré."),
      ("Commande absente","Rejet HTTP 404."),
      ("151 kg pour une capacité de 150 kg","Conflit métier HTTP 409."),
      ("Aperçu simple","Aucun changement de statut ni création de tournée."),
      ("Deuxième affectation","Conflit HTTP 409."),
      ("Accès DRIVER à la gestion clients","Refus HTTP 403."),
      ("Modification du GPS d’un autre livreur","Refus HTTP 403."),
      ("Dernier arrêt livré","Tournée terminée et livreur libéré.")
    ],[240,CONTENT-240])
    heading("6.3 Résultats d’optimisation mesurés",1,page=True)
    p("Les valeurs suivantes proviennent de la campagne API sur cinq commandes QA. Elles sont distinctes des captures du scénario filmé, qui utilise un autre jeu d’arrêts. Cette distinction empêche de comparer des gains calculés sur des points différents.")
    table(["Mesure","Valeur"],[
      ("Distance Nearest Neighbor",f"{metrics['initialDistanceKm']:.3f} km"),
      ("Distance après 2-opt",f"{metrics['optimizedDistanceKm']:.3f} km"),
      ("Amélioration relative",f"{metrics['improvementPercent']:.2f} %"),
      ("Temps du service",f"{metrics['computationTimeMs']:.1f} ms"),
      ("Mode","GEODESIC")
    ],[285,CONTENT-285])
    p("Le temps indiqué comprend les validations, la lecture et la mesure Oracle ainsi que les heuristiques ; ce n’est pas un temps pur de boucle 2-opt. Il dépend aussi de l’état de la machine. Le résultat démontre une amélioration sur cet exemple, sans permettre de promettre le même gain sur toutes les tournées.")
    heading("6.4 Index spatial et benchmark",1)
    p("Un jeu indépendant de 20 000 points est utilisé pour un filtre de rayon de cinq kilomètres. Les méthodes comparées renvoient 421 résultats. Deux échauffements précèdent dix répétitions, avec vérification de l’égalité des nombres de résultats.")
    table(["Mesure","Valeur observée"],[
      ("Filtre spatial indexé : moyenne",f"{statistics.mean(r[2] for r in benchmark):.1f} ms"),
      ("Balayage SDO_DISTANCE : moyenne",f"{statistics.mean(r[3] for r in benchmark):.1f} ms"),
      ("Balayage : médiane",f"{statistics.median(r[3] for r in benchmark):.1f} ms"),
      ("Résolution du chronomètre","10 ms, DBMS_UTILITY.GET_TIME"),
      ("Plan indexé","DOMAIN INDEX puis TABLE ACCESS BY INDEX ROWID"),
      ("Plan par balayage","TABLE ACCESS FULL")
    ],[295,CONTENT-295])
    p("Un résultat de 0 ms signifie que le coût est sous la résolution, pas qu’il est nul. L’ordre des méthodes est fixe dans chaque répétition ; le cache, la charge et la distribution des points influencent les valeurs. Les coûts EXPLAIN PLAN ne sont pas assimilés à des temps réels.")
    heading("6.5 Qualité, limites et sécurité",1,page=True)
    p("La compilation Java et Angular a réussi. Les parcours navigateur validés ne produisent pas d’erreur JavaScript. Les vérifications couvrent les états et les droits les plus importants du scénario, mais ne remplacent pas un audit de sécurité, un test de charge ou un exercice de restauration.")
    p("L’audit npm du bundle de production ne signalait pas de vulnérabilité au contrôle enregistré. L’audit complet de l’outillage signalait 27 alertes transitives, dont 13 hautes et 14 modérées. Ces résultats sont conservés dans les preuves ; aucun correctif forcé rétrogradant Angular n’a été appliqué. Le serveur de développement doit rester local.")
    table(["Limite","Conséquence ou perspective"],[
      ("Distances non routières","Intégrer un moteur ROAD et adapter les matrices asymétriques."),
      ("Un seul livreur par calcul","Évoluer vers un problème multi-véhicules avec contraintes."),
      ("Absence de fenêtres horaires","Ajouter un modèle de temps et des engagements de livraison."),
      ("Unicité historique des commandes","Concevoir des affectations actives avec historique de replanification."),
      ("Échec non repris","Définir une reprise, une nouvelle tentative et les transitions associées."),
      ("Chargement limité des sélecteurs","Introduire recherche serveur et chargement incrémental."),
      ("Prototype local","HTTPS, secrets, limitation des tentatives, sauvegardes et supervision avant exposition.")
    ],[180,CONTENT-180])
    sub("Bilan de la validation")
    p("Les résultats montrent la faisabilité d’un flux connecté à Oracle Spatial et la cohérence du plan avec ses contraintes principales. Ils ne démontrent ni l’optimalité globale du parcours, ni une performance universelle, ni la préparation du système à une exploitation publique.")

    heading("Conclusion générale et perspectives",0,page=True)
    p("GeoDelivery répond à la problématique en reliant trois dimensions souvent séparées : la donnée géographique, la décision de planification et l’exécution métier. Oracle Spatial ne sert pas seulement de support de stockage ; ses types, ses métadonnées, ses index et ses opérateurs produisent les mesures et les sélections nécessaires à l’application.")
    p("Le backend assure la cohérence des états et distingue l’aperçu, qui n’écrit rien, de la confirmation transactionnelle. Nearest Neighbor fournit un premier ordre de visite ; 2-opt l’améliore localement sur la même matrice. Les interfaces rendent ces traitements observables, depuis les catalogues jusqu’au dernier arrêt livré.")
    p("Les campagnes de test et le benchmark fournissent des éléments mesurés : persistance des positions, recherches spatiales, refus des situations invalides, protection des rôles, unicité face à des confirmations concurrentes et réduction de distance sur un exemple. Les captures de chaque interface expliquent comment ces mécanismes deviennent des actions utilisateur.")
    p("Les limites constituent le point de départ des évolutions. Une intégration routière devra introduire un contrat ROAD explicite et une gestion des coûts asymétriques. La reprise des échecs, la replanification historique et les fenêtres horaires permettront de couvrir un fonctionnement logistique plus réaliste. Enfin, tout passage au-delà de la démonstration locale exigera un travail spécifique de sécurité, de sauvegarde, de supervision et de capacité.")

    heading("Annexe A — Reproduction et structure des livrables",0,page=True)
    table(["Répertoire","Contenu"],[
      ("backend/","API, validation, sécurité, services, heuristiques et tests JUnit."),
      ("frontend/","Angular, services HTTP, formulaires et carte Leaflet."),
      ("database/","Schéma, métadonnées, index, seed, procédures et tests."),
      ("docs/","Rapport, présentation, captures, preuves et générateurs."),
      ("demo/","Vidéo complète, narration française, scénario et sous-titres."),
      ("scripts/","Démarrage, tests, enregistrement et préparation des livrables.")
    ],[120,CONTENT-120])
    sub("Lancement sur l’installation préparée")
    code("""# Terminal 1, depuis GeoDelivery
.\\scripts\\backend.ps1

# Terminal 2
cd frontend
npm ci
npm start""")
    p("L’interface est accessible à l’adresse http://localhost:4200 ; Swagger utilise http://127.0.0.1:8080/swagger-ui/index.html. Les identifiants sont définis dans le fichier local .env et ne doivent pas être copiés dans le rapport ni dans la vidéo.")
    p("Le schéma déjà installé ne doit pas être réinitialisé pour rejouer une démonstration. Les scripts de création sont à réserver à un environnement neuf et documenté. Les tests et les enregistrements ajoutent des données fictives ; les compteurs diffèrent donc du seed initial.")
    sub("Personnalisation de la couverture")
    p("Les noms des membres, le groupe, l’établissement et l’encadrement peuvent être renseignés dans docs/tools/report-identity.json, puis le PDF régénéré. Aucune identité d’encadrant ni d’établissement n’a été inventée.")
    heading("Annexe B — Plan de la démonstration de dix minutes",0,page=True)
    table(["Temps","Interface ou étape"],[
      ("00:00–00:30","Présentation et connexion"),
      ("00:30–01:00","Tableau de bord"),
      ("01:00–01:30","Liste des clients"),
      ("01:30–02:00","Création d’un client"),
      ("02:00–02:30","Livreurs"),
      ("02:30–03:00","Véhicules"),
      ("03:00–03:30","Dépôts"),
      ("03:30–04:00","Commandes et filtres"),
      ("04:00–04:30","Création d’une commande"),
      ("04:30–05:00","Carte générale"),
      ("05:00–05:30","Voisins disponibles"),
      ("05:30–06:00","Recherche dans un rayon"),
      ("06:00–06:30","Historique des tournées"),
      ("06:30–07:00","Sélection du plan"),
      ("07:00–07:30","Aperçu Nearest Neighbor"),
      ("07:30–08:00","Amélioration 2-opt"),
      ("08:00–08:30","Confirmation de la tournée"),
      ("08:30–09:00","Démarrage et position GPS"),
      ("09:00–09:30","Livraisons et clôture"),
      ("09:30–10:00","Bilan et tableau de bord final")
    ],[110,CONTENT-110])
    note("La vidéo présente l’application réelle, avec une voix off synthétique française et des repères à l’écran. Elle ne prétend pas être un enregistrement de SQL Developer ni une voix humaine enregistrée.")
    heading("Documentation de référence",0,page=True)
    refs=[
      ("[1] Oracle","Oracle Database 19c — Spatial and Graph Developer’s Guide","https://docs.oracle.com/en/database/oracle/oracle-database/19/spatl/"),
      ("[2] Oracle","SQL Language Reference — contraintes et transactions","https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/"),
      ("[3] Spring","Spring Boot — documentation de référence","https://docs.spring.io/spring-boot/"),
      ("[4] Spring","Spring Security — OAuth 2.0 Resource Server et JWT","https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html"),
      ("[5] Angular","Documentation des composants, formulaires et services HTTP","https://angular.dev/"),
      ("[6] Leaflet","Documentation de l’API cartographique","https://leafletjs.com/reference.html"),
      ("[7] OpenStreetMap Foundation","Tile Usage Policy","https://operations.osmfoundation.org/policies/tiles/")
    ]
    for author,title,url in refs:
        p(f"<b>{author}.</b> {title}.<br/><link href='{url}' color='#28634d'>{url}</link>")
    sub("Sources internes de la réalisation")
    p("Les scripts SQL du projet, le code source, les rapports Surefire et les fichiers JSON de docs/evidence constituent les preuves primaires de l’implémentation. Les valeurs mesurées sont citées comme résultats de l’environnement local, avec leurs conditions et leurs limites.")
