/** Intenciones deterministas: trabajan con el estado REAL del navegador, sin inventar IA. */
import type {Role,State} from './types';
import {money,sumItems,today} from './types';
import {allowed} from './permissions';
import {dueOn,stockOf} from './operations';

export type LocalProposal=
 |{type:'quote';clientId:string;productId:string;qty:number;label:string}
 |{type:'client';name:string;document:string;email:string;label:string}
 |{type:'product';name:string;sku:string;price:number;cost:number;category:string;label:string};
export type LocalReply={answer:string;open?:string;proposal?:LocalProposal};
const plain=(t:string)=>t.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const can=(role:Role,path:string)=>allowed(role,path);
const link=(role:Role,path:string,answer:string):LocalReply=>can(role,path.split('?')[0])?{answer,open:path}:{answer:'Tu perfil no tiene acceso a ese módulo. Pide ayuda a un administrador.'};
const best=(entries:string[])=>entries.join('\n');
export function interpretLocal(input:string,s:State,role:Role):LocalReply|null{
 const q=plain(input);
 const quoteText=input.match(/^(?:cotiza|cotizar|prepara cotizacion)\s+(\d+)\s+([a-z0-9_-]+)\s+(?:para|a)\s+(cli-[a-z0-9-]+)\s*$/i);
 if(quoteText){
  if(!can(role,'cotizaciones'))return {answer:'Tu rol no puede crear cotizaciones.'};
  const qty=Number(quoteText[1]),product=s.products.find(p=>p.active&&!p.archivedAt&&(p.sku.toLowerCase()===quoteText[2].toLowerCase()||p.id.toLowerCase()===quoteText[2].toLowerCase()));
  const client=s.clients.find(c=>c.active&&c.id.toLowerCase()===quoteText[3].toLowerCase());
  if(!product||!client)return {answer:'No encontré el SKU o el cliente. Revisa sus códigos en Productos y Clientes. Ejemplo: cotiza 2 EC-0001 para CLI-001.'};
  if(!Number.isSafeInteger(qty)||qty<1||qty>100000)return {answer:'La cantidad debe ser un entero entre 1 y 100 000.'};
  return {answer:`Preparé una cotización para ${client.name}: ${qty} × ${product.name}, total ${money(qty*product.price)} (precio con IGV). Confirma para guardarla como borrador; todavía no se ha creado.`,proposal:{type:'quote',clientId:client.id,productId:product.id,qty,label:'Confirmar cotización'}};
 }
 const newClient=input.match(/^(?:crear|registrar)\s+cliente\s*:\s*([^|]+)\|\s*([0-9]{11}|[0-9]{8})\s*(?:\|\s*([^|]+))?\s*$/i);
 if(newClient){
  if(!can(role,'clientes'))return {answer:'Tu perfil no puede registrar clientes.'};
  const name=newClient[1].trim(),document=newClient[2],email=(newClient[3]||'').trim();
  if(name.length<2||email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {answer:'Nombre o correo incorrectos. Ejemplo: registrar cliente: Comercial Aurora SAC | 20123456789 | ventas@aurora.pe'};
  if(s.clients.some(c=>c.document===document))return {answer:'Ese documento ya existe en Clientes. No creé un duplicado.'};
  return {answer:`Cliente listo para registrar: ${name}, documento ${document}${email?', correo '+email:''}. Confirma para guardarlo.`,proposal:{type:'client',name,document,email,label:'Registrar cliente'}};
 }
 const newProduct=input.match(/^(?:crear|registrar)\s+producto\s*:\s*([^|]+)\|\s*([^|]+)\|\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*\|\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*\|\s*([^|]+)\s*$/i);
 if(newProduct){
  if(!can(role,'productos'))return {answer:'Tu perfil no puede crear productos.'};
  const name=newProduct[1].trim(),sku=newProduct[2].trim().toUpperCase(),price=Number(newProduct[3].replace(',','.')),cost=Number(newProduct[4].replace(',','.'));
  const category=s.categories?.find(c=>plain(c)===plain(newProduct[5]))||s.products.find(p=>plain(p.category)===plain(newProduct[5]))?.category;
  if(!category||!name||!sku||s.products.some(p=>p.sku.toLowerCase()===sku.toLowerCase()))return {answer:'Revisa el nombre, el SKU único y una categoría existente en Datos maestros. No se guardó nada.'};
  return {answer:`Producto preparado: ${name} (${sku}), precio ${money(price)}, costo ${money(cost)}, categoría ${category}. Se registrará con stock inicial 0 para no inventar entradas.`,proposal:{type:'product',name,sku,price,cost,category,label:'Registrar producto'}};
 }
 if(/ayuda|que puedes hacer|como funciona|ejemplos|comandos/.test(q))return {answer:'Puedo consultar ventas, saldos, stock, pedidos y cotizaciones; abrir formularios; y registrar datos con tu confirmación.\n\nPrueba estos ejemplos:\n• "ventas de hoy"\n• "productos con poco stock"\n• "cotiza 2 EC-0001 para CLI-001"\n• "registrar cliente: Comercial Aurora SAC | 20123456789 | ventas@aurora.pe"\n• "registrar producto: Mouse óptico | MOU-100 | 45 | 25 | Periféricos"\n• "crear una cotización"\n• "crear entrega simulada".\n\nLas acciones no se guardan hasta que las confirmes.'};
 if(/(?:nueva|crear|crea|hacer|preparar|prepara|registrar|registra|abrir|abre)\s+(?:una?\s+)?cotiz/.test(q))return link(role,'cotizaciones?crear=1','Te llevo al editor de cotizaciones. Selecciona un cliente, añade productos, revisa IGV y guarda el borrador. También puedo prepararla si escribes "cotiza 2 EC-0001 para CLI-001".');
 if(/(?:nueva|crear|crea|registrar|registra|abrir|abre)\s+(?:una?\s+)?(?:cliente|contacto)/.test(q))return link(role,'clientes','Abre Clientes: allí puedes registrar o editar clientes. También puedo hacerlo por aquí con "registrar cliente: Nombre | RUC | correo".');
 if(/(?:nuevo|crear|crea|registrar|registra|abrir|abre)\s+(?:un\s+)?producto/.test(q))return link(role,'productos','Te llevo al catálogo. Pulsa Nuevo producto o usa "registrar producto: Nombre | SKU | Precio | Costo | Categoría". Después registra su entrada de stock.');
 if(/(?:nueva|crear|crea|abrir|abre)\s+(?:una?\s+)?(?:pedido|orden de venta)/.test(q))return link(role,'pedidos','Abre Pedidos para registrar uno o convertir una cotización aprobada.');
 if(/(?:nueva|crear|crea|abrir|abre)\s+(?:una?\s+)?(?:venta|comprobante|factura|boleta)/.test(q))return link(role,'ventas','Abre Ventas; allí puedes usar un pedido preparado y emitir su comprobante simulado.');
 if(/(?:nueva|crear|crea|abrir|abre)\s+(?:una?\s+)?(?:ruta|entrega)/.test(q)&&!/simula/.test(q))return link(role,'rutas','En Rutas puedes crear una entrega, seleccionar repartidor y monitor, y elegir exactamente los puntos A (origen) y B (destino).');
 if(/(?:como|pasos|flujo|proceso).*(?:cotiz|pedido|venta|factur|cobro)/.test(q))return {answer:'Flujo comercial sugerido:\n1. Registra cliente y productos en Datos maestros.\n2. Crea una cotización y apruébala.\n3. Conviértela en pedido, confirma y prepara.\n4. Registra venta usando el almacén de salida (descuenta stock una vez).\n5. Emite el comprobante simulado y registra el cobro.\n6. Para distribución, crea una entrega relacionada con el pedido.\nCada paso conserva el vínculo con el documento anterior.',open:can(role,'cotizaciones')?'cotizaciones':undefined};
 if(/stock|existencia|inventario|agotad|repon/.test(q)&&can(role,'stock')){
  const found=s.products.filter(p=>p.active&&!p.archivedAt).map(p=>({...p,units:stockOf(s,p.id)})).sort((a,b)=>a.units-b.units);
  if(/(?:de|sku)\s+([a-z]{1,4}-\d{2,6})/.test(q)){
   const id=q.match(/(?:de|sku)\s+([a-z]{1,4}-\d{2,6})/)?.[1]||'';
   const p=found.find(x=>plain(x.sku)===id||plain(x.id)===id);
   if(p)return link(role,'stock',`${p.name} (${p.sku}) tiene ${p.units} unidades en todos los almacenes. Mínimo recomendado: ${p.min}.`);
  }
  const lows=found.filter(p=>p.units<=p.min),sample=(lows.length?lows:found).slice(0,5);
  return link(role,'stock',`${lows.length} productos están en su mínimo o por debajo. ${lows.length?'Los más urgentes:':'Los de menor stock actualmente:'}\n${best(sample.map(p=>`• ${p.name}: ${p.units} uds. (mín. ${p.min})`))||'Aún no hay productos.'}`);
 }
 if(/(?:cotiz|propuesta)/.test(q)&&can(role,'cotizaciones')){
  const pending=s.quotes.filter(x=>['borrador','aprobada'].includes(x.status));
  return link(role,'cotizaciones',`Hay ${pending.length} cotizaciones abiertas: ${s.quotes.filter(x=>x.status==='borrador').length} borradores y ${s.quotes.filter(x=>x.status==='aprobada').length} aprobadas.\n${best(pending.slice(0,3).map(x=>`• ${x.id}: ${money(sumItems(x.items))} (${x.status})`))}`);
 }
 if(/(?:pedido|ordenes)/.test(q)&&can(role,'pedidos')){
  const id=q.match(/ped-[a-z0-9-]+/)?.[0];const record=id&&s.orders.find(x=>plain(x.id)===id);
  if(record)return link(role,'pedidos',`${record.id}: ${record.status}. Cliente: ${s.clients.find(c=>c.id===record.clientId)?.name||record.clientId}. Importe: ${money(sumItems(record.items))}.`);
  const active=s.orders.filter(x=>!['completado','cancelado'].includes(x.status));
  return link(role,'pedidos',`${active.length} pedidos activos: ${s.orders.filter(x=>x.status==='pendiente').length} pendientes, ${s.orders.filter(x=>x.status==='confirmado').length} confirmados y ${s.orders.filter(x=>x.status==='preparando').length} preparando.`);
 }
 if(/(?:saldo|cobr|deuda|cuentas por cobrar)/.test(q)&&(can(role,'cobros')||can(role,'cxc'))){
  const open=s.sales.filter(v=>v.status==='vigente'&&dueOn(s,v)>0);
  return link(role,can(role,'cobros')?'cobros':'cxc',`Saldo pendiente: ${money(open.reduce((total,v)=>total+dueOn(s,v),0))} correspondiente a ${open.length} ventas.\n${best(open.slice(0,3).map(v=>`• ${v.id}: ${money(dueOn(s,v))}`))}`);
 }
 if(/(?:venta|factur|vendid|cuanto vend)/.test(q)&&(can(role,'ventas')||can(role,'finanzas'))){
  const all=s.sales.filter(x=>x.status==='vigente');
  const selected=/(hoy|dia)/.test(q)?all.filter(x=>x.date===today()):/(mes|mensual)/.test(q)?all.filter(x=>x.date.slice(0,7)===today().slice(0,7)):all;
  return {answer:`${/(hoy|dia)/.test(q)?'Hoy':/(mes|mensual)/.test(q)?'Este mes':'Acumulado histórico'}: ${selected.length} ventas vigentes, total ${money(selected.reduce((a,v)=>a+sumItems(v.items),0))}. Los importes son del navegador actual; no son declaraciones SUNAT.`,open:can(role,'ventas')?'ventas':'finanzas'};
 }
 if(/(?:clientes|cuantos clientes)/.test(q)&&can(role,'clientes'))return link(role,'clientes',`Tienes ${s.clients.filter(c=>c.active).length} clientes activos de ${s.clients.length} registrados.`);
 if(/(?:catalogo|productos|cuantos productos)/.test(q)&&can(role,'productos'))return link(role,'productos',`Catálogo: ${s.products.filter(p=>p.active).length} productos activos. Puedes filtrar por nombre, categoría o SKU.`);
 if(/(?:dashboard|inicio|resumen general)/.test(q)&&can(role,'inicio'))return link(role,'inicio',`Resumen: ${s.clients.length} clientes, ${s.products.length} productos, ${s.quotes.length} cotizaciones, ${s.orders.length} pedidos y ${s.sales.length} ventas.`);
 return null;
}
