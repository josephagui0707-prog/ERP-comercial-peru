import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assistant} from '../assistant.mjs';
const actor={id:'abc',tenant:'AULA',role:'finanzas'};
const input={question:'Resume los indicadores de mi área',context:{counts:{unpaid:3,openOrders:9,lowStockProducts:2},clients:['Nombre privado'],positions:[{lat:1,lng:1}]}};
test('el conector Gemini envía únicamente la pregunta, el rol y los indicadores permitidos',async()=>{
  let payload;
  const providerFetch=async(url,options)=>{
    assert.match(url,/models\/modelo-test:generateContent$/);assert.equal(options.headers['x-goog-api-key'],'solo-test');
    payload=JSON.parse(options.body);return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({answer:'Hay tres ventas con saldo.',intent:'respuesta'})}]}}]});
  };
  const a=assistant(null,null,{apiKey:'solo-test',model:'modelo-test',providerFetch});
  const result=await a.ask(actor,input);
  // Sin historial, contents tiene un solo elemento (la pregunta actual)
  assert.deepEqual(JSON.parse(payload.contents[payload.contents.length-1].parts[0].text),{pregunta:input.question,rol:'finanzas',indicadores:{unpaid:3}});
  assert.equal(result.mode,'gemini');assert.match(result.answer,/tres/);
});
test('un fallo del proveedor o una herramienta no autorizada conservan la guía local',async()=>{
  for(const providerFetch of [async()=>new Response('',{status:503}),async()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify({answer:'ok',intent:'crear_simulacion'})}]}}]})]){
    const a=assistant(null,null,{apiKey:'solo-test',model:'modelo-test',providerFetch});
    const r=await a.ask(actor,input);assert.equal(r.mode,'local');assert.equal(r.fallback,true);assert.equal(r.proposal,undefined);
  }
});
test('el historial multi-turno se transmite a Gemini correctamente (máx 10, solo role y parts)',async()=>{
  let payload;
  const providerFetch=async(_url,options)=>{
    payload=JSON.parse(options.body);
    return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({answer:'Resumen correcto.',intent:'respuesta'})}]}}]});
  };
  // Genera 12 turnos de historial; solo deben enviarse los 10 más recientes
  const history=Array.from({length:12},(_,i)=>({role:i%2===0?'user':'model',text:'Mensaje '+(i+1),extra:'campo-no-permitido'}));
  const a=assistant(null,null,{apiKey:'solo-test',model:'modelo-test',providerFetch});
  await a.ask(actor,{...input,history});
  // contents = historial (10) + pregunta actual (1) = 11
  assert.equal(payload.contents.length,11,'Deben enviarse 10 turnos de historia más la pregunta actual');
  // Los 10 primeros son el historial filtrado
  for(const turn of payload.contents.slice(0,10)){
    assert.ok(turn.role==='user'||turn.role==='model','role debe ser user o model');
    assert.ok(Array.isArray(turn.parts)&&typeof turn.parts[0].text==='string','parts debe contener texto');
    assert.equal(turn.extra,undefined,'No deben filtrarse campos extra como "extra"');
  }
  // Verifica que son los 10 últimos (índ. 2–11 del original: "Mensaje 3" a "Mensaje 12")
  assert.equal(payload.contents[0].parts[0].text,'Mensaje 3');
  assert.equal(payload.contents[9].parts[0].text,'Mensaje 12');
});
