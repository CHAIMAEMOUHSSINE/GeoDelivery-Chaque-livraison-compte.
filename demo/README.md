# Démonstration GeoDelivery

## Parcours conseillé (6–8 minutes)

1. Présenter la problématique et la distinction géodésique/routier.
2. Dans SQL Developer, se connecter au schéma `GEODELIVERY` dans `ORCLPDB` (identifiants `.env`, ne pas filmer les secrets).
3. Montrer les neuf tables, `USER_SDO_GEOM_METADATA` et les index.
4. Exécuter `database/spatial/05_queries.sql` : validation, distance, voisins, rayon et transformation.
5. Montrer `docs/evidence/oracle-benchmark.txt` et expliquer index spatial versus balayage.
6. Se connecter à Angular ; dashboard et carte des positions fictives.
7. Rechercher cinq livreurs proches puis un rayon de 5 km.
8. Créer une commande, sélectionner un dépôt et un livreur, optimiser cinq commandes.
9. Comparer NN et 2-opt ; confirmer uniquement après lecture de l’aperçu.
10. Démarrer la tournée, livrer un arrêt et montrer le statut en base.
11. Montrer une validation GPS ou capacité rejetée.
12. Conclure : pas de routage routier, pas de VRP complet ; extensions possibles.

## Confidentialité

Ne pas filmer `.env`, les mots de passe ni les JWT. Les données de la démonstration sont entièrement fictives. La vidéo automatisée éventuelle est un screencast de l’interface réelle, pas un enregistrement de SQL Developer et pas une soutenance commentée.

## À compléter avant remise

- Noms des membres et numéro du groupe.
- Encadrant et établissement.
- Capture personnelle SQL Developer avec distance réussie.
- Commentaire oral et lien de partage de la vidéo finale, permissions vérifiées.
