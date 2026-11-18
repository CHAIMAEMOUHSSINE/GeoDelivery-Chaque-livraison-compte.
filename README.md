# GeoDelivery

**Oracle Spatial · Spring Boot · Angular · Leaflet**  
Administration des bases de données — GLSID 3, 2026–2027.

Application locale de gestion et d’optimisation des livraisons à Casablanca. Toutes les positions de démonstration sont fictives.

> **Les distances sont géodésiques, pas routières.** Les lignes de la carte sont des segments droits indicatifs. Nearest Neighbor et 2-opt sont des heuristiques : aucune garantie d’optimum global.

## Démarrage sur cette machine

Le schéma dédié `GEODELIVERY` est installé dans **Oracle 19c / ORCLPDB**. Ne pas relancer les scripts de création. Les schémas antérieurs n’ont pas été modifiés.

Depuis ce dossier, ouvrir deux terminaux PowerShell :

```powershell
# Terminal 1 — API
.\scripts\backend.ps1
```

```powershell
# Terminal 2 — interface
cd frontend
npm ci
npm start
```

- Interface : **http://localhost:4200**
- Swagger : **http://127.0.0.1:8080/swagger-ui/index.html**
- API : `http://127.0.0.1:8080/api`
- Compte : valeur de `BOOTSTRAP_ADMIN_EMAIL` dans `.env`.
- Mot de passe : valeur de `BOOTSTRAP_ADMIN_PASSWORD` dans `.env`. Il est généré aléatoirement, jamais publié dans le code.

**Important :** utiliser `127.0.0.1:8080`, pas `localhost:8080` : d’autres services de cette machine écoutent le même port sur IPv6. Le backend GeoDelivery n’écoute que l’interface locale IPv4.

`.env` est lu par les scripts PowerShell, pas automatiquement par Spring Boot. Pour démarrer dans IntelliJ, renseigner les mêmes variables dans la configuration d’exécution. Le mot de passe bootstrap crée l’administrateur seulement s’il n’existe pas ; changer cette variable ne réinitialise pas un compte existant.

## Installation sur une autre machine

### Prérequis

- JDK **21 ou supérieur** ; le code est compilé pour Java 21.
- Node **24** (ou une version compatible Angular 20), npm.
- Oracle Database **19c+ avec Spatial**, une PDB ouverte et un listener TCP.
- SQL Developer ou SQL*Plus.
- Le Maven Wrapper fourni télécharge Maven 3.9.11 au premier lancement.

### Base de données — choisir une seule méthode

**A. Oracle local Windows et authentification OS DBA disponibles :**

```powershell
# Crée UNIQUEMENT un nouveau schéma GEODELIVERY, puis ses objets.
# Refuse d'écraser .env ou de remplacer un utilisateur existant.
.\scripts\bootstrap-local.ps1 -Sid ORCL -Pdb ORCLPDB
```

**B. Installation manuelle avec SQL Developer :**

1. Se connecter avec un DBA **dans la PDB cible**, pas dans `CDB$ROOT`.
2. Exécuter `database/schema/00_create_user.sql` en mode script (F5).
3. Se reconnecter comme `GEODELIVERY`.
4. Exécuter, dans l’ordre :
   - `database/schema/01_schema.sql`
   - `database/spatial/02_metadata.sql`
   - `database/spatial/03_indexes.sql`
   - `database/seed/04_seed.sql`
   - `database/tests/06_acceptance.sql`
5. Copier `.env.example` vers `.env`, renseigner les valeurs et un secret JWT aléatoire d’au moins 32 octets.

La méthode SQL Developer fichier par fichier évite les difficultés de chemins Windows avec espaces rencontrées avec `@@`. Pour SQL*Plus, `scripts/install-db.ps1` se place dans `database/` avant de lancer `install.sql`.

**Aucun reset ni DROP automatique.** Les scripts de création ne sont pas idempotents. Si une installation échoue partiellement, examiner les objets créés et reprendre précisément ; ne pas supprimer votre base.

Le droit `INHERIT PRIVILEGES ON USER GEODELIVERY TO MDSYS` évite `ORA-06598` sur certaines installations 19c. Il est limité au nouvel utilisateur, pas accordé globalement. Les privilèges applicatifs sont limités ; aucun rôle DBA n’est accordé à l’application. Le type d’index utilisé et vérifié ici est `MDSYS.SPATIAL_INDEX_V2`.

### Compilation

```powershell
.\backend\mvnw.cmd -f backend\pom.xml verify
cd frontend
npm ci
npm run build
```

Les scripts SQL dans `database/` sont **l’unique source d’initialisation**. Hibernate ne crée/modifie aucune table et Flyway n’est pas activé.

## Fonctionnalités

