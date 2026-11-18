// Tests d'integration REELS : ajoute des donnees QA fictives dans le schema du projet.
// Ne jamais executer contre des donnees de production.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const root = new URL('../', import.meta.url);
const env = Object.fromEntries(readFileSync(new URL('.env',root),'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
const base = process.env.API_URL || 'http://127.0.0.1:8080/api/';
const evidence = {executedAt:new Date().toISOString(),tests:[],metrics:null};
let token = '';
async function call(path,method='GET',body,auth=token,expected=200) {
  const response = await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await response.text(); let data;
  try {data=JSON.parse(text);} catch {data=text;}
  assert.equal(response.status,expected,`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}
async function check(name,fn) {
  const start=performance.now(); await fn();
  evidence.tests.push({name,status:'PASS',durationMs:Math.round((performance.now()-start)*100)/100});
  console.log('PASS',name);
}
try {
  await check('API refuse les requêtes non authentifiées',() => call('clients','GET',undefined,'',401));
  const login=await call('auth/login','POST',{email:env.BOOTSTRAP_ADMIN_EMAIL,password:env.BOOTSTRAP_ADMIN_PASSWORD},'');
  token=login.token;
  await check('Identifiants incorrects : 401',() => call('auth/login','POST',{email:env.BOOTSTRAP_ADMIN_EMAIL,password:'incorrect'},'',401));
  for(const path of ['clients','drivers','vehicles','depots','orders','routes','deliveries','dashboard/stats']) {
    await check(`Lecture ${path}`,() => call(path));
  }
  const clients=await call('clients?size=200');
  const client=clients[0];
  await check('SDO_NN : cinq livreurs disponibles triés',async() => {
    const result=await call(`spatial/nearest-drivers?clientId=${client.id}&limit=5`);
    assert.equal(result.length,5); assert(result.every(r => r.status==='AVAILABLE'));
    assert(result.every((r,i) => i===0 || r.distanceKm>=result[i-1].distanceKm));
  });
  await check('SDO_WITHIN_DISTANCE : tous les résultats dans le rayon',async() => {
    const result=await call(`spatial/drivers-within-radius?clientId=${client.id}&radiusKm=5`);
    assert(result.length>0); assert(result.every(r => r.distanceKm<=5.000005));
  });
  await check('Coordonnées invalides rejetées : 400',() => call('clients','POST',{name:'QA invalide',address:'Fictive',position:{latitude:91,longitude:0}},token,400));
  const stamp=Date.now(), password='QA!'+randomBytes(12).toString('hex');
  const driverUser=await call('users','POST',{email:`qa-driver-${stamp}@geodelivery.local`,password,role:'DRIVER'},token,201);
  const driver=await call('drivers','POST',{name:`QA livreur ${stamp}`,phone:'0600000000',userId:driverUser.id,status:'AVAILABLE',position:{latitude:33.57,longitude:-7.63}},token,201);
  await call('vehicles','POST',{plateNumber:`QA-${stamp}`,capacityKg:150,driverId:driver.id},token,201);
  const driverToken=(await call('auth/login','POST',{email:driverUser.email,password},'')).token;
  await check('Rôle DRIVER interdit sur la gestion clients : 403',() => call('clients','GET',undefined,driverToken,403));
  const depot=(await call('depots'))[0];
  const qaOrders=[];
  for(let i=0;i<5;i++) {
    qaOrders.push(await call('orders','POST',{reference:`QA-${stamp}-${i}`,clientId:clients[i].id,weightKg:4,priority:'NORMAL'},token,201));
  }
  const request={driverId:driver.id,depotId:depot.id,orderIds:qaOrders.map(o=>o.id),algorithm:'TWO_OPT',returnToDepot:true};
  let preview;
  await check('Aperçu : distances Oracle, 2-opt ≤ NN, aucune écriture',async() => {
    const before=await call('dashboard/stats');
    preview=await call('routes/optimize','POST',request);
    assert.equal(preview.distanceMode,'GEODESIC');
    assert(preview.optimizedDistanceKm<=preview.initialDistanceKm+1e-8);
    assert.equal(preview.orderedStops.length,5); assert.equal(new Set(preview.orderedStops.map(s=>s.orderId)).size,5);
    const sum=preview.orderedStops.reduce((a,s)=>a+s.segmentDistanceKm,0)+preview.returnDistanceKm;
    assert(Math.abs(sum-preview.optimizedDistanceKm)<1e-8);
    assert.equal((await call('dashboard/stats')).activeRoutes,before.activeRoutes);
    assert.equal((await call(`orders/${qaOrders[0].id}`)).status,'PENDING');
    evidence.metrics={initialDistanceKm:preview.initialDistanceKm,optimizedDistanceKm:preview.optimizedDistanceKm,
      improvementPercent:preview.improvementPercent,stopCount:5,computationTimeMs:preview.computationTimeMs,distanceMode:'GEODESIC'};
  });
  await check('Doublons de commandes : 400',() => call('routes/optimize','POST',{...request,orderIds:[qaOrders[0].id,qaOrders[0].id]},token,400));
  await check('Commande absente : 404',() => call('routes/optimize','POST',{...request,orderIds:[999999999]},token,404));
  await check('Commande unique et tournée ouverte',async() => {
    const one=await call('routes/optimize','POST',{...request,orderIds:[qaOrders[0].id],returnToDepot:false});
    assert.equal(one.orderedStops.length,1); assert.equal(one.returnDistanceKm,0);
  });
  const overweight=await call('orders','POST',{reference:`QA-HEAVY-${stamp}`,clientId:client.id,weightKg:151,priority:'NORMAL'},token,201);
  await check('Dépassement de capacité : 409',() => call('routes/optimize','POST',{...request,orderIds:[overweight.id]},token,409));
  await call(`orders/${overweight.id}/status`,'PATCH',{status:'CANCELLED'},token,204);
  let route;
  await check('Confirmation transactionnelle : arrêts et affectations persistés',async() => {
    route=await call('routes','POST',request,token,201);
    assert.equal(route.status,'PLANNED'); assert.equal(route.orderedStops.length,5);
    assert.equal((await call(`orders/${qaOrders[0].id}`)).status,'ASSIGNED');
    assert.equal((await call(`drivers/${driver.id}`)).status,'BUSY');
  });
  await check('Deuxième affectation refusée : 409',() => call('routes','POST',request,token,409));
  await check('Commande déjà affectée non modifiable : 409',() => call(`orders/${qaOrders[0].id}`,'PUT',{reference:qaOrders[0].reference,clientId:client.id,weightKg:4,priority:'NORMAL'},token,409));
  await check('Livraison sans démarrage refusée : 409',() => call(`deliveries/${route.orderedStops[0].deliveryId}/status`,'PATCH',{status:'DELIVERED'},driverToken,409));
  await check('Propriété des positions : autre livreur interdit, 403',() => call(`drivers/${driver.id===1?2:1}/position`,'PUT',{latitude:33.57,longitude:-7.63},driverToken,403));
  await check('GPS du livreur persisté',() => call(`drivers/${driver.id}/position`,'PUT',{latitude:33.575,longitude:-7.635},driverToken,204));
  await check('Démarrage et exécution par le propriétaire',async() => {
    await call(`routes/${route.id}/status`,'PATCH',{status:'IN_PROGRESS'},driverToken,204);
    await call(`routes/${route.id}/status`,'PATCH',{status:'CANCELLED'},driverToken,403);
    for(const s of route.orderedStops) await call(`deliveries/${s.deliveryId}/status`,'PATCH',{status:'DELIVERED'},driverToken,204);
    const completed=await call(`routes/${route.id}`,'GET',undefined,driverToken);
    assert.equal(completed.status,'COMPLETED');
    assert.equal((await call(`drivers/${driver.id}`)).status,'AVAILABLE');
    assert.equal((await call(`orders/${qaOrders[0].id}`)).status,'DELIVERED');
  });
  await check('Retour arrière interdit : 409',() => call(`orders/${qaOrders[0].id}/status`,'PATCH',{status:'PENDING'},token,409));
  await check('Pagination et validation des paramètres',async() => {
    assert.equal((await call('clients?size=2')).length,2);
    await call('clients?size=500','GET',undefined,token,400);
    await call('spatial/nearest-drivers?clientId=1&limit=0','GET',undefined,token,400);
  });
  mkdirSync(new URL('docs/evidence/',root),{recursive:true});
  writeFileSync(new URL('docs/evidence/api-tests.json',root),JSON.stringify(evidence,null,2));
  console.log(`${evidence.tests.length} contrôles validés. Mesures : docs/evidence/api-tests.json`);
} catch(e) {
  console.error(e.message); process.exitCode=1;
}
