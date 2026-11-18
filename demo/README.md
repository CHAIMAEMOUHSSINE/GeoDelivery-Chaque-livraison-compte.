# Démonstration GeoDelivery

## Vidéo complète fournie — 10 minutes

Fichier : **`geodelivery-demo.mp4`**

- Captures réelles de toutes les interfaces, sans données personnelles réelles.
- 20 séquences de 30 secondes, de la connexion à la clôture d’une tournée.
- Créations via les formulaires : client, livreur, véhicule, dépôt et commande.
- Comparaison Nearest Neighbor / 2-opt sur les mêmes commandes.
- Confirmation, démarrage, actualisation GPS et livraison des cinq arrêts.
- Voix off **française synthétique** (fr-FR-DeniseNeural), sous-titres et chapitres intégrés.

Le texte complet est éditable dans `scenario-10min.json`. Les sous-titres sont dans `geodelivery-demo-complete.srt` et la piste de narration dans `geodelivery-narration-fr.m4a`.

### Découpage

| Temps | Contenu |
|---|---|
| 00:00–01:00 | Connexion et tableau de bord |
| 01:00–02:00 | Liste et création des clients |
| 02:00–03:30 | Livreurs, véhicules et dépôts |
| 03:30–04:30 | Commandes et formulaire |
| 04:30–06:00 | Carte, voisins et rayon |
| 06:00–07:00 | Historique et configuration de la tournée |
| 07:00–08:00 | NN puis 2-opt |
| 08:00–09:00 | Confirmation, démarrage et GPS |
| 09:00–10:00 | Cinq livraisons, clôture et bilan |

### Régénérer

Prérequis : application démarrée, ffmpeg/ffprobe, runner browser-automation et `pip install -r docs/tools/requirements-media.txt`.

```powershell
python scripts/generate-narration.py
# Le runner est fourni par le skill browser-automation sur cette machine :
node "$HOME\.claude\skills\browser-automation\browser.mjs" http://localhost:4200 --script scripts/record-complete-demo.mjs --timeout 60000
python scripts/assemble-complete-demo.py
```

L’enregistrement dure réellement dix minutes. Il ajoute des données fictives de démonstration, sans réinitialiser la base. Le commentaire pédagogique seul est transmis au service de synthèse vocale ; aucun identifiant ni secret ne lui est envoyé. La première vidéo courte est conservée localement dans `archive/`.

## Complément conseillé : manipulation Oracle dans SQL Developer

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

Ne pas filmer `.env`, les mots de passe ni les JWT. Les données de la démonstration sont entièrement fictives. La vidéo complète est un screencast commenté de l’application réelle ; elle ne montre pas SQL Developer et sa voix est synthétique, pas un enregistrement humain.

## À compléter avant remise

- Noms des membres et numéro du groupe.
- Encadrant et établissement.
- Capture personnelle SQL Developer avec distance réussie.
- Personnalisation éventuelle avec votre commentaire oral et lien de partage, permissions vérifiées.