| Module | Fonctionnement |
|---|---|
| Authentification | BCrypt, JWT HS256 d’une heure, rôles ADMIN/DISPATCHER/DRIVER |
| Clients | Création, édition, recherche locale de la page, désactivation contrôlée |
| Livreurs | Création, édition, disponibilité, mise à jour GPS |
| Véhicules | Immatriculation, capacité, affectation unique à un livreur |
| Dépôts | Création et édition des positions de départ |
| Commandes | Création, édition en attente, filtrage de statut, annulation en attente |
| Carte | Points Oracle, popups sûres, légende, proximité et rayon |
| Optimisation | Matrice Oracle, Nearest Neighbor, 2-opt, retour facultatif, capacité |
| Tournées | Aperçu sans écriture, confirmation transactionnelle, démarrage, annulation avant départ |
| Livraisons | Suivi par arrêt, mise à jour du statut, clôture automatique après la dernière livraison |
| Dashboard | KPI calculés en base, flotte, dernières commandes, carte |

Les catalogues géographiques utilisent JDBC pour maîtriser `SDO_GEOMETRY`. Les comptes et l’écriture des commandes utilisent Spring Data JPA. Les modules sont regroupés par responsabilité ; les contrôleurs n’exécutent pas de SQL. Les réponses de lecture sont des DTO tabulaires (`Map` à clés camelCase), pas des entités JPA. Les coordonnées sont explicitement converties en latitude/longitude.

### Règles métier importantes

- Une commande sélectionnée doit être `PENDING`, unique et appartenir à un client actif.
- Un véhicule doit être affecté au livreur ; le poids total ne dépasse pas sa capacité.
- Maximum **60 arrêts** par calcul. Les priorités sont informatives, elles ne sont pas des contraintes d’optimisation.
- La confirmation **revalide et recalcule** les données ; elle n’accepte jamais les métriques envoyées par le navigateur.
- Verrouillage du livreur, du dépôt et des commandes/clients lors de la confirmation. Contraintes uniques supplémentaires contre les doubles affectations.
- Positions du dépôt et des arrêts figées lors de la sauvegarde.
- Une commande ne peut figurer que dans **une seule tournée historique** pour ce MVP.
- Annuler une tournée planifiée annule également ses commandes ; les arrêts restent dans l’historique. Les livraisons non exécutées sont inactives via le statut de tournée.
- Le démarrage d’une tournée fait passer commandes et livraisons en cours. Le dernier arrêt livré termine automatiquement la tournée et libère le livreur.
- Une livraison `FAILED` est terminale dans ce MVP, la commande reste `IN_DELIVERY` et la clôture est bloquée. Reprise/replanification des échecs : extension, ne pas présenter ce cas comme résolu.
- Les transitions d’affectation/livraison passent par leurs services, pas par une modification arbitraire du statut de commande.
- Les pages sont paginées (100 éléments, maximum serveur 200). Les sélecteurs et la carte chargent les 200 premiers éléments ; recherche et chargement incrémental au-delà sont une extension.

### Comptes supplémentaires

Dans Swagger, se connecter via `POST /api/auth/login`, copier le champ `token`, puis **Authorize**.

Un administrateur peut créer un compte via `POST /api/users` :

```json
{"email":"livreur@example.test","password":"un-mot-de-passe-long-et-unique","role":"DRIVER"}
```

Associer ensuite l’`id` obtenu à `userId` dans `POST/PUT /api/drivers`. Un compte DRIVER ne voit que ses tournées et livraisons et ne peut mettre à jour que sa position. Le dispatcher ne peut pas administrer livreurs/véhicules/dépôts/comptes. L’administration des comptes est fournie via API/Swagger, pas encore via une page dédiée.

## Oracle Spatial : manipulations à montrer

| Fichier | Démonstration |
|---|---|
| `database/spatial/02_metadata.sql` | SRID 4326, dimensions WGS84 et tolérance |
| `database/spatial/03_indexes.sql` | Trois index spatiaux |
| `database/spatial/05_queries.sql` | Validation, distance, voisins, rayon, zone, transformation |
| `database/tests/06_acceptance.sql` | Métadonnées, index valides, distance positive |
| `database/tests/07_execution_plans.sql` | Plans sur la table DRIVER |
| `database/tests/08_benchmark_setup.sql` | Jeu indépendant de 20 000 points |
| `database/tests/09_benchmark.sql` | Mesures répétées et plans sur le même jeu |

**Ordre des coordonnées :** `SDO_POINT_TYPE(longitude, latitude, NULL)` ; Leaflet `[latitude, longitude]`.

`SDO_NN` utilise `sdo_batch_size` et le filtre `AVAILABLE` avec une limite de résultats, pas `sdo_num_res=5` suivi d’un filtre qui pourrait retourner moins de cinq livreurs. `SDO_NN_DISTANCE(1)` partage le même identifiant que `SDO_NN(...,1)`.

