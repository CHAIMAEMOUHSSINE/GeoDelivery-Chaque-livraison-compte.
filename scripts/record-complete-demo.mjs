// 20 chapitres x 30 s. DEMO_FAST=1 : repetition technique rapide et captures.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url), env=Object.fromEntries(readFileSync(new URL('.env',root),'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
const plan=JSON.parse(readFileSync(new URL('demo/scenario-10min.json',root),'utf8'));
const fast=process.env.DEMO_FAST==='1', seconds=fast?1:30;
const shots=new URL('docs/screenshots/interfaces/',root);
mkdirSync(shots,{recursive:true});
export default async function run(original){
 const stamp=Date.now().toString().slice(-8),suffix='Démo '+stamp;
 let token='',client,driver,depot,orderIds=[],routeId;
 const timings=[],errors=[],apiErrors=[],captures=[];
 const ctx=await original.context().browser().newContext({viewport:{width:1600,height:1000},
   ...(fast?{}:{recordVideo:{dir:fileURLToPath(new URL('demo/recordings/complete/',root)),size:{width:1600,height:1000}}})});
 const page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().includes('/api/') && r.status()>=400)apiErrors.push({url:new URL(r.url()).pathname,status:r.status()});});
 async function api(path,method='GET',body){
  const r=await fetch('http://127.0.0.1:8080/api/'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(`${method} ${path} : ${r.status} ${data?.message||''}`);
  return data;
 }
 async function snapshot(){return await page.locator('body').ariaSnapshot();}
 async function nav(label,path){
  await snapshot();
  await page.locator('nav').getByRole('link',{name:new RegExp(label)}).click();
  await page.waitForURL('**/'+path);
  await page.waitForFunction(()=>!document.body.textContent.includes('Chargement depuis Oracle'));
  await page.evaluate(()=>scrollTo(0,0));
  assert.equal(await page.locator('.alert.error').count(),0);
 }
 async function shot(name,locator){
  const overlay=page.locator('#gd-demo-overlay');await overlay.evaluateAll(es=>es.forEach(e=>e.style.visibility='hidden'));
  const path=fileURLToPath(new URL(name+'.png',shots));
  if(locator)await locator.screenshot({path});
  else await page.screenshot({path,fullPage:false});
  await overlay.evaluateAll(es=>es.forEach(e=>e.style.visibility='visible'));
  captures.push(name);
 }
 async function tiles(){
  await page.waitForFunction(()=>{const t=[...document.querySelectorAll('.leaflet-tile')];return t.length>0&&t.every(x=>x.complete&&x.naturalWidth>0);},null,{timeout:fast?20000:6000}).catch(()=>{});
 }
 async function hold(ms){if(!fast)await page.waitForTimeout(ms);}
 async function overlay(scene,i){
  await page.evaluate(({scene,i})=>{
   document.getElementById('gd-demo-overlay')?.remove();
   const el=document.createElement('section');el.id='gd-demo-overlay';
   Object.assign(el.style,{position:'fixed',left:'50%',bottom:'14px',transform:'translateX(-50%)',zIndex:'100000',
    width:'900px',maxWidth:'94vw',padding:'13px 22px',borderRadius:'12px',background:'#123e35f5',color:'#fff',
    boxShadow:'0 4px 25px #0003',font:'14px Segoe UI, sans-serif',pointerEvents:'none'});
   const title=document.createElement('strong');title.textContent=scene.title;title.style.cssText='display:block;font-size:18px;margin-bottom:5px;color:#cfedaa';
   const sub=document.createElement('span');sub.textContent=scene.subtitle;
   const pos=document.createElement('span');pos.textContent=`${String(i*30/60|0).padStart(2,'0')}:${i%2?'30':'00'} / 10:00`;
   pos.style.cssText='position:absolute;right:22px;top:14px;font-size:12px;color:#cfedaa';
   el.append(title,sub,pos);document.body.append(el);
  },{scene,i});
 }
 async function scene(index,action){
  const start=performance.now();await overlay(plan[index],index);await action();await overlay(plan[index],index);
  const used=(performance.now()-start)/1000;
  timings.push({id:plan[index].id,startSeconds:index*30,plannedDurationSeconds:30,actionSeconds:used});
  if(!fast && used>28)throw new Error(`Chapitre ${index+1} trop long : ${used.toFixed(1)} s`);
  await page.waitForTimeout(Math.max(0,seconds*1000-(performance.now()-start)));
 }
 const form=()=>page.getByRole('dialog');
 async function save(){
  await snapshot();await form().getByRole('button',{name:'Enregistrer →'}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('status').waitFor();
 }
 try{
  await page.goto('http://localhost:4200/login');
  await page.getByLabel('Adresse e-mail').waitFor();
  const recordingStart=Date.now();
  await scene(0,async()=>{await shot('01-connexion');});
  await scene(1,async()=>{
   await page.getByLabel('Adresse e-mail').fill(env.BOOTSTRAP_ADMIN_EMAIL);
   await page.getByLabel('Mot de passe',{exact:true}).fill(env.BOOTSTRAP_ADMIN_PASSWORD);
   await snapshot();await page.getByRole('button',{name:'Accéder à mon espace →'}).click();
   await page.waitForURL('**/dashboard');
   token=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('gd-session')).token);
   await page.waitForFunction(()=>/\d/.test(document.querySelector('.kpi strong')?.textContent||''));
   await tiles();await shot('02-tableau-de-bord');
  });
  await scene(2,async()=>{await nav('Clients','clients');await shot('03-clients');await page.getByRole('textbox',{name:'Rechercher',exact:true}).fill('Client');});
  await scene(3,async()=>{
   await page.getByRole('button',{name:/Ajouter un client/}).click();await form().waitFor();
   await form().getByLabel(/^Nom/).fill('Client '+suffix);
   await form().getByLabel(/^Adresse/).fill('Adresse fictive de démonstration, Casablanca');
   await form().getByLabel('Téléphone').fill('0600000000');
   await form().getByLabel(/^Latitude/).fill('33.575');await form().getByLabel(/^Longitude/).fill('-7.635');
   await shot('04-formulaire-client',form());await hold(23000);await save();
   client=(await api('clients?size=200')).find(x=>x.name==='Client '+suffix);assert(client);
  });
  await scene(4,async()=>{
   await nav('Livreurs','drivers');await shot('05-livreurs');await hold(5000);
   await page.getByRole('button',{name:/Ajouter un livreur/}).click();await form().waitFor();
   await form().getByLabel(/^Nom/).fill('Imane '+suffix);await form().getByLabel('Téléphone').fill('0610000000');
   await shot('06-formulaire-livreur',form());await hold(17000);await save();
   driver=(await api('drivers?size=200')).find(x=>x.name==='Imane '+suffix);assert(driver);
  });
  await scene(5,async()=>{
   await nav('Véhicules','vehicles');await shot('07-vehicules');await hold(5000);
   await page.getByRole('button',{name:/Ajouter un véhicule/}).click();await form().waitFor();
   await form().getByLabel(/^Immatriculation/).fill('VIDEO-'+stamp);
   await form().getByLabel(/^Capacité/).fill('150');
   await form().getByLabel(/^Livreur/).selectOption({label:driver.name});
   await shot('08-formulaire-vehicule',form());await hold(17000);await save();
  });
  await scene(6,async()=>{
   await nav('Dépôts','depots');await shot('09-depots');await hold(5000);
   await page.getByRole('button',{name:/Ajouter un dépôt/}).click();await form().waitFor();
   await form().getByLabel(/^Nom/).fill('Hub '+suffix);await form().getByLabel(/^Adresse/).fill('Hub fictif, Sidi Maarouf');
   await form().getByLabel(/^Latitude/).fill('33.530');await form().getByLabel(/^Longitude/).fill('-7.630');
   await shot('10-formulaire-depot',form());await hold(17000);await save();
   depot=(await api('depots?size=200')).find(x=>x.name==='Hub '+suffix);assert(depot);
  });
  await scene(7,async()=>{
   await nav('Commandes','orders');await shot('11-commandes');await hold(10000);
   await page.getByRole('combobox',{name:'Filtrer par statut'}).selectOption('PENDING');
   await page.waitForFunction(()=>!document.body.textContent.includes('Chargement depuis Oracle'));await shot('12-commandes-filtrees');
  });
  await scene(8,async()=>{
   await page.getByRole('button',{name:/Ajouter un commande/}).click();await form().waitFor();
   await form().getByLabel(/^Référence/).fill('DEMO-'+stamp+'-1');
   await form().getByLabel(/^Client actif/).selectOption({label:client.name});
   await form().getByLabel(/^Poids/).fill('5');await form().getByLabel(/^Priorité/).selectOption({label:'Normale'});
   await shot('13-formulaire-commande',form());await hold(21000);await save();
   const created=(await api('orders?size=200')).find(x=>x.reference==='DEMO-'+stamp+'-1');assert(created);orderIds.push(created.id);
   const clients=(await api('clients?size=200')).filter(x=>x.active&&x.id!==client.id).slice(0,4);
   for(let i=0;i<4;i++)orderIds.push((await api('orders','POST',{reference:`DEMO-${stamp}-${i+2}`,clientId:clients[i].id,weightKg:3+i,priority:'NORMAL'})).id);
  });
  await scene(9,async()=>{await nav('Carte en direct','map');await page.locator('.leaflet-marker-icon').first().waitFor();await tiles();await shot('14-carte-generale');});
  await scene(10,async()=>{
   await page.getByLabel('Position de référence').selectOption({label:client.name});await hold(5000);
   await page.getByRole('button',{name:/Trouver les plus proches/}).click();
   await page.waitForFunction(()=>document.querySelectorAll('.proximity-results .fleet-row').length===5);
   await tiles();await shot('15-plus-proches-voisins');
  });
  await scene(11,async()=>{
   await hold(5000);await page.getByRole('button',{name:/Rechercher dans le rayon/}).click();
   await page.waitForFunction(()=>document.querySelector('.proximity-results')?.textContent.includes('SDO_WITHIN_DISTANCE'));
   await tiles();await shot('16-recherche-par-rayon');
  });
  await scene(12,async()=>{await nav('Tournées','routes');await shot('17-historique-tournees');});
  await scene(13,async()=>{
   await nav('Optimisation','routes/optimize');
   await page.waitForFunction(()=>document.querySelectorAll('.order-option').length>0);await hold(5000);
   await page.getByLabel('Dépôt de départ').selectOption({label:depot.name});
   await page.getByLabel('Livreur disponible').selectOption({label:driver.name});
   await page.locator('.order-option input:checked').evaluateAll(es=>es.forEach(e=>e.click()));
   for(let i=1;i<=5;i++)await page.locator('.order-option').filter({hasText:`DEMO-${stamp}-${i}`}).getByRole('checkbox').check();
   await shot('18-planification');
  });
  await scene(14,async()=>{
   await page.getByLabel('Algorithme').selectOption('NEAREST_NEIGHBOR');await hold(5000);
   await page.getByRole('button',{name:/Calculer le meilleur ordre/}).click();
   await page.getByRole('button',{name:'Confirmer la tournée ✓'}).waitFor({timeout:15000});
   await tiles();await shot('19-resultat-nearest-neighbor');
  });
  await scene(15,async()=>{
   await page.getByLabel('Algorithme').selectOption('TWO_OPT');await hold(4000);
   await page.getByRole('button',{name:/Calculer le meilleur ordre/}).click();
   await page.getByRole('button',{name:'Confirmer la tournée ✓'}).waitFor({timeout:15000});
   await tiles();await shot('20-resultat-deux-opt');await hold(12000);
   await page.locator('.result-metrics').scrollIntoViewIfNeeded();await shot('21-metriques-optimisation');
  });
  await scene(16,async()=>{
   await hold(6000);await page.getByRole('button',{name:'Confirmer la tournée ✓'}).click();
   await page.waitForURL(/\/routes\/\d+$/);routeId=Number(page.url().split('/').at(-1));
   await page.getByRole('button',{name:'Démarrer la tournée →'}).waitFor();
   await tiles();await shot('22-detail-tournee-planifiee');
  });
  await scene(17,async()=>{
   await hold(3000);await page.getByRole('button',{name:'Démarrer la tournée →'}).click();
   await page.getByRole('button',{name:'Livrer ✓',exact:true}).first().waitFor();
   await shot('23-tournee-en-cours');await hold(6000);
   await page.locator('.position-panel').scrollIntoViewIfNeeded();
   await page.getByLabel('Latitude',{exact:true}).fill('33.578');await page.getByLabel('Longitude',{exact:true}).fill('-7.636');
   await hold(12000);await page.getByRole('button',{name:'Enregistrer le GPS'}).click();
   await page.getByText('Position enregistrée dans Oracle.').waitFor();await shot('24-position-gps',page.locator('.position-panel'));
  });
  await scene(18,async()=>{
   await nav('Livraisons','deliveries');await shot('25-livraisons');await hold(6000);
   const rows=page.locator('tbody tr').filter({hasText:'DEMO-'+stamp});
   assert.equal(await rows.count(),5);
   for(let i=0;i<5;i++){
    const todo=rows.filter({has:page.getByRole('button',{name:'Livrer ✓',exact:true})});
    await todo.first().getByRole('button',{name:'Livrer ✓',exact:true}).click();
    await page.waitForFunction(()=>!document.body.textContent.includes('Chargement depuis Oracle'));
    await page.waitForFunction(({prefix,n})=>[...document.querySelectorAll('tbody tr')].filter(r=>r.textContent.includes(prefix)&&r.querySelector('.DELIVERED')).length>=n,{prefix:'DEMO-'+stamp,n:i+1});await hold(2200);
   }
   const completed=await api('routes/'+routeId);assert.equal(completed.status,'COMPLETED');
   await page.goto('http://localhost:4200/routes/'+routeId);await page.locator('.route-summary').waitFor();await tiles();await shot('26-tournee-terminee');
  });
  await scene(19,async()=>{
   await nav('Vue d’ensemble','dashboard');
   await page.waitForFunction(()=>/\d/.test(document.querySelector('.kpi strong')?.textContent||''));
   await tiles();await shot('27-tableau-de-bord-final');
  });
  await page.locator('#gd-demo-overlay').evaluateAll(es=>es.forEach(e=>e.remove()));
  const video=fast?null:page.video();await ctx.close();
  const result={executedAt:new Date().toISOString(),mode:fast?'repetition':'10-minutes',targetSeconds:600,
   recordedSeconds:(Date.now()-recordingStart)/1000,video:video?await video.path():null,routeId,sceneTimings:timings,captures,
   javascriptErrors:errors,apiErrors,interfaceCoverage:['login','dashboard','clients','drivers','vehicles','depots','orders','map','routes/optimize','routes','routes/:id','deliveries']};
  assert.equal(errors.length,0);assert.equal(apiErrors.length,0);
  writeFileSync(new URL(`docs/evidence/demo-complete-${fast?'rehearsal':'recording'}.json`,root),JSON.stringify(result,null,2));
  return result;
 }catch(e){
  await page.screenshot({path:fileURLToPath(new URL('docs/screenshots/interfaces/capture-error.png',root)),fullPage:true}).catch(()=>{});
  await ctx.close();throw e;
 }
}
