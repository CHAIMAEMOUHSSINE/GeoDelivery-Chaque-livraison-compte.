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

Les générateurs lisent les **preuves réellement obtenues** dans `docs/evidence/` et les captures existantes. Ils ne fabriquent pas des mesures manquantes.

Sur Windows avec Microsoft PowerPoint installé :

```powershell
.\docs\tools\render-powerpoint.ps1
python docs/tools/visual_qa.py
```

L’export ouvre uniquement le fichier généré, en lecture seule, sans fenêtre. Les présentations déjà ouvertes ne sont pas fermées. Avec LibreOffice sur une autre machine, exporter `presentation.pptx` en PDF puis lancer `visual_qa.py`.

La palette, les dispositions LIGHT/DARK, les espaces réservés de titre/corps, les sections et les notes sont conservés dans le PPTX pour faciliter la personnalisation. Le graphique de distances reste un graphique PowerPoint natif.

Le rapport et la présentation sont des **versions techniques à personnaliser avant remise** : membres du groupe, encadrement, capture SQL Developer personnelle et soutenance commentée. Le screencast automatisé, sans audio, ne remplace pas la vidéo finale de soutenance.