On ne compare pas `SDO_NN` avec et sans index : cet opérateur requiert son index. Le benchmark compare le filtre de rayon indexé `SDO_WITHIN_DISTANCE` à un balayage par `SDO_GEOM.SDO_DISTANCE <= 5`, sur les mêmes points. Il vérifie l’égalité des nombres de résultats.

## Tests reproductibles

```powershell
# Tests unitaires indépendants d’Oracle
.\backend\mvnw.cmd -f backend\pom.xml test

# Backend démarré : scénario réel Oracle / HTTP / rôles.
# ATTENTION : ajoute des comptes et commandes fictifs QA dans le schéma du projet.
node scripts/api-smoke.mjs

# Jeu de benchmark : création unique, puis mesures
.\scripts\benchmark.ps1 -Setup
# Rejouer uniquement les mesures
.\scripts\benchmark.ps1
```

Les preuves effectivement obtenues sont dans `docs/evidence/`, les captures dans `docs/screenshots/`. Les tests UI sont dans `scripts/ui-qa.mjs` (fonction Playwright exportée pour le runner browser-automation disponible sur cette machine).

Test d’affectation simultanée : `node scripts/concurrency-test.mjs` (ajoute deux commandes QA puis annule la tournée gagnante). Il vérifie qu’un seul des deux livreurs obtient la confirmation.

Les tests unitaires incluent 200 variantes déterministes de tournées ouvertes/fermées, l’absence de régression après 2-opt, les points confondus, un arrêt unique et les transitions interdites.

## Structure

```text
backend/              API Spring Boot + tests JUnit + Maven Wrapper
frontend/             Angular standalone, formulaires réactifs, Leaflet
database/             Schéma, Spatial, données fictives, tests SQL
scripts/              Installation locale, démarrage, QA et benchmark
docs/diagrams/        Sources Mermaid de la conception
docs/evidence/        Résultats réellement mesurés, sans secrets
docs/screenshots/     Captures de l’application
docs/tools/           Générateurs des livrables PDF et PPTX
demo/                 Démonstration et guide d’enregistrement
.env.example          Configuration sans secrets
```

## Limites et avant exposition externe

Cette application est conçue pour une **démonstration locale**, pas pour une mise en production immédiate. Avant tout déploiement : HTTPS, gestion/rotation des clés, audit des dépendances, limitation des tentatives de connexion, supervision, révocation des sessions, politique de sauvegarde/restauration et gestion des erreurs concurrentes/reprises. Les tuiles OpenStreetMap et les fontes Google nécessitent Internet ; attribution OSM conservée, pas de préchargement massif. Sans Internet, les données/API restent locales mais le fond de carte peut manquer.

Au dernier contrôle, l’audit npm des dépendances de production ne signale rien, mais l’audit complet signale **27 alertes transitives dans les outils de développement** (13 hautes, 14 modérées). Consulter `docs/evidence/npm-audit.json`, maintenir les outils à jour et ne pas exposer `ng serve` sur le réseau. Aucun correctif forcé susceptible de rétrograder Angular n’a été appliqué.

Pas de routage OSRM, de VRP multi-véhicules, de trafic temps réel, de fenêtres horaires, ni de preuve d’optimalité. Les temps mesurés sur cette machine ne constituent pas une garantie de performance générale.

Compléter les noms du groupe et les informations d’encadrement avant remise. Consulter les livrables générés et le guide de démonstration, puis capturer personnellement l’exécution SQL Developer demandée dans le cahier des charges.

## Livrables fournis

- `docs/rapport.pdf` : rapport professionnel de **45 pages**, introduction générale, six chapitres, sommaire lié et **30 figures** dont les captures expliquées de toutes les interfaces.
- `docs/rapport-professionnel.md` : version textuelle éditable du rapport ; identité de couverture dans `docs/tools/report-identity.json`.
- `docs/presentation.pptx` et `docs/presentation.pdf` : 12 diapositives, notes de présentation et graphique modifiable.
- `demo/geodelivery-demo.mp4` : démonstration complète de **10 minutes**, toutes les interfaces, formulaires, calculs NN/2-opt et cinq arrêts livrés ; voix off française synthétique, sous-titres et 20 chapitres.
- `demo/scenario-10min.json` et `demo/geodelivery-demo-complete.srt` : texte du commentaire et sous-titres éditables. La vidéo n’est pas un enregistrement de SQL Developer.
- `docs/evidence/verification-summary.md` : synthèse des validations et limites.
- `GeoDelivery-source.zip` : code, scripts et livrables **sans secrets**, dépendances ni caches.

Régénérer l’archive : `python scripts/package-source.py`. Régénérer les documents : `docs/tools/README.md`.
"# GeoDelivery-Chaque-livraison-compte." 
