// Script du runner browser-automation : capture un vrai parcours, sans afficher les secrets.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const env=Object.fromEntries(readFileSync(new URL('.env',root),'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
export default async function run(original){
 const response=await fetch('http://127.0.0.1:8080/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({email:env.BOOTSTRAP_ADMIN_EMAIL,password:env.BOOTSTRAP_ADMIN_PASSWORD})});
 if(!response.ok) throw new Error('Connexion demo impossible');
 const session=await response.json();
 const dir=fileURLToPath(new URL('demo/recordings/',root));mkdirSync(dir,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},recordVideo:{dir,size:{width:1440,height:1000}}});
 await context.addInitScript(s=>sessionStorage.setItem('gd-session',JSON.stringify(s)),session);
 const page=await context.newPage(), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 async function caption(text){
   await page.evaluate(t=>{
     document.getElementById('demo-caption')?.remove();
     const el=document.createElement('div');el.id='demo-caption';el.textContent=t;
     Object.assign(el.style,{position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',
       padding:'14px 24px',background:'#123e35f2',color:'#fff',borderRadius:'10px',zIndex:'100000',
       font:'16px Segoe UI, sans-serif',boxShadow:'0 3px 24px #0003',maxWidth:'90%',textAlign:'center'});
     document.body.append(el);
   },text);
   // Pause de lecture intentionnelle pour le screencast, pas attente de chargement.
   await page.waitForTimeout(3500);
 }
 await page.goto('http://localhost:4200/dashboard');
 await page.waitForFunction(()=>/\d/.test(document.querySelector('.kpi strong')?.textContent || ''));
 await caption('GeoDelivery — Oracle Spatial, Spring Boot et Angular. Données entièrement fictives.');
 await page.locator('.map-panel').scrollIntoViewIfNeeded();
 await caption('Les positions et les indicateurs proviennent de la base Oracle 19c locale.');
 await page.locator('nav').getByRole('link',{name:/Carte en direct/}).click();
 await page.getByRole('button',{name:/Trouver les plus proches/}).waitFor();
 await caption('Recherche des cinq livreurs disponibles les plus proches avec SDO_NN.');
 await page.getByRole('button',{name:/Trouver les plus proches/}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.proximity-results .fleet-row').length===5);
 await caption('SDO_NN_DISTANCE renvoie les distances géodésiques, triées en kilomètres.');
 await page.getByRole('button',{name:/Rechercher dans le rayon/}).click();
 await page.waitForFunction(()=>document.querySelector('.proximity-results')?.textContent.includes('SDO_WITHIN_DISTANCE'));
 await caption('SDO_WITHIN_DISTANCE filtre les livreurs dans un rayon de 5 km.');
 await page.locator('nav').getByRole('link',{name:/Optimisation/}).click();
 await page.waitForFunction(()=>!document.querySelector('.planner-controls .button.primary')?.disabled);
 await caption('Un dépôt, un livreur, cinq commandes. La capacité est contrôlée côté serveur.');
 await page.getByRole('button',{name:/Calculer le meilleur ordre/}).click();
 await page.getByRole('button',{name:'Confirmer la tournée ✓'}).waitFor({timeout:60000});
 await caption('Oracle calcule la matrice. Nearest Neighbor initialise le parcours, puis 2-opt l’améliore.');
 await page.locator('.result-metrics').scrollIntoViewIfNeeded();
 await caption('GEODESIC : segments droits indicatifs, pas un plus court chemin routier.');
 await page.getByRole('button',{name:'Confirmer la tournée ✓'}).click();
 await page.waitForURL(/\/routes\/\d+$/);
 await page.getByRole('button',{name:'Démarrer la tournée →'}).waitFor();
 await caption('L’aperçu n’écrit rien. La confirmation enregistre tournée, arrêts et affectations en transaction.');
 await page.getByRole('button',{name:'Démarrer la tournée →'}).click();
 await page.getByRole('button',{name:'Livrer ✓',exact:true}).first().waitFor();
 await page.getByRole('button',{name:'Livrer ✓',exact:true}).first().click();
 await page.waitForFunction(()=>document.querySelectorAll('.stop-actions .DELIVERED').length===1);
 await caption('Un arrêt livré : statuts synchronisés dans Oracle et dans l’interface.');
 await page.screenshot({path:fileURLToPath(new URL('docs/screenshots/video-final.png',root)),fullPage:true});
 await caption('Limites : pas de routage routier ni VRP multi-véhicules. Suite : démonstration SQL Developer commentée.');
 const video=page.video();await context.close();const file=await video.path();
 const evidence={recordedAt:new Date().toISOString(),video:file,pageErrors:errors,narration:false,
   scope:'Screencast réel de l’application, avec sous-titres ; sans SQL Developer.'};
 writeFileSync(new URL('docs/evidence/video.json',root),JSON.stringify(evidence,null,2));
 return evidence;
}
