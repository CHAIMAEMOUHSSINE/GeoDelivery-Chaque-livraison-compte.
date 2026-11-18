# Vérification technique — 18 novembre 2026

## Exécuté avec succès

- Oracle Database 19c Enterprise Edition, 19.3, PDB `ORCLPDB`.
- Schéma dédié `GEODELIVERY`, neuf tables métier, trois index `SPATIAL_INDEX_V2`.
- Deux dépôts, dix livreurs, dix véhicules, quarante clients et soixante commandes au seed initial.
- Validation des 50 géométries initiales clients/livreurs : `TRUE` ; métadonnées et index valides.
- Distance Oracle entre dépôts : `6.37674252219167 km`.
- Maven `verify` avec JDK 21 : **9 tests, 0 échec**, JAR exécutable généré.
- **28 contrôles HTTP** réels sur Oracle : `api-tests.json`.
- Test concurrent : une confirmation `201`, une `409` sur les mêmes commandes : `concurrency-test.json`.
- UI : sept listes, création client, proximité, optimisation, confirmation, démarrage et livraison ; pas de débordement mobile : `ui-tests.json`.
- Angular **20.3.35**, outils CLI/build **20.3.43** : compilation de production réussie.
- `npm audit --omit=dev --audit-level=high` : **0 vulnérabilité signalée** au moment du contrôle.
- Audit complet incluant les outils de développement : **27 alertes transitives (13 hautes, 14 modérées)**, notamment picomatch/glob/minimatch. Elles concernent CLI/build, pas le bundle applicatif. Aucun `audit fix --force` ni rétrogradage Angular n’a été appliqué ; suivre les correctifs amont et conserver le serveur de développement en local.
- Nouveau parcours navigateur après mise à jour, sans erreur JavaScript : `video.json`.
- Rapport professionnel enrichi : **45 pages, six chapitres, 30 figures**, sommaire lié et captures expliquées de chaque interface. Première version technique archivée localement.
- PPTX de 12 diapositives généré, validé et exporté en PDF par PowerPoint.
- Scénario complet : **20 séquences de 30 secondes**, douze routes d’interface et leurs formulaires, cinq arrêts livrés, tournée terminée ; aucune erreur JavaScript ou HTTP API durant l’enregistrement.
- Vidéo finale de **10 minutes**, narration française synthétique, sous-titres et chapitres ; preuve finale dans `video-10min-final.json`. Première vidéo courte archivée localement.
- Contrôle des livrables enrichis : 45 pages sans bloc de texte hors page, 61 signets et 189 liens PDF ; vidéo de 600 secondes avec pistes vidéo/audio/sous-titres, 20 chapitres, contrôle sonore non silencieux et une image vérifiée par séquence.

## Mesures, pas promesses

- Exemple cinq commandes QA : NN `29.812680 km`, 2-opt `28.336647 km`, gain `4.9510 %`.
- Benchmark indépendant : 20 000 points, rayon 5 km, 421 résultats pour chaque méthode.
- Deux échauffements, dix répétitions : moyenne index `9 ms`, balayage `28 435 ms`.
- Résolution du chronomètre : 10 ms ; les valeurs nulles sont sous la résolution.
- Ordre des méthodes fixe, cache et charge machine non contrôlés : ne pas généraliser ces durées.

## À ne pas présenter comme terminé

- Soutenance commentée et capture personnelle SQL Developer.
- Membres du groupe, établissement et encadrement.
- Routage routier, VRP, fenêtres horaires, reprise des échecs, replanification historique.
- Préparation production : HTTPS, limitation des tentatives, révocation, supervision, sauvegarde et audit de sécurité complet.
- Résolution des alertes restantes de la chaîne de développement (ne pas traiter « 0 dépendance de production vulnérable » comme « aucun risque de sécurité »).

Les tests ajoutent des données fictives QA. Les compteurs et captures postérieurs au seed ne sont donc pas figés à 60 commandes / 10 livreurs. Aucun schéma préexistant n’a été supprimé ou réinitialisé.
