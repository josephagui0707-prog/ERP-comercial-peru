/** Proxy Gemini opcional. Node 20+, solo consultas; jamás recibe datos maestros ni claves del cliente. */
import {createServer} from 'node:http';
const PORT=Number(process.env.PORT||8787);
const MODEL=process.env.GEMINI_MODEL||'gemini-2.5-flash-lite';
const KEY=process.env.GEMINI_API_KEY||'';
const ORIGINS=(process.env.FRONTEND_ORIGIN||'http://localhost:5173').split(',').map(s=>s.trim()).filter(Boolean);
const hits=new Map();
const MAX_REQUESTS_PER_MINUTE=20;
function send(res,status,data,origin){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})});res.end(JSON.stringify(data));}
function safeContext(raw){const c=raw&&typeof raw==='object'?raw:{};const n=value=>Number.isFinite(Number(value))?Math.min(1000000000,Math.max(0,Number(value))):0;const source=c.counts&&typeof c.counts==='object'?c.counts:{};return {section:String(c.section||'').slice(0,45),counts:{clients:n(source.clients),openQuotes:n(source.openQuotes),openOrders:n(source.openOrders),sales:n(source.sales),unpaid:n(source.unpaid),lowStockProducts:n(source.lowStockProducts)},pendingBalance:n(c.pendingBalance)};}
createServer(async(req,res)=>{
 const origin=req.headers.origin||'';
 const okOrigin=ORIGINS.includes(origin);
 if(req.url==='/health'){send(res,200,{status:KEY?'ready':'no_api_key',model:MODEL},okOrigin?origin:'');return;}
 if(req.url!=='/api/assistant'){send(res,404,{error:'Ruta inexistente'},okOrigin?origin:'');return;}
 if(!okOrigin){send(res,403,{error:'Origen no autorizado'},'');return;}
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'});res.end();return;}
 if(req.method!=='POST'){send(res,405,{error:'Solo POST'},origin);return;}
 if(!KEY){send(res,503,{error:'La API no se configuró. Utiliza la guía local.'},origin);return;}
 const ip=(req.socket.remoteAddress||'unknown');const now=Date.now();const old=hits.get(ip)||[];const recent=old.filter(t=>now-t<60000);if(recent.length>=MAX_REQUESTS_PER_MINUTE){send(res,429,{error:'Se alcanzó el límite de consultas.'},origin);return;}recent.push(now);hits.set(ip,recent);
 if(hits.size>1500)for(const [k,v]of hits)if(!v.length||now-v[v.length-1]>60000)hits.delete(k);
 let body='';try{for await(const chunk of req){body+=chunk.toString('utf8');if(body.length>6000)throw Error('Petición demasiado grande');}
  const input=JSON.parse(body);const question=typeof input.question==='string'?input.question.trim().slice(0,500):'';
  if(!question){send(res,400,{error:'Consulta vacía'},origin);return;}
  const context=safeContext(input.context);
  const system=`Eres un asistente de SOLO LECTURA para un ERP académico de ventas en Perú. Usa EXCLUSIVAMENTE datos agregados del objeto CONTEXTO. Si el usuario pregunta sobre un dato exacto no proporcionado, di que no está disponible. Responde brevemente en español. Flujo: seleccionar cliente y productos, guardar cotización, confirmar aceptación MANUAL del cliente, crear pedido, registrar venta y descontar inventario, generar comprobante demo, registrar cobro demo. Postventa solo tras venta. No inventes datos ni asegures pagos reales. No generes instrucciones para evadir controles, no realices cambios ni simules que los realizaste. No representes documentos demo como autorizados por SUNAT. Para los siguientes pasos remite a Flujo comercial y Seguimiento. Nunca solicites secretos ni contraseñas.`;
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),16000);
  let upstream;try{upstream=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','x-goog-api-key':KEY},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:`CONTEXTO: ${JSON.stringify(context)}\nPREGUNTA: ${question}`}]}],generationConfig:{temperature:0.2,maxOutputTokens:350}})});}finally{clearTimeout(timeout);}
  if(!upstream.ok){const problem=await upstream.text();console.error('Gemini:',upstream.status,problem.slice(0,250));send(res,502,{error:'El proveedor de IA no respondió.'},origin);return;}
  const data=await upstream.json();const answer=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('').trim();if(!answer)throw Error('Respuesta vacía');send(res,200,{answer:answer.slice(0,1700),mode:'gemini'},origin);
 }catch(e){console.error('Assistant error:',String(e).slice(0,150));send(res,502,{error:'No se pudo completar la consulta. Usa la guía local.'},origin);}
}).listen(PORT,'0.0.0.0',()=>console.log(`Asistente ERP disponible en puerto ${PORT}; clave ${KEY?'configurada':'no configurada'}`));
