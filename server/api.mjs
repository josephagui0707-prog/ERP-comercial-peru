import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {accounts, bootstrap, demoAccess} from './accounts.mjs';
import {tracking} from './tracking.mjs';
import {assistant} from './assistant.mjs';
import {ApiError,requireThat} from './shared.mjs';

async function jsonBody(req) {
  requireThat((req.headers['content-type'] || '').split(';')[0]==='application/json',415,'Envía JSON.');
  const chunks=[]; let size=0;
  for await(const chunk of req) {size+=chunk.length; requireThat(size<=16384,413,'Solicitud demasiado grande.'); chunks.push(chunk);}
  let data;
  try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ApiError(400,'El JSON recibido no es válido.');}
  requireThat(data && typeof data==='object' && !Array.isArray(data),400,'Se esperaba un objeto.');
  return data;
}
export async function createApi(config) {
  if(config.file!==':memory:') mkdirSync(dirname(config.file),{recursive:true});
  const db=new DatabaseSync(config.file);
  db.exec(readFileSync(new URL('schema.sql',import.meta.url),'utf8'));
  await bootstrap(db,config);
  const auth=accounts(db,config), listeners=new Set(), attempts=new Map();
  function limit(key,max,period=60000) {
    const now=Date.now(), old=attempts.get(key);
    if(!old || old.until<=now) {attempts.set(key,{count:1,until:now+period}); return;}
    requireThat(++old.count<=max,429,'Demasiadas solicitudes. Espera un momento.');
  }
  function publish(row) {
    for(const c of listeners) {
      const actor=auth.session(c.req);
      if(!actor) {c.res.end();continue;}
      if(trips.canSee(actor,row)) c.res.write('data: '+JSON.stringify({id:row.id})+'\n\n');
    }
  }
  const trips=tracking(db,publish,config), helper=assistant(db,trips,config);
  if(config.demo) trips.seed(config.tenant);
  const tick=setInterval(()=>{try{trips.tick();}catch{console.error('No se pudo avanzar la simulación. Se reintentará.');}},config.tickMs||900).unref();
  const heartbeat=setInterval(()=>{
    for(const c of listeners) {if(!auth.session(c.req)) c.res.end(); else c.res.write(': conectado\n\n');}
    for(const [key,v] of attempts) if(v.until<=Date.now()) attempts.delete(key);
  },15000).unref();
  async function handle(req,res) {
    try {
      const url=new URL(req.url,'http://localhost'), p=url.pathname, m=req.method;
      res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
      const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
      const write=m==='POST'||m==='PUT';
      if(write && req.headers.origin) {
        const expected=config.origin || ((config.secure?'https':'http')+'://'+req.headers.host);
        requireThat(req.headers.origin===expected,403,'Origen no autorizado.');
      }
      if(m==='GET'&&p==='/api/info') return send({demo:config.demo,tenant:config.tenant,accounts:config.demo?demoAccess():[]});
      if(m==='POST'&&p==='/api/login') {
        limit('login:'+req.socket.remoteAddress,35,600000);
        return send(await auth.login(await jsonBody(req),req,res));
      }
      if(m==='POST'&&p==='/api/logout') {await jsonBody(req);auth.logout(req,res);return send({ok:true});}
      const actor=auth.session(req);
      requireThat(actor,401,'Inicia sesión para continuar.');
      if(m==='GET'&&p==='/api/me') return send(actor);
      if(m==='GET'&&p==='/api/audit') {
        requireThat(actor.role==='admin',403,'Solo administración puede consultar este historial.');
        return send(db.prepare('SELECT e.id,e.at,e.action,e.ref,u.name AS actor FROM events e JOIN users u ON u.id=e.actor AND u.tenant=e.tenant WHERE e.tenant=? ORDER BY e.id DESC LIMIT 100').all(actor.tenant));
      }
      if(m==='GET'&&p==='/api/users') return send(auth.list(actor));
      if(m==='PUT'&&p==='/api/users') {limit('users:'+actor.id,40); return send(await auth.save(actor,await jsonBody(req)));}
      if(m==='GET'&&p==='/api/directory') return send(trips.directory(actor));
      if(m==='GET'&&p==='/api/trips') return send(trips.list(actor));
      if(m==='POST'&&p==='/api/trips') {limit('create:'+actor.id,30);return send(trips.create(actor,await jsonBody(req)),201);}
      if(m==='GET'&&p==='/api/events') {
        requireThat(['admin','ventas','repartidor','monitor'].includes(actor.role),403,'Tu rol no tiene acceso a Rutas.');
        requireThat([...listeners].filter(c=>c.user===actor.id).length<6,429,'Hay demasiadas ventanas de seguimiento abiertas.');
        res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});
        res.write('retry: 3000\n\n'); res.write('event: listo\ndata: {}\n\n');
        const c={req,res,user:actor.id};listeners.add(c);res.on('close',()=>listeners.delete(c));return;
      }
      const match=p.match(/^\/api\/trips\/([\w-]+)(?:\/(points|iniciar|finalizar|cancelar))?$/);
      if(match) {
        const [,id,action]=match;
        if(m==='GET' && !action) {
          const after=Number(url.searchParams.get('after')||0);
          requireThat(Number.isSafeInteger(after) && after>=0,422,'Cursor inválido.');
          return send(trips.details(actor,id,after));
        }
        if(m==='POST'&&action){const body=await jsonBody(req);limit('track:'+actor.id,150);return send(action==='points'?trips.point(actor,id,body):trips.transition(actor,id,action));}
      }
      if(m==='POST'&&p==='/api/assistant'){limit('assistant:'+actor.id,30);return send(await helper.ask(actor,await jsonBody(req)));}
      if(m==='POST'&&p==='/api/assistant/confirm'){limit('confirm:'+actor.id,30);const body=await jsonBody(req);return send(helper.confirm(actor,body.id));}
      throw new ApiError(404,'Ruta inexistente.');
    } catch(error) {
      const status=error instanceof ApiError?error.status:500;
      if(status===500) console.error('Error interno en la API',error.code || error.name);
      if(!res.headersSent) res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});
      res.end(JSON.stringify({error:status===500?'Error interno al procesar la solicitud.':error.message}));
    }
  }
  return {handle,close(){clearInterval(tick);clearInterval(heartbeat);for(const c of listeners)c.res.end();db.close();}};
}
