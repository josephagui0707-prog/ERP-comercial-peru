import http from 'node:http';
import https from 'node:https';
import {createReadStream,readFileSync,existsSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {createApi} from './api.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)), env=process.env;
const dev=process.argv.includes('--dev'), production=env.NODE_ENV==='production';
const host=env.HOST || '127.0.0.1', port=Number(env.PORT || 5173);
const tls=env.TLS_CERT_FILE && env.TLS_KEY_FILE;
const origin=env.APP_ORIGIN ? new URL(env.APP_ORIGIN).origin : '';
if(production && (dev || !origin.startsWith('https://'))) throw Error('Para producción usa npm start y configura APP_ORIGIN con HTTPS.');
const demo=!production && env.DEMO_MODE!=='false';
const dist=resolve(root,'dist');
if(!dev && !existsSync(resolve(dist,'index.html'))) throw Error('Falta dist. Ejecuta npm ci y npm run build.');
const api=await createApi({file:resolve(root,env.ERP_DB || (demo?'data/aula.sqlite':'data/erp.sqlite')),tenant:(env.ERP_TENANT || 'AULA').toUpperCase(),demo,adminEmail:env.ADMIN_EMAIL,adminPassword:env.ADMIN_PASSWORD,secure:Boolean(tls)||origin.startsWith('https://'),origin,apiKey:env.GEMINI_API_KEY,model:env.GEMINI_MODEL||'gemini-2.5-flash-lite'});
const types={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.ico':'image/x-icon','.gif':'image/gif','.map':'application/json'};
const server=tls?https.createServer({cert:readFileSync(env.TLS_CERT_FILE),key:readFileSync(env.TLS_KEY_FILE)}):http.createServer();
const vite=dev?await (await import('vite')).createServer({root,server:{middlewareMode:true,hmr:{server},fs:{deny:['.env','.env.*','*.{crt,pem,key,sqlite,db}','**/data/**','**/server/**']}},appType:'spa'}):null;
server.on('request',(req,res)=>{
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Permissions-Policy','geolocation=(self)');
  if(req.url.startsWith('/api/')){void api.handle(req,res);return;}
  if(vite){vite.middlewares(req,res);return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const file=resolve(dist,'.'+pathname);
  if(file!==dist && !file.startsWith(dist+sep)){res.writeHead(403).end();return;}
  const target=existsSync(file)&&statSync(file).isFile()?file:(!extname(pathname)?resolve(dist,'index.html'):null);
  if(!target){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[extname(target)]||'application/octet-stream');
  res.setHeader('Cache-Control',pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://tile.openstreetmap.org; connect-src 'self' https://api.frankfurter.dev https://date.nager.at; font-src 'self' data: https://fonts.gstatic.com; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  if(req.method==='HEAD'){res.end();return;}
  createReadStream(target).on('error',()=>res.destroy()).pipe(res);
});
server.listen(port,host,()=>console.log('ERP Comercial Perú · '+(tls?'https':'http')+'://'+(['127.0.0.1','0.0.0.0'].includes(host)?'localhost':host)+':'+port+' · '+(demo?'Aula':'Acceso privado')));
async function stop(){api.close();if(vite)await vite.close();server.close();server.closeAllConnections();}
process.once('SIGTERM',stop);process.once('SIGINT',stop);
