import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const env=Object.fromEntries(readFileSync(new URL('.env',root),'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
let token='';
async function call(path,method='GET',body) {
  const r=await fetch('http://127.0.0.1:8080/api/'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,data:await r.json().catch(()=>null)};
}
try {
  token=(await call('auth/login','POST',{email:env.BOOTSTRAP_ADMIN_EMAIL,password:env.BOOTSTRAP_ADMIN_PASSWORD})).data.token;
  const drivers=(await call('drivers?size=200')).data.filter(d=>d.status==='AVAILABLE');
  assert(drivers.length>=2);
  const clients=(await call('clients?size=2')).data, depot=(await call('depots')).data[0], ids=[];
  for(let i=0;i<2;i++) ids.push((await call('orders','POST',{clientId:clients[i].id,reference:`QA-RACE-${Date.now()}-${i}`,weightKg:2,priority:'NORMAL'})).data.id);
  const request={depotId:depot.id,orderIds:ids,algorithm:'TWO_OPT',returnToDepot:true};
  const results=await Promise.all(drivers.slice(0,2).map(d=>call('routes','POST',{...request,driverId:d.id})));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  const winner=results.find(r=>r.status===201).data;
  assert.equal(winner.orderedStops.length,2);
  assert.equal((await call(`routes/${winner.id}/status`,'PATCH',{status:'CANCELLED'})).status,204);
  const output={executedAt:new Date().toISOString(),scenario:'Deux livreurs confirment simultanément les mêmes commandes',
    statuses:results.map(r=>r.status),uniqueWinner:true,routeId:winner.id,cancelledAfterTest:true};
  writeFileSync(new URL('docs/evidence/concurrency-test.json',root),JSON.stringify(output,null,2));
  console.log('PASS : confirmations concurrentes, un seul succès (201), un conflit (409).');
} catch(e) {console.error(e.message);process.exitCode=1;}
