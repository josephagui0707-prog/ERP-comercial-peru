import {randomUUID} from 'node:crypto';
import {field, requireThat} from './shared.mjs';

const simplify = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const canTrack = role => ['admin','ventas','monitor','repartidor'].includes(role);
const canPlan = role => ['admin','ventas','repartidor'].includes(role);
const jsonModes = ['respuesta','crear_simulacion','abrir_rutas'];

/** Extrae JSON de una respuesta que puede venir envuelta en markdown ```json ... ``` */
function extractJson(raw) {
  const md = raw.match(/```json\s*([\s\S]*?)\s*```/);
  return JSON.parse(md ? md[1] : raw);
}

function simulationPlan(db, trips, actor, question) {
  requireThat(canPlan(actor.role),403,'Tu perfil solo puede observar los recorridos que te asignaron.');
  const people = trips.directory(actor);
  const select = role => {
    const eligible = people.filter(p=>p.role===role);
    if (eligible.length===1) return eligible[0];
    const matches = eligible.filter(p=>simplify(question).includes(simplify(p.name)));
    return matches.length===1 ? matches[0] : null;
  };
  const driver=select('repartidor'), viewer=select('monitor');
  if(!driver || !viewer) return {answer:'Abre Rutas y pulsa «Nueva entrega» para elegir exactamente quién reparte y quién recibe.',open:'rutas'};
  const id=randomUUID(), body={id,mode:'demo',title:'Entrega al instituto',driver:driver.id,viewer:viewer.id};
  db.prepare('DELETE FROM proposals WHERE expires<?').run(Date.now());
  db.prepare('INSERT INTO proposals VALUES(?,?,?,?,?)').run(id,actor.tenant,actor.id,JSON.stringify(body),Date.now()+5*60000);
  return {answer:'Puedo crear una entrega simulada de '+driver.name+' para '+viewer.name+'. Quedará lista para que el repartidor inicie la marcha.',proposal:{id,label:'Crear esta entrega'}};
}

function localSummary(role, raw) {
  const counts={};
  const source=raw?.counts || {};
  const permitted = [
    ...(['admin','ventas'].includes(role) ? ['openOrders','openQuotes'] : []),
    ...(['admin','almacen'].includes(role) ? ['lowStockProducts'] : []),
    ...(['admin','finanzas','ventas'].includes(role) ? ['unpaid'] : []),
  ];
  for(const key of permitted) if(Number.isSafeInteger(source[key]) && source[key]>=0) counts[key]=Math.min(1e8,source[key]);
  return counts;
}

/** Normaliza el historial multi-turno: máx 10 items recientes, solo role y parts[].text. */
function buildHistory(rawHistory) {
  if (!Array.isArray(rawHistory) || rawHistory.length===0) return [];
  return rawHistory
    .filter(h => (h.role==='user' || h.role==='model') && typeof h.text==='string' && h.text.trim())
    .slice(-10)
    .map(h => ({role: h.role, parts: [{text: h.text}]}));
}

export function assistant(db,trips,{apiKey,model,providerFetch=fetch}) {
  return {
    async ask(actor,body) {
      const question=field(body.question,'consulta',500), q=simplify(question);
      const plans=()=>simulationPlan(db,trips,actor,question);
      if(/\b(crea|crear|prepara|preparar|programa|genera)\b/.test(q) && /simula|ruta de prueba/.test(q)) return {...plans(),mode:'local'};
      const track=canTrack(actor.role);
      const list=track ? trips.list(actor) : [];
      if(track && /entrega|recorrido|ruta|viaje|repart/.test(q)) {
        const n=state=>list.filter(x=>x.status===state).length;
        return {mode:'local',open:'rutas',answer:'Tienes '+n('lista')+' entregas listas, '+n('en_ruta')+' en camino y '+n('entregada')+' entregadas. Abre Rutas para ver el mapa y reproducir el historial.'};
      }
      if(!apiKey) return {mode:'local',fallback:true};
      const counts=localSummary(actor.role,body.context);
      const tools=['respuesta',...(track?['abrir_rutas']:[]),...(canPlan(actor.role)?['crear_simulacion']:[])];
      const system=
        'Eres el asistente de un ERP comercial peruano. Contesta brevemente en español. ' +
        'Puedes responder sobre facturación electrónica, SUNAT e IGV peruano (18%), comprobantes de pago, ' +
        'regímenes tributarios (RER, RMT, régimen general), procesos de compras, cuentas por pagar, ' +
        'finanzas, flujo de caja y proporcionar guía paso a paso cuando se te solicite. ' +
        'Las cifras de indicadores son locales y agregadas; usa solo las cifras provistas. ' +
        'Devuelve JSON con los campos "answer" e "intent". ' +
        'Intenciones autorizadas: '+tools.join(', ')+'. ' +
        'Solo propone crear_simulacion si la persona pide expresamente crear una entrega simulada. ' +
        'Nunca afirmes que una operación ya se ejecutó, ni inventes datos. Los cambios requieren confirmación del usuario.';
      const history=buildHistory(body.history);
      const userMessage={role:'user',parts:[{text:JSON.stringify({pregunta:question,rol:actor.role,indicadores:counts})}]};
      const contents=[...history, userMessage];
      try {
        const result=await providerFetch(
          'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',
          {
            method:'POST',
            headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
            signal:AbortSignal.timeout(10000),
            body:JSON.stringify({
              systemInstruction:{parts:[{text:system}]},
              contents,
              generationConfig:{temperature:0.1,maxOutputTokens:600,responseMimeType:'application/json'},
            }),
          }
        );
        if(!result.ok) throw Object.assign(new Error('HTTP '+result.status), {code:'HTTP_'+result.status});
        const data=await result.json();
        const rawText=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
        const response=extractJson(rawText);
        if(!jsonModes.includes(response.intent) || !tools.includes(response.intent)) throw Object.assign(new Error('intent no autorizado: '+response.intent),{code:'INVALID_INTENT'});
        if(response.intent==='crear_simulacion') return {...plans(),mode:'gemini'};
        return {answer:field(response.answer,'respuesta',1800),mode:'gemini',...(response.intent==='abrir_rutas'?{open:'rutas'}:{})};
      } catch(error) {
        console.error('[assistant]', error.message || error.code);
        return {mode:'local',fallback:true,providerUnavailable:true};
      }
    },
    confirm(actor,id) {
      const p=db.prepare('SELECT * FROM proposals WHERE id=? AND actor=? AND tenant=?').get(id,actor.id,actor.tenant);
      requireThat(p && p.expires>Date.now(),409,'La propuesta ha caducado o pertenece a otra cuenta. Solicita una nueva.');
      // The proposal ID is the trip ID. A retry returns the same authorized trip.
      return trips.create(actor,JSON.parse(p.body),true);
    }
  };
}
