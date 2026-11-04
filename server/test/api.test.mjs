import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApi} from '../api.mjs';

const dir=await mkdtemp(join(tmpdir(),'erp-api-'));
let address,app,server,driver,monitor,admin,outsider,foreign,route,completeId;
let now=Date.now();
const config={file:join(dir,'aula.sqlite'),tenant:'AULA',demo:true,secure:false,interval:1000,tickMs:20,now:()=>now};
async function open() {
  app=await createApi(config);server=createServer(app.handle);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  address='http://127.0.0.1:'+server.address().port;
}
async function close() {app.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});}
async function req(path,user,method='GET',body,extra={}) {
  const res=await fetch(address+'/api'+path,{method,headers:{...(user?{cookie:user.cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...extra},body:body!==undefined?JSON.stringify(body):undefined});
  return {status:res.status,data:await res.json(),headers:res.headers};
}
async function login(email,password,tenant='AULA'){
  const r=await req('/login',null,'POST',{email:email.includes('@')?email:email+'@enterprisecloud.demo',password,tenant});
  assert.equal(r.status,200,JSON.stringify(r.data));return {...r.data,cookie:r.headers.get('set-cookie').split(';')[0]};
}
const draft=(u,overrides={})=>({id:randomUUID(),title:'Ruta GPS de prueba',mode:'gps',viewer:u.id,
  origin:{name:'Despacho',lat:-12.125,lng:-77.035},destination:{name:'Instituto',lat:-12.12,lng:-77.029},...overrides});
before(async()=>{
  const other=await createApi({...config,tenant:'OTRA'});other.close();
  await open();
  driver=await login('repartidor','Ruta1234!');monitor=await login('monitor','Mapa1234!');admin=await login('admin','Admin123!');
  const account={id:randomUUID(),email:'otro@clase.demo',name:'Otro monitor',role:'monitor',active:true,phone:'',password:'Otro12345!'};
  assert.equal((await req('/users',admin,'PUT',account)).status,200);outsider=await login(account.email,account.password);
  foreign=await login('monitor','Mapa1234!','OTRA');
});
after(async()=>{await close();await rm(dir,{recursive:true,force:true});});
test('sesión de servidor, permisos y validación de origen',async()=>{
  assert.equal((await req('/trips')).status,401);
  assert.equal((await req('/users',monitor)).status,403);
  assert.equal((await req('/users',monitor,'PUT',{role:'admin'})).status,403);
  assert.equal((await req('/login',null,'POST',{email:driver.email,password:'Incorrecta123!'})).status,401);
  assert.equal((await req('/assistant',admin,'POST',{question:'hola'},{origin:'https://otro.test'})).status,403);
  const me=await req('/me',driver);assert.equal(me.data.role,'repartidor');assert.equal(me.data.hash,undefined);
  for(const u of (await req('/users',admin)).data) assert.equal(u.password,undefined);
});
test('asignación, multiempresa, lectura privada e idempotencia de creación',async()=>{
  const body=draft(monitor);
  assert.equal((await req('/trips',monitor,'POST',body)).status,403);
  assert.equal((await req('/trips',driver,'POST',{...body,viewer:foreign.id})).status,422);
  assert.equal((await req('/trips',driver,'POST',{...body,origin:{...body.origin,lat:91}})).status,422);
  const r=await req('/trips',driver,'POST',body);assert.equal(r.status,201);route=r.data;
  assert.equal((await req('/trips',driver,'POST',body)).data.id,route.id);
  assert.equal((await req('/trips',driver,'POST',{...body,title:'Otra'})).status,409);
  assert.equal((await req('/trips/'+route.id,monitor)).status,200);
  for(const u of [foreign,outsider]) {
    assert.equal((await req('/trips/'+route.id,u)).status,404);
    assert.ok(!(await req('/trips',u)).data.some(t=>t.id===route.id));
  }
  assert.equal((await req('/trips/'+route.id+'/iniciar',monitor,'POST',{})).status,403);
});
test('GPS real: evento al monitor, repetición ordenada, reintento y llegada verificable',async()=>{
  const path='/trips/'+route.id;
  await req(path+'/iniciar',driver,'POST',{});
  const sse=await fetch(address+'/api/events',{headers:{cookie:monitor.cookie},signal:AbortSignal.timeout(5000)});
  const reader=sse.body.getReader();try {
    const initial=new TextDecoder().decode((await reader.read()).value);assert.match(initial,/listo/);
    const a={lat:route.origin.lat,lng:route.origin.lng,accuracy:10,at:now};
    assert.equal((await req(path+'/points',monitor,'POST',a)).status,403);
    assert.equal((await req(path+'/points',driver,'POST',a)).data.seq,1);
    assert.match(new TextDecoder().decode((await reader.read()).value),new RegExp(route.id));
    assert.equal((await req(path+'/points',driver,'POST',a)).data.seq,1);
    assert.equal((await req(path+'/points',driver,'POST',{...a,lat:a.lat+1})).status,409);
    assert.equal((await req(path+'/finalizar',driver,'POST',{})).status,409);
    now+=3100;
    assert.equal((await req(path+'/points',driver,'POST',{lat:route.destination.lat,lng:route.destination.lng,accuracy:12,at:now})).data.seq,2);
    assert.equal((await req(path+'/finalizar',driver,'POST',{})).data.status,'entregada');
    const history=(await req(path,monitor)).data;
    assert.deepEqual(history.points.map(p=>p.seq),[1,2]);assert.ok(history.points[0].at<history.points[1].at);
    assert.equal((await req(path+'?after=1',monitor)).data.points.length,1);
    assert.equal((await req(path+'/points',driver,'POST',a)).status,409);
  }finally{await reader.cancel();}
});
test('simulación automática recupera el tiempo transcurrido y no admite GPS inventado',async()=>{
  const t=(await req('/trips',driver)).data.find(t=>t.mode==='demo');
  await req('/trips/'+t.id+'/iniciar',driver,'POST',{});
  assert.equal((await req('/trips/'+t.id+'/points',driver,'POST',{lat:1,lng:1,accuracy:0,at:now})).status,409);
  now+=20000;await new Promise(r=>setTimeout(r,75));
  const history=(await req('/trips/'+t.id,monitor)).data;
  assert.equal(history.trip.status,'entregada');assert.equal(history.points.length,16);assert.equal(history.points[0].lat,t.origin.lat);assert.equal(history.points.at(-1).lng,t.destination.lng);
  completeId=t.id;
});
test('asistente con confirmación vinculada al actor, control de roles y reintentos',async()=>{
  let r=await req('/assistant',driver,'POST',{question:'Crea una entrega simulada para Diego · Instituto'});
  const id=r.data.proposal.id;assert.ok(id);assert.equal((await req('/trips/'+id,driver)).status,404);
  assert.equal((await req('/assistant/confirm',monitor,'POST',{id})).status,409);
  assert.equal((await req('/assistant/confirm',driver,'POST',{id})).data.id,id);
  assert.equal((await req('/assistant/confirm',driver,'POST',{id})).data.id,id);
  assert.equal((await req('/trips',driver)).data.filter(t=>t.id===id).length,1);
  assert.equal((await req('/assistant',monitor,'POST',{question:'Crea una entrega simulada'})).status,403);
  r=await req('/assistant',driver,'POST',{question:'Crea una entrega simulada'});assert.equal(r.data.proposal,undefined);assert.equal(r.data.open,'rutas');
});
test('el historial y la sesión sobreviven a un reinicio del servicio',async()=>{
  await close();await open();
  assert.equal((await req('/trips/'+completeId,monitor)).data.points.length,16);
  const u=(await req('/users',admin)).data.find(v=>v.id===outsider.id);
  assert.equal((await req('/users',admin,'PUT',{...u,active:false})).status,200);
  assert.equal((await req('/trips',outsider)).status,401);
  assert.equal((await req('/logout',driver,'POST',{})).status,200);
  assert.equal((await req('/me',driver)).status,401);
});
test('las cuentas se normalizan, rechazan duplicados y protegen la administración',async()=>{
  const draft={id:randomUUID(),name:'Ana',role:'monitor',email:' ANA@AULA.PE ',phone:'',active:true,password:'Aula12345!'};
  const saved=await req('/users',admin,'PUT',draft);assert.equal(saved.data.email,'ana@aula.pe');
  assert.equal((await req('/users',admin,'PUT',{...draft,id:randomUUID()})).status,409);
  assert.equal((await req('/users',admin,'PUT',{...admin,role:'monitor'})).status,409);
  assert.equal((await req('/users',admin,'PUT',{...admin,active:false})).status,409);
  assert.equal((await req('/users',admin,'PUT',{...draft,id:randomUUID(),email:'dos@aula.pe',password:'123'})).status,422);
  const ana=await login('ana@aula.pe','Aula12345!');assert.equal(ana.role,'monitor');
  assert.equal((await req('/users',admin,'PUT',{...saved.data,name:'Ana María',password:''})).status,200);
  assert.equal((await req('/me',ana)).data.name,'Ana María');
  const history=await req('/audit',admin);assert.ok(history.data.some(e=>e.action==='asistente.entrega.creada'));
  assert.equal((await req('/audit',monitor)).status,403);
});

test('coordinación: el administrador inicia una demo A/B personalizada y el recorrido termina en B',async()=>{
  const a={name:'Almacén de prueba',lat:-12.08701,lng:-77.06512};
  const b={name:'Cliente de prueba',lat:-12.07327,lng:-77.04487};
  const body=draft(monitor,{id:randomUUID(),mode:'demo',title:'Entrega con origen y destino propios',driver:driver.id,origin:a,destination:b});
  const created=await req('/trips',admin,'POST',body);
  assert.equal(created.status,201,JSON.stringify(created.data));
  assert.deepEqual(created.data.origin,a);assert.deepEqual(created.data.destination,b);
  const id=created.data.id;
  assert.equal((await req('/trips/'+id+'/iniciar',admin,'POST',{})).status,200);
  now+=20000;await new Promise(r=>setTimeout(r,80));
  const detail=await req('/trips/'+id,admin);
  assert.equal(detail.status,200);
  assert.equal(detail.data.trip.status,'entregada');
  assert.equal(detail.data.points.length,16);
  assert.equal(detail.data.points[0].lat,a.lat);
  assert.equal(detail.data.points.at(-1).lat,b.lat);
  assert.equal(detail.data.points.at(-1).lng,b.lng);
});
