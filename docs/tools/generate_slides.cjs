const fs=require('fs'),path=require('path'),Pptx=require('pptxgenjs');
const docs=path.resolve(__dirname,'..'),evidence=JSON.parse(fs.readFileSync(path.join(docs,'evidence/api-tests.json'),'utf8')),m=evidence.metrics;
const pres=new Pptx();pres.layout='LAYOUT_WIDE';
pres.author='Équipe GeoDelivery (à compléter)';pres.company='GLSID 3';pres.title='GeoDelivery — Oracle Spatial';
const THEME={name:'GeoDelivery Forest',headFontFace:'Calibri',bodyFontFace:'Calibri',colors:{dk1:'123E35',lt1:'FFFFFF',dk2:'63745B',lt2:'F4F7F0',accent1:'246D55',accent2:'CFEDAA',accent3:'E6BC72',accent4:'829C77',accent5:'76929D',accent6:'AF7B67',hlink:'246D55',folHlink:'63745B'}};
pres.theme={headFontFace:THEME.headFontFace,bodyFontFace:THEME.bodyFontFace};
const C=pres.SchemeColor;
for(const dark of [false,true])pres.defineSlideMaster({
 title:dark?'DARK':'LIGHT',background:{color:dark?C.text1:C.background1},
 objects:[
  {text:{text:'GeoDelivery / Oracle Spatial',options:{x:.6,y:7.07,w:6,h:.2,fontSize:10,color:dark?C.accent2:C.text2,margin:0,isTextBox:true}}},
  {placeholder:{options:{name:'title',type:'title',x:.65,y:.5,w:12,h:1.1,fontSize:34,bold:true,color:dark?C.background1:C.text1,margin:0}}},
  {placeholder:{options:{name:'body',type:'body',x:.7,y:1.8,w:12,h:4.8,fontSize:18,color:dark?C.accent2:C.text2,margin:0}}}
 ],slideNumber:{x:12.1,y:7.04,w:.6,h:.25,fontSize:10,color:dark?C.accent2:C.text2}
});
let sec;
function section(title){pres.addSection({title});sec=title;}
function slide(title,dark=false){const s=pres.addSlide({masterName:dark?'DARK':'LIGHT',sectionTitle:sec});s.addText(title,{placeholder:'title'});return s;}
function text(s,t,x,y,w,h,size=18,color=C.text2,bold=false){s.addText(t,{x,y,w,h,fontSize:size,color,bold,margin:0,isTextBox:true,objectName:t.slice(0,30)});}
function shape(s,type,x,y,w,h,fill){s.addShape(type,{x,y,w,h,fill:{color:fill},line:{color:fill},objectName:'GeoDelivery visual'});}
function card(s,x,y,w,h,num,title,body){shape(s,pres.ShapeType.roundRect,x,y,w,h,C.background2);text(s,num,x+.25,y+.25,w-.5,.75,40,C.accent1,true);text(s,title,x+.25,y+1.15,w-.5,.65,21,C.text1,true);text(s,body,x+.25,y+1.95,w-.5,h-2.12,16);}
section('Vision');
let s=slide('GeoDelivery',true);
text(s,'La donnée géographique\nau service de la livraison',.7,1.9,8.7,1.7,36,C.background1,true);
text(s,'Oracle Spatial · Spring Boot · Angular · Leaflet',.75,4.1,10,.5,18,C.accent2);
text(s,'GLSID 3 · 2026–2027\nGroupe et membres : à compléter avant remise',.75,5.8,10,.7,14,C.accent2);
for(let i=0;i<4;i++){let x=10.3+(i%2)*1.15,y=2.15+Math.floor(i/2)*1.6;shape(s,pres.ShapeType.ellipse,x,y,.65,.65,i?C.accent1:C.accent2);text(s,''+i,x+.2,y+.18,.3,.3,16,i?C.background1:C.text1,true);}
s.addNotes('Présenter le groupe. MVP réel connecté à Oracle 19c, pas un service routier de production.');
s=slide('Rapprocher les ressources, réduire les distances');
card(s,.65,2,3.8,4.4,'01','Localiser','Enregistrer les positions WGS84 et rechercher les livreurs disponibles.');
card(s,4.76,2,3.8,4.4,'02','Organiser','Construire une matrice Oracle, puis appliquer Nearest Neighbor et 2-opt.');
card(s,8.87,2,3.8,4.4,'03','Exécuter','Confirmer le plan, suivre les arrêts et synchroniser les statuts.');
s.addNotes('Distinguer donnée géographique, algorithme et exécution transactionnelle.');
section('Conception');
s=slide('Un monolithe modulaire, une base au centre');
for(const [x,t,c] of [[.7,'Angular\n+ Leaflet',C.accent2],[4.9,'Spring Boot\nServices + JWT',C.background2],[9.1,'Oracle 19c\n+ Spatial',C.accent2]]){shape(s,pres.ShapeType.roundRect,x,2.3,3.5,1.7,c);text(s,t,x+.3,2.7,2.9,.9,25,C.text1,true);}
for(const x of [4.3,8.5])text(s,'→',x,2.85,.5,.5,29,C.accent1,true);
text(s,'JPA : comptes et commandes\nJDBC : géométries, projections et transactions spatiales',.8,4.65,11.6,1.1,21);
s.addNotes('HttpClient, REST, validation et transactions. Les scripts SQL sont la seule initialisation ; Hibernate ne crée pas le schéma.');
s=slide('Neuf tables protègent le métier');
['APP_USER','DRIVER','VEHICLE','CLIENT','DELIVERY_ORDER','DELIVERY_ROUTE','DEPOT','ROUTE_STOP','DELIVERY'].forEach((t,i)=>{let x=.7+(i%3)*4.2,y=1.95+Math.floor(i/3)*1.25;shape(s,pres.ShapeType.roundRect,x,y,3.5,.75,i===4?C.accent2:C.background2);text(s,t,x+.2,y+.25,3.1,.3,17,C.text1,true);});
text(s,'Rang unique par tournée · commande unique dans l’historique MVP\nClé étrangère composite : une livraison et son arrêt concernent la même commande',.8,6,11.6,.8,17);
s.addNotes('Relations dans docs/diagrams/model.mmd. Index fonctionnel : un seul plan actif par livreur. Positions du parcours figées à la confirmation.');
section('Oracle Spatial');
s=slide('Des positions réellement interrogées dans Oracle');
card(s,.65,1.85,3.8,4.7,'4326','Un référentiel','SDO_GEOMETRY 2001\nX = longitude\nY = latitude');
card(s,4.76,1.85,3.8,4.7,'3','Index spatiaux','CLIENT.position\nDRIVER.current_position\nDEPOT.position');
card(s,8.87,1.85,3.8,4.7,'4','Opérateurs clés','SDO_NN\nSDO_NN_DISTANCE\nSDO_WITHIN_DISTANCE\nSDO_GEOM.SDO_DISTANCE');
s.addNotes('Métadonnées explicites, tolérance 0,005. sdo_batch_size filtre AVAILABLE avant la limite, plutôt que de filtrer cinq candidats trop tard.');
s=slide('Géodésique ne signifie pas routier',true);
text(s,'GEODESIC',.75,2.1,10,1.2,65,C.accent2,true);
text(s,'Distance entre positions sur la Terre.\nPas de rues, pas de sens uniques, pas de trafic.',.8,3.7,11.4,1.3,26,C.background1);
text(s,'Leaflet affiche des segments droits indicatifs.\nROAD ne sera annoncé qu’avec OSRM ou GraphHopper.',.8,5.65,11.3,.8,17,C.accent2);
s.addNotes('Aucun plus court chemin routier. Le mode est présent dans les réponses et dans l’interface.');
section('Optimisation et résultats');
s=slide('Un aperçu sans écriture, une confirmation sûre');
[['Valider','Statut, unicité,\ncapacité'],['Mesurer','Matrice Oracle\nsymétrique'],['Optimiser','NN puis 2-opt\n60 arrêts max.'],['Confirmer','Verrous et\ntransaction']].forEach((a,i)=>{let x=.7+i*3.15;shape(s,pres.ShapeType.ellipse,x,2,.6,.6,C.accent2);text(s,''+(i+1),x+.18,2.17,.3,.3,17,C.text1,true);text(s,a[0],x,3,2.8,.5,24,C.text1,true);text(s,a[1],x,3.85,2.8,1.1,19);});
text(s,'Dépôt fixe · retour facultatif · aucune garantie d’optimum global',.8,6,11.6,.5,18,C.accent1,true);
s.addNotes('La confirmation revalide et recalcule. Nearest Neighbor O(n²), puis 2-opt symétrique, 200 passes maximum.');
s=slide('Une amélioration mesurée sur cinq commandes');
s.addChart(pres.ChartType.bar,[{name:'Distance géodésique',labels:['Nearest Neighbor','Après 2-opt'],values:[m.initialDistanceKm,m.optimizedDistanceKm]}],{
 x:.8,y:2,w:7.3,h:4.3,catAxisLabelFontFace:'+mn-lt',valAxisLabelFontFace:'+mn-lt',dataLabelFormatCode:'0.00" km"',
 showTitle:true,title:'Même matrice, mêmes contraintes',titleFontFace:'+mj-lt',titleFontSize:16,showValue:true,dataLabelPosition:'outEnd',showLegend:false,
 chartColors:[THEME.colors.accent1],catAxisLabelColor:THEME.colors.dk2,valAxisLabelColor:THEME.colors.dk2,
 valGridLine:{color:'E6EDE0',size:1},catGridLine:{style:'none'},showBorder:false,showShadow:false,barDir:'col',valAxisMinVal:0});
