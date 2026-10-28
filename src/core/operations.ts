import type {State,Item,Sale,TipoComprobante} from './types';
import {sumItems,today,uid,calcBase,calcIGV} from './types';
export const clone=(s:State):State=>structuredClone(s);
export const stockOf=(s:State,productId:string,warehouseId?:string)=>s.inventory.filter(x=>x.productId===productId&&(!warehouseId||x.warehouseId===warehouseId)).reduce((a,b)=>a+b.quantity,0);
export const paidOn=(s:State,saleId:string)=>Math.round(s.payments.filter(p=>p.saleId===saleId&&p.status==='aprobado').reduce((a,p)=>a+p.amount,0)*100)/100;
export const refundedOn=(s:State,saleId:string)=>Math.round(s.returns.filter(r=>r.saleId===saleId).reduce((a,r)=>a+r.amount,0)*100)/100;
export const dueOn=(s:State,sale:Sale)=>Math.max(0,Math.round((sumItems(sale.items)-paidOn(s,sale.id)-refundedOn(s,sale.id))*100)/100);
const log=(s:State,action:string,description:string)=>s.audit.unshift({id:uid('AUD'),date:today(),action,description});
/** Reglas compartidas en el núcleo. La interfaz no debe ser la única barrera de validación. */
export function validateCommercialItems(s:State,items:Item[]):void{
 if(!Array.isArray(items)||items.length===0)throw Error('Agrega al menos un producto.');
 const seen=new Set<string>();
 for(const item of items){
  const p=s.products.find(p=>p.id===item.productId&&p.active&&!p.archivedAt);
  if(!p)throw Error('El producto seleccionado no está activo.');
  if(seen.has(item.productId))throw Error(`El producto ${p.name} está repetido: utiliza una sola línea por producto.`);
  seen.add(item.productId);
  if(!Number.isInteger(item.qty)||item.qty<=0)throw Error('La cantidad debe ser un número entero mayor que cero.');
  if(!Number.isFinite(item.price)||item.price<0)throw Error('El precio debe ser un número válido y no negativo.');
  if(!Number.isFinite(item.discount)||item.discount<0||item.discount>100)throw Error('El descuento debe estar entre 0 y 100 %.');
 }
 if(sumItems(items)<=0)throw Error('El documento debe tener un importe total mayor que cero.');
}
const sameLines=(a:Item[],b:Item[])=>a.length===b.length&&a.every((x,i)=>{const y=b[i];return x.productId===y.productId&&x.qty===y.qty&&x.price===y.price&&x.discount===y.discount;});
const getActiveClient=(s:State,id:string)=>{if(!s.clients.some(c=>c.id===id&&c.active))throw Error('Selecciona un cliente activo.');};

