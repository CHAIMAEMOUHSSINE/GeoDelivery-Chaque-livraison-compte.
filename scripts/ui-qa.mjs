import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const env=Object.fromEntries(readFileSync(new URL('.env',root),'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
const out=fileURLToPath(new URL('docs/screenshots/',root));
export default async function run(page,ui) {
  mkdirSync(out,{recursive:true}); await page.setViewportSize({width:1440,height:1000});
  await ui.snapshot();
  await page.getByLabel('Adresse e-mail').fill(env.BOOTSTRAP_ADMIN_EMAIL);
  await page.getByLabel('Mot de passe',{exact:true}).fill(env.BOOTSTRAP_ADMIN_PASSWORD);
  await ui.snapshot();
  await page.getByRole('button',{name:'Accéder à mon espace →'}).click();
  await page.waitForURL('**/dashboard');
  await page.waitForFunction(()=>/\d/.test(document.querySelector('.kpi strong')?.textContent || ''));
  await page.locator('.leaflet-marker-icon').first().waitFor();
  await tilesReady(page);
  await page.screenshot({path:out+'/dashboard.png',fullPage:true});
  const dashboard=await ui.snapshot({full:true});
  assert(dashboard.includes('Chaque livraison compte'));
  await page.getByRole('link',{name:'Carte en direct'}).click();
  await page.getByRole('button',{name:'Trouver les plus proches',exact:false}).waitFor();
  await ui.snapshot();
  await page.getByRole('button',{name:'Trouver les plus proches',exact:false}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.proximity-results .fleet-row').length===5);
  await tilesReady(page);
  await page.screenshot({path:out+'/proximity.png',fullPage:true});
  const pages=[];
  for(const [name,path] of [['Clients','clients'],['Livreurs','drivers'],['Véhicules','vehicles'],['Dépôts','depots'],['Commandes','orders'],['Tournées','routes'],['Livraisons','deliveries']]) {
    await ui.snapshot();
    await page.locator('nav').getByRole('link',{name:new RegExp(name)}).click();
    await page.waitForURL('**/'+path);
    await page.waitForFunction(()=>!document.body.textContent.includes('Chargement depuis Oracle'));
    assert.equal(await page.locator('.alert.error').count(),0,`${path} affiche une erreur`);
    pages.push({path,rows:await page.locator('tbody tr').count()});
  }
  await page.locator('nav').getByRole('link',{name:/Clients/}).click();
  await page.getByRole('button',{name:'Ajouter un client',exact:false}).click();
  await page.getByRole('dialog').waitFor(); await ui.snapshot();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Nom', {exact:false}).fill('Client QA interface');
  await dialog.getByLabel('Adresse',{exact:false}).fill('Adresse entièrement fictive, Casablanca');
  await dialog.getByLabel('Téléphone').fill('0600000000');
  await dialog.getByRole('button',{name:'Enregistrer →'}).click();
  await page.getByRole('status').waitFor();
  assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByRole('link',{name:'Optimisation',exact:false}).click();
  await page.waitForURL('**/routes/optimize');
  await page.getByRole('button',{name:'Calculer le meilleur ordre',exact:false}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.planner-controls .button.primary')?.disabled);
  await ui.snapshot();
  await page.getByRole('button',{name:'Calculer le meilleur ordre',exact:false}).click();
  await page.getByRole('button',{name:'Confirmer la tournée ✓'}).waitFor({timeout:60000});
  assert.equal(await page.locator('.result-stops .stop-row').count(),6);
  await tilesReady(page);
  await page.screenshot({path:out+'/optimization.png',fullPage:true});
  await page.getByRole('button',{name:'Confirmer la tournée ✓'}).click();
  await page.waitForURL(/\/routes\/\d+$/);
  await page.getByRole('button',{name:'Démarrer la tournée →'}).waitFor();
  await tilesReady(page);
  await page.screenshot({path:out+'/route.png',fullPage:true});
  await ui.snapshot();
  await page.getByRole('button',{name:'Démarrer la tournée →'}).click();
  await page.getByRole('button',{name:'Livrer ✓',exact:true}).first().waitFor();
  await page.getByRole('button',{name:'Livrer ✓',exact:true}).first().click();
  await page.waitForFunction(()=>document.querySelectorAll('.stop-actions .DELIVERED').length===1);
  await page.getByRole('link',{name:'Vue d’ensemble'}).click();
  await page.waitForURL('**/dashboard');
  await page.waitForFunction(()=>/\d/.test(document.querySelector('.kpi strong')?.textContent || ''));
  await page.setViewportSize({width:390,height:844});
  await tilesReady(page);
  await page.screenshot({path:out+'/mobile.png',fullPage:true});
  const overflow=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth}));
  assert(overflow.body<=overflow.viewport+1,`Débordement mobile ${JSON.stringify(overflow)}`);
  const result={executedAt:new Date().toISOString(),pages,crudClient:true,proximityResults:5,previewAndConfirm:true,
    routeStarted:true,deliveryUpdated:true,mobileOverflow:false};
  mkdirSync(new URL('docs/evidence/',root),{recursive:true});
  writeFileSync(new URL('docs/evidence/ui-tests.json',root),JSON.stringify(result,null,2));
  return result;
}
async function tilesReady(page) {
  await page.waitForFunction(()=> {
    const tiles=[...document.querySelectorAll('.leaflet-tile')];
    return tiles.length>0 && tiles.every(t=>t.complete && t.naturalWidth>0);
  },{},{timeout:20000});
}
