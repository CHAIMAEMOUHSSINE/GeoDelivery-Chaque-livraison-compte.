# Régénérer les livrables

À partir de la racine :

```powershell
python -m pip install -r docs/tools/requirements.txt
cd docs/tools
npm ci
cd ../..
python docs/tools/generate_report.py
node docs/tools/generate_slides.cjs
```

Le rapport professionnel contient 45 pages, six chapitres, un sommaire avec liens, une liste des figures et 30 illustrations. Les 27 captures de `docs/screenshots/interfaces/` couvrent toutes les vues et les formulaires présentés. Les générateurs lisent les **preuves réellement obtenues** dans `docs/evidence/` et les captures existantes. Ils ne fabriquent pas des mesures manquantes.

Renseigner les auteurs, le groupe, l’établissement et l’encadrant dans `report-identity.json` pour personnaliser la couverture sans inventer ces informations. Le contenu est séparé dans `report_sections.py` et sa version textuelle est exportée dans `docs/rapport-professionnel.md`. Le générateur technique initial est conservé sous `generate_report_technical_v1.py`.

Sur Windows avec Microsoft PowerPoint installé :

```powershell
.\docs\tools\render-powerpoint.ps1
python docs/tools/visual_qa.py
python docs/tools/qa-professional.py
```

L’export ouvre uniquement le fichier généré, en lecture seule, sans fenêtre. Les présentations déjà ouvertes ne sont pas fermées. Avec LibreOffice sur une autre machine, exporter `presentation.pptx` en PDF puis lancer `visual_qa.py`.

La palette, les dispositions LIGHT/DARK, les espaces réservés de titre/corps, les sections et les notes sont conservés dans le PPTX pour faciliter la personnalisation. Le graphique de distances reste un graphique PowerPoint natif.

La vidéo complète dure 10 minutes et comporte une voix synthétique française. Sa reproduction est documentée dans `demo/README.md`. Une soutenance avec votre propre voix et une manipulation personnelle dans SQL Developer restent des compléments distincts de ce screencast de l’application.