export function approveQuote(state:State,quoteId:string):State{
 const s=clone(state);const q=s.quotes.find(q=>q.id===quoteId);
 if(!q||q.status!=='borrador')throw Error('Solo puedes aprobar cotizaciones en borrador.');
 validateCommercialItems(s,q.items);getActiveClient(s,q.clientId);
 q.status='aprobada';log(s,'Cotización aprobada',quoteId);return s;
}
export function rejectQuote(state:State,quoteId:string):State{
 const s=clone(state);const q=s.quotes.find(q=>q.id===quoteId);
 if(!q||q.status!=='borrador')throw Error('Solo puedes rechazar cotizaciones en borrador.');
 q.status='rechazada';log(s,'Cotización rechazada',quoteId);return s;
}
export function advanceOrder(state:State,orderId:string,nextStatus:'confirmado'|'preparando'|'cancelado'):State{
 const s=clone(state);const order=s.orders.find(o=>o.id===orderId);
 if(!order)throw Error('Pedido no encontrado.');
 const allowed:Record<'pendiente'|'confirmado'|'preparando'|'completado'|'cancelado',string[]>={pendiente:['confirmado','cancelado'],confirmado:['preparando','cancelado'],preparando:['cancelado'],completado:[],cancelado:[]};
 if(!allowed[order.status].includes(nextStatus))throw Error(`No se puede cambiar un pedido ${order.status} a ${nextStatus}.`);
 order.status=nextStatus;log(s,'Estado de pedido',`${order.id}: ${nextStatus}`);return s;
}
export function createQuote(state:State,clientId:string,items:Item[]):State{
 const s=clone(state);getActiveClient(s,clientId);validateCommercialItems(s,items);
 const id=uid('COT');s.quotes.unshift({id,clientId,items:items.map(i=>({...i})),status:'borrador',date:today()});log(s,'Cotización creada',id);return s;
}
export function createOrder(state:State,clientId:string,items:Item[],quoteId?:string):State{
 const s=clone(state);getActiveClient(s,clientId);validateCommercialItems(s,items);
 if(quoteId){
  const q=s.quotes.find(q=>q.id===quoteId);
  if(!q||q.status!=='aprobada')throw Error('La cotización debe estar aprobada y disponible.');
  if(q.orderId||s.orders.some(o=>o.quoteId===quoteId))throw Error('Esta cotización ya tiene un pedido vinculado.');
  if(q.clientId!==clientId||!sameLines(q.items,items))throw Error('El pedido debe conservar el cliente, cantidades, precios y descuentos de la cotización.');
 }
 const id=uid('PED');s.orders.unshift({id,clientId,items:items.map(i=>({...i})),status:'pendiente',date:today(),quoteId});
 if(quoteId){const q=s.quotes.find(x=>x.id===quoteId)!;q.status='convertida';q.orderId=id;}
 log(s,'Pedido creado',id);return s;
}
export function createSale(state:State,clientId:string,items:Item[],warehouseId:string,orderId?:string,comprobanteData?:{tipoComprobante:TipoComprobante;compradorNombre:string;compradorDoc:string;compradorTipoDoc:'RUC'|'DNI'|'CE'|'PASAPORTE'|'-';compradorDireccion?:string},emitirAlVender=true):State{
 const s=clone(state);getActiveClient(s,clientId);validateCommercialItems(s,items);
 if(orderId){
  const origin=s.orders.find(o=>o.id===orderId);
  if(!origin||origin.status!=='preparando')throw Error('El pedido debe estar en estado preparando antes de vender.');
  if(origin.clientId!==clientId||!sameLines(origin.items,items))throw Error('La venta debe conservar el cliente y todas las líneas del pedido.');
  if(origin.saleId||s.sales.some(x=>x.orderId===orderId&&x.status==='vigente'))throw Error('Este pedido ya tiene una venta vinculada.');
 }
 if(!s.warehouses.some(w=>w.id===warehouseId&&(!w.status||w.status==='Activo')))throw Error('Selecciona un almacén activo.');
 for(const i of items)if(stockOf(s,i.productId,warehouseId)<i.qty)throw Error(`Stock insuficiente: ${s.products.find(x=>x.id===i.productId)?.name}.`);
 const client=s.clients.find(c=>c.id===clientId)!;
 const tipoComprobante=comprobanteData?.tipoComprobante||'boleta';
 const compradorNombre=comprobanteData?.compradorNombre?.trim()||client.name;
 const compradorDoc=(comprobanteData?.compradorDoc||client.document||'').trim();
 const compradorTipoDoc=comprobanteData?.compradorTipoDoc||(compradorDoc.length===11?'RUC':compradorDoc.length===8?'DNI':'-');
 const compradorDireccion=comprobanteData?.compradorDireccion;
 const total=sumItems(items);
 if(emitirAlVender&&tipoComprobante==='factura'&&(compradorTipoDoc!=='RUC'||!/^\d{11}$/.test(compradorDoc)))throw Error('La factura requiere un RUC de 11 dígitos.');
 if(emitirAlVender&&tipoComprobante==='boleta'&&total>700&&!(compradorTipoDoc==='DNI'&&/^\d{8}$/.test(compradorDoc)||compradorTipoDoc==='RUC'&&/^\d{11}$/.test(compradorDoc)))throw Error('La boleta mayor a S/ 700 requiere DNI de 8 dígitos o RUC de 11 dígitos.');
 const serie=emitirAlVender?(tipoComprobante==='factura'?'F001':'B001'):'';
 // El mayor número histórico se mantiene aunque existan comprobantes anulados.
 const correlativo=emitirAlVender?Math.max(0,...s.sales.filter(v=>v.serie===serie).map(v=>v.correlativo||0))+1:0;
 const baseImponible=calcBase(total),igv=calcIGV(total);
 const id=uid('VEN'),date=today();s.sales.unshift({id,clientId,items:items.map(x=>({...x})),warehouseId,date,status:'vigente',orderId,paymentMethod:'Pendiente',tipoComprobante,serie,correlativo,compradorNombre,compradorDoc,compradorTipoDoc,compradorDireccion,comprobanteEmitido:emitirAlVender,fechaEmision:emitirAlVender?date:undefined,igv,baseImponible,total});
 for(const i of items){const stock=s.inventory.find(x=>x.productId===i.productId&&x.warehouseId===warehouseId)!;stock.quantity-=i.qty;s.movements.unshift({id:uid('MOV'),date,productId:i.productId,warehouseId,qty:-i.qty,type:'Venta',reason:'Salida por venta',reference:id});}
 if(orderId){const order=s.orders.find(o=>o.id===orderId)!;order.status='completado';order.saleId=id;}
 log(s,'Venta',`${id}: ${total.toFixed(2)} PEN`);return s;
}
/** Compatibilidad: los comprobantes antiguos son válidos si conservan serie y correlativo. */
export const hasVoucher=(sale:Sale):boolean=>typeof sale.serie==='string'&&/^[BF]\d{3}$/.test(sale.serie)&&Number.isInteger(sale.correlativo)&&sale.correlativo>0;
/** El stock y la venta se registran primero. El comprobante se emite explícitamente después. */
export const createSalePending=(state:State,clientId:string,items:Item[],warehouseId:string,orderId?:string):State=>
 createSale(state,clientId,items,warehouseId,orderId,undefined,false);