text(s,m.improvementPercent.toFixed(2)+' %',9,2.6,3.5,1,52,C.accent1,true);
text(s,'de distance géodésique\nen moins par rapport à NN',9,3.85,3.5,1,19);
text(s,m.computationTimeMs.toFixed(1)+' ms · exemple local',9,5.5,3.6,.5,14);
s.addNotes('Source : api-tests.json. Exemple distinct des captures UI ; le gain varie selon les points et peut être nul.');
s=slide('Des résultats vérifiés, pas seulement affichés');
card(s,.7,2,3.75,4.45,''+evidence.tests.length,'Contrôles API','Vraie base Oracle, rôles, GPS, capacité, aperçus et exécution.');
card(s,4.8,2,3.75,4.45,'9','Tests JUnit','Incluant 200 variantes de parcours ouverts et fermés.');
card(s,8.9,2,3.75,4.45,'201 / 409','Concurrence','Deux confirmations simultanées : une seule affectation acceptée.');
s.addNotes('QA navigateur : listes, création client, proximité, optimisation, confirmation et livraison, mobile sans débordement.');
s=slide('L’index évite un calcul exhaustif de distances');
const raw=fs.readFileSync(path.join(docs,'evidence/oracle-benchmark.txt'),'utf8');
const rows=[...raw.matchAll(/BENCH,(\d+),(\d+),(\d+),(\d+)/g)].map(r=>r.slice(1).map(Number)),mean=i=>rows.reduce((a,r)=>a+r[i],0)/rows.length;
text(s,'20 000',.8,2,6,1,56,C.accent1,true);text(s,'points fictifs · 421 résultats dans 5 km',.85,3.2,6,.8,20);
text(s,'DOMAIN INDEX',7.7,2.15,4.7,.5,25,C.text1,true);text(s,mean(2).toFixed(1)+' ms en moyenne',7.7,2.95,4.7,.7,26,C.accent1,true);
text(s,'TABLE ACCESS FULL',7.7,4.3,4.7,.5,24,C.text1,true);text(s,(mean(3)/1000).toFixed(2)+' s en moyenne',7.7,5.1,4.7,.7,26,C.text2,true);
text(s,'10 répétitions après échauffement · résolution 10 ms\n0 ms : sous la résolution, pas un calcul gratuit.',.85,5.3,6,1,15);
s.addNotes('Source : oracle-benchmark.txt. Même rayon et mêmes points ; nombres de résultats égaux. Ordre fixe, cache et charge limitent la généralisation. SDO_NN requiert son index.');
section('Démonstration et conclusion');
s=slide('Le résultat devient un parcours lisible');
const image=path.join(docs,'screenshots/optimization.png');
if(fs.existsSync(image)){let b=fs.readFileSync(image),iw=b.readUInt32BE(16),ih=b.readUInt32BE(20),scale=Math.min(8.25/iw,4.95/ih),w=iw*scale,h=ih*scale;s.addImage({path:image,x:.7+(8.25-w)/2,y:1.75+(4.95-h)/2,w,h,objectName:'Capture réelle de GeoDelivery'});}
text(s,'Sélectionner\nOptimiser\nComparer\nConfirmer\nLivrer',9.35,2.2,3.15,3.5,24,C.text1,true);
s.addNotes('Passer à la démonstration réelle ; montrer aussi SQL Developer : métadonnées, index, distance et voisins.');
s=slide('Un MVP opérationnel, des limites assumées',true);
text(s,'Oracle Spatial démontré.\nUn flux métier de bout en bout.',.7,2,11.8,1.5,35,C.background1,true);
text(s,'Prochaines étapes',.75,4.25,5,.5,23,C.accent2,true);
text(s,'Routage ROAD · reprise des échecs · VRP multi-véhicules\nDurcissement avant toute exposition externe',.75,5.1,11.8,1.15,20,C.accent2);
s.addNotes('Unicité historique, échecs non repris, sélecteurs limités à 200. Compléter groupe, commentaire oral et capture SQL Developer.');
(async()=>{
 const file=path.join(docs,'presentation.pptx');
 await pres.writeFile({fileName:file});
 const helper=process.env.PPTX_THEME_HELPER||path.join(__dirname,'apply-theme.cjs');
 await require(helper).applyTheme(file,THEME);
 fs.writeFileSync(path.join(__dirname,'theme.json'),JSON.stringify(THEME,null,2));
 console.log('PPTX créé :',file);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