export type VoucherInput={tipoComprobante:TipoComprobante;compradorNombre:string;compradorDoc:string;compradorTipoDoc:'RUC'|'DNI'|'CE'|'PASAPORTE'|'-';compradorDireccion?:string};
export function issueVoucher(state:State,saleId:string,input:VoucherInput):State{
 const s=clone(state);const sale=s.sales.find(v=>v.id===saleId&&v.status==='vigente');
 if(!sale)throw Error('Selecciona una venta vigente.');
 if(hasVoucher(sale))throw Error('Esta venta ya tiene un comprobante. No se puede emitir dos veces.');
 const total=sumItems(sale.items);const name=input.compradorNombre.trim(),doc=input.compradorDoc.trim();
 if(!name)throw Error('Indica el nombre o razón social del comprador.');
 const docRules:Record<string,RegExp>={DNI:/^\d{8}$/,RUC:/^\d{11}$/};
 if(input.compradorTipoDoc!=='-'&&!doc)throw Error('Indica el número de documento o elige «Sin documento».');
 if(docRules[input.compradorTipoDoc]&&!docRules[input.compradorTipoDoc].test(doc))throw Error(`El ${input.compradorTipoDoc} no tiene un formato válido.`);
 if(input.tipoComprobante==='factura'&&(input.compradorTipoDoc!=='RUC'||!/^\d{11}$/.test(doc)))throw Error('La factura exige un RUC de 11 dígitos.');
 if(input.tipoComprobante==='boleta'&&total>700&&!((input.compradorTipoDoc==='DNI'&&/^\d{8}$/.test(doc))||(input.compradorTipoDoc==='RUC'&&/^\d{11}$/.test(doc))))throw Error('La boleta mayor de S/ 700 requiere DNI de 8 dígitos o RUC de 11 dígitos.');
 const serie=input.tipoComprobante==='factura'?'F001':'B001';
 const correlativo=Math.max(0,...s.sales.filter(v=>v.serie===serie).map(v=>Number.isInteger(v.correlativo)?v.correlativo:0))+1;
 Object.assign(sale,{tipoComprobante:input.tipoComprobante,serie,correlativo,compradorNombre:name,compradorDoc:doc,compradorTipoDoc:input.compradorTipoDoc,compradorDireccion:input.compradorDireccion,comprobanteEmitido:true,fechaEmision:today(),igv:calcIGV(total),baseImponible:calcBase(total),total});
 log(s,'Comprobante emitido',`${serie}-${String(correlativo).padStart(8,'0')} para venta ${saleId}`);
 return s;
}
export function recordPayment(state:State,saleId:string,amount:number,method:string,result:'aprobado'|'rechazado'|'cancelado'):State{
 const s=clone(state);const sale=s.sales.find(x=>x.id===saleId&&x.status==='vigente');if(!sale)throw Error('Venta no disponible.');if(!hasVoucher(sale))throw Error('Primero emite el comprobante de la venta antes de registrar cobros.');const due=dueOn(s,sale);if(!Number.isFinite(amount)||amount<=0||amount>due+0.001)throw Error('El importe debe ser positivo y no exceder el saldo pendiente.');
 const id=uid('PAG');s.payments.unshift({id,saleId,amount,date:today(),method,status:result,reference:`SIM-${id}`});if(result==='aprobado')sale.paymentMethod=method;log(s,'Pago',`${id} ${result}: ${amount} PEN`);return s;
}
/** Dinero que la empresa debe devolver: lo cobrado más las devoluciones, menos el total vendido y lo ya reembolsado. */
export const refundedCash=(s:State,saleId:string)=>Math.round(s.expenses.filter(e=>e.source===`reembolso:${saleId}`).reduce((a,e)=>a+e.amount,0)*100)/100;
export const refundPendingOn=(s:State,sale:Sale)=>Math.max(0,Math.round((paidOn(s,sale.id)+refundedOn(s,sale.id)-sumItems(sale.items)-refundedCash(s,sale.id))*100)/100);
/** Registra la salida de dinero hacia el cliente como egreso de caja trazable a la venta. */
export function refundCustomer(state:State,saleId:string,amount:number,method:string):State{
 const s=clone(state);const sale=s.sales.find(x=>x.id===saleId&&x.status==='vigente');if(!sale)throw Error('Venta no disponible.');
 const pending=refundPendingOn(s,sale);
 if(!Number.isFinite(amount)||amount<=0||amount>pending+0.001)throw Error('El reembolso debe ser positivo y no exceder el monto pendiente.');
 if(!method.trim())throw Error('Indica el medio de reembolso.');
 const id=uid('EGR');s.expenses.unshift({id,date:today(),amount,type:'egreso',category:'Reembolso a cliente',description:`Reembolso de ${saleId} (${method})`,source:`reembolso:${saleId}`});
 log(s,'Reembolso',`${id}: ${amount.toFixed(2)} PEN a cliente por ${saleId}`);return s;
}
export function transfer(state:State,productId:string,from:string,to:string,qty:number):State{const s=clone(state);if(from===to||!Number.isInteger(qty)||qty<=0)throw Error('Transferencia inválida.');if(stockOf(s,productId,from)<qty)throw Error('No hay existencias suficientes en el origen.');const a=s.inventory.find(x=>x.productId===productId&&x.warehouseId===from),b=s.inventory.find(x=>x.productId===productId&&x.warehouseId===to);if(!a||!b)throw Error('Almacén/producto no encontrado.');const ref=uid('TRF');a.quantity-=qty;b.quantity+=qty;for(const [wh,num] of [[from,-qty],[to,qty]] as const){s.movements.unshift({id:uid('MOV'),date:today(),productId,warehouseId:wh,qty:num,type:'Transferencia',reason:'Traslado entre almacenes',reference:ref});}log(s,'Transferencia',ref);return s;}
export function adjustStock(state:State,productId:string,warehouseId:string,target:number,reason:string):State{const s=clone(state);if(!Number.isInteger(target)||target<0||!reason.trim())throw Error('Indica un saldo no negativo y un motivo.');const stock=s.inventory.find(x=>x.productId===productId&&x.warehouseId===warehouseId);if(!stock)throw Error('No existe este stock.');const diff=target-stock.quantity;stock.quantity=target;if(diff)s.movements.unshift({id:uid('MOV'),date:today(),productId,warehouseId,qty:diff,type:'Ajuste',reason,reference:uid('AJU')});log(s,'Ajuste',`${productId}: ${diff>=0?'+':''}${diff} (${reason})`);return s;}
export function returnItem(state:State,saleId:string,productId:string,qty:number,reason:string):State{
 const s=clone(state);const sale=s.sales.find(x=>x.id===saleId&&x.status==='vigente');
 if(!sale||!reason.trim()||!Number.isInteger(qty)||qty<=0)throw Error('Indica una venta vigente, cantidad entera positiva y motivo.');
 if(!hasVoucher(sale))throw Error('La venta aún no tiene comprobante. Emítelo primero o anula la venta si no se concretó.');
 const lines=sale.items.filter(i=>i.productId===productId);
 const sold=lines.reduce((a,i)=>a+i.qty,0);
 const past=s.returns.filter(r=>r.saleId===saleId&&r.productId===productId);
 const previous=past.reduce((a,r)=>a+r.qty,0);
 if(qty>sold-previous)throw Error('La cantidad supera el saldo devolvible.');
 // Asignación FIFO sobre precios de cada línea; descuenta devoluciones previas.
 const valueOf=(count:number)=>{let left=count,amount=0;for(const i of lines){const n=Math.min(left,i.qty);amount+=n*i.price*(1-i.discount/100);left-=n;if(left<=0)break;}return Math.round(amount*100)/100;};
 const amount=Math.round((valueOf(previous+qty)-valueOf(previous))*100)/100;
 const id=uid('DEV');
 // Toda devolución sobre un comprobante emitido genera una nota de crédito que lo referencia.
 const ncSerie=sale.tipoComprobante==='factura'?'FC01':'BC01';
 const ncNumber=Math.max(0,...s.returns.filter(r=>r.notaCredito?.startsWith(ncSerie+'-')).map(r=>Number(r.notaCredito!.split('-')[1])||0))+1;
 const notaCredito=`${ncSerie}-${String(ncNumber).padStart(8,'0')}`;
 s.returns.unshift({id,saleId,productId,qty,amount,date:today(),reason,notaCredito});
 const stock=s.inventory.find(x=>x.productId===productId&&x.warehouseId===sale.warehouseId);
 if(!stock)throw Error('No existe inventario asociado a la devolución.');
 stock.quantity+=qty;s.movements.unshift({id:uid('MOV'),date:today(),productId,warehouseId:sale.warehouseId,qty,type:'Devolución',reason,reference:id});log(s,'Devolución',`${id} · nota de crédito ${notaCredito} sobre ${sale.serie}-${String(sale.correlativo).padStart(8,'0')}`);return s;
}
export function cancelSale(state:State,saleId:string):State{const s=clone(state);const sale=s.sales.find(v=>v.id===saleId);if(!sale||sale.status!=='vigente')throw Error('Venta no disponible.');if(paidOn(s,saleId)>0||s.returns.some(r=>r.saleId===saleId))throw Error('No se puede anular una venta con pagos o devoluciones.');for(const item of sale.items){const inv=s.inventory.find(x=>x.productId===item.productId&&x.warehouseId===sale.warehouseId)!;inv.quantity+=item.qty;s.movements.unshift({id:uid('MOV'),date:today(),productId:item.productId,warehouseId:sale.warehouseId,qty:item.qty,type:'Anulación',reason:'Venta anulada',reference:saleId});}sale.status='anulada';if(sale.orderId){const order=s.orders.find(o=>o.id===sale.orderId);if(order){order.status='confirmado';order.saleId=undefined;}}log(s,'Anulación',saleId);return s;}
export function totals(s:State){const valid=s.sales.filter(x=>x.status==='vigente');const sales=valid.reduce((a,x)=>a+sumItems(x.items),0)-s.returns.reduce((a,x)=>a+x.amount,0);const income=s.payments.filter(x=>x.status==='aprobado').reduce((a,x)=>a+x.amount,0)+s.expenses.filter(x=>x.type==='ingreso').reduce((a,x)=>a+x.amount,0);const expense=s.expenses.filter(x=>x.type==='egreso').reduce((a,x)=>a+x.amount,0);const receivables=valid.reduce((a,x)=>a+dueOn(s,x),0);const costs=valid.reduce((a,x)=>a+x.items.reduce((b,i)=>b+i.qty*(s.products.find(p=>p.id===i.productId)?.cost||0),0),0);return {sales,income,expense,receivables,profit:sales-costs-(expense-s.expenses.filter(x=>x.type==='egreso'&&x.source?.startsWith('reembolso:')).reduce((a,x)=>a+x.amount,0))};}
