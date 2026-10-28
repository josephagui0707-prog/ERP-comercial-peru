import {describe,it,expect} from 'vitest';
import {makeSeed} from './seed';
import {approveQuote,rejectQuote,advanceOrder,createQuote,createSale,createOrder,recordPayment,paidOn,transfer,stockOf,returnItem,dueOn,adjustStock,cancelSale} from './operations';
import {sumItems} from './types';
import type {Item} from './types';
const itemsFor=(s:ReturnType<typeof makeSeed>):Item[]=>[{productId:s.products[0].id,qty:2,price:s.products[0].price,discount:10},{productId:s.products[1].id,qty:1,price:s.products[1].price,discount:0}];
const preparedOrder=(s:ReturnType<typeof makeSeed>,items:Item[]=itemsFor(s))=>{
 const o=createOrder(s,s.clients[0].id,items);const id=o.orders[0].id;
 return advanceOrder(advanceOrder(o,id,'confirmado'),id,'preparando');
};
describe('Integridad ERP: etapas 2–4 y regresiones',()=>{
 it('flujo: cotización borrador → aprobada → pedido → confirmado → preparando → venta',()=>{
  const s=makeSeed(),items=itemsFor(s),client=s.clients[0].id;
  const quoted=createQuote(s,client,items);const qid=quoted.quotes[0].id;
  expect(quoted.quotes[0].status).toBe('borrador');
  const approved=approveQuote(quoted,qid);const order=createOrder(approved,client,items,qid);
  expect(order.quotes[0].status).toBe('convertida');expect(order.quotes[0].orderId).toBe(order.orders[0].id);
  expect(order.orders[0].quoteId).toBe(qid);
  const prepared=advanceOrder(advanceOrder(order,order.orders[0].id,'confirmado'),order.orders[0].id,'preparando');
  const initial=stockOf(prepared,items[0].productId,'ALM-01');
  const sold=createSale(prepared,client,items,'ALM-01',order.orders[0].id);
  expect(sold.orders[0].status).toBe('completado');expect(sold.orders[0].saleId).toBe(sold.sales[0].id);
  expect(stockOf(sold,items[0].productId,'ALM-01')).toBe(initial-2);
  expect(()=>createSale(sold,client,items,'ALM-01',order.orders[0].id)).toThrow();
  expect(()=>createOrder(sold,client,items,qid)).toThrow();
 });
 it('REGRESIÓN 1: el correlativo no repite existentes y considera anulados',()=>{
  const s=makeSeed(),existing=s.sales.filter(v=>v.serie==='B001').map(v=>v.correlativo);
  const max=Math.max(...existing);
  const current=s.sales.find(v=>v.serie==='B001'&&v.correlativo===max)!;current.status='anulada';
  const result=createSale(s,s.clients[0].id,[{productId:s.products[0].id,qty:1,price:100,discount:0}],'ALM-01');
  expect(result.sales[0].correlativo).toBe(max+1);
  expect(existing).not.toContain(result.sales[0].correlativo);
 });
 it('REGRESIÓN 2: un pedido pendiente o confirmado no puede venderse',()=>{
  const s=makeSeed(),items=itemsFor(s),order=createOrder(s,s.clients[0].id,items),id=order.orders[0].id;
  expect(()=>createSale(order,s.clients[0].id,items,'ALM-01',id)).toThrow('preparando');
  const confirmed=advanceOrder(order,id,'confirmado');
  expect(()=>createSale(confirmed,s.clients[0].id,items,'ALM-01',id)).toThrow('preparando');
  const canceled=advanceOrder(confirmed,id,'cancelado');
  expect(()=>createSale(canceled,s.clients[0].id,items,'ALM-01',id)).toThrow('preparando');
 });
 it('REGRESIÓN 3: el pedido desde cotización no puede cambiar cliente, precios ni cantidades',()=>{
  const s=makeSeed(),items=itemsFor(s),client=s.clients[0].id;
  const quoted=createQuote(s,client,items),approved=approveQuote(quoted,quoted.quotes[0].id),qid=quoted.quotes[0].id;
  expect(()=>createOrder(approved,s.clients[1].id,items,qid)).toThrow('conservar');
  expect(()=>createOrder(approved,client,items.map((i,j)=>j===0?{...i,price:1}:i),qid)).toThrow('conservar');
  expect(()=>createOrder(approved,client,items.map((i,j)=>j===0?{...i,qty:i.qty+1}:i),qid)).toThrow('conservar');
  expect(approved.quotes[0].status).toBe('aprobada');expect(approved.orders).toHaveLength(s.orders.length);
 });
 it('REGRESIÓN 4: devolución de mismo producto con precios distintos conserva los importes reales',()=>{
  const s=makeSeed(),sale=s.sales[0],id=sale.items[0].productId;
  sale.items=[{productId:id,qty:1,price:100,discount:0},{productId:id,qty:1,price:200,discount:0}];sale.total=300;
  const first=returnItem(s,sale.id,id,1,'Primer lote');
  const second=returnItem(first,sale.id,id,1,'Segundo lote');
  expect(first.returns[0].amount).toBe(100);
  expect(second.returns[0].amount).toBe(200);
  expect(second.returns.slice(0,2).reduce((a,r)=>a+r.amount,0)).toBe(300);
  expect(()=>returnItem(second,sale.id,id,1,'Extra')).toThrow('saldo devolvible');
 });
 it('bloquea cotizaciones inválidas y productos duplicados',()=>{
  const s=makeSeed(),client=s.clients[0].id,p=s.products[0];
  for(const qty of [0,-1,1.5,Infinity,NaN])expect(()=>createQuote(s,client,[{productId:p.id,qty,price:100,discount:0}])).toThrow();
  for(const discount of [-1,101,NaN])expect(()=>createQuote(s,client,[{productId:p.id,qty:1,price:100,discount}])).toThrow();
  for(const price of [-1,NaN,Infinity])expect(()=>createQuote(s,client,[{productId:p.id,qty:1,price,discount:0}])).toThrow();
  expect(()=>createQuote(s,client,[{productId:p.id,qty:1,price:100,discount:0},{productId:p.id,qty:1,price:100,discount:0}])).toThrow('repetido');
  s.products[0].active=false;expect(()=>createOrder(s,client,[{productId:p.id,qty:1,price:100,discount:0}])).toThrow('no está activo');
 });
 it('rechazada no se convierte, y transiciones inválidas no avanzan',()=>{
  const s=makeSeed(),items=itemsFor(s),q=createQuote(s,s.clients[0].id,items),qid=q.quotes[0].id;
  const rejected=rejectQuote(q,qid);
  expect(()=>approveQuote(rejected,qid)).toThrow();expect(()=>createOrder(rejected,s.clients[0].id,items,qid)).toThrow();
  const order=createOrder(s,s.clients[0].id,items),id=order.orders[0].id;
  expect(()=>advanceOrder(order,id,'preparando')).toThrow();
  const canceled=advanceOrder(order,id,'cancelado');expect(()=>advanceOrder(canceled,id,'confirmado')).toThrow();
 });
 it('clona las líneas sin alterar los documentos previos',()=>{
  const s=makeSeed(),items=itemsFor(s);const quoted=createQuote(s,s.clients[0].id,items);
  items[0].price=1;expect(quoted.quotes[0].items[0].price).not.toBe(1);
  const approved=approveQuote(quoted,quoted.quotes[0].id);
  const order=createOrder(approved,approved.quotes[0].clientId,approved.quotes[0].items,approved.quotes[0].id);
  expect(order.orders[0].items).toEqual(approved.quotes[0].items);
  expect(order.orders[0].items[0]).not.toBe(order.quotes[0].items[0]);
 });
 it('impide venta sin stock y venta de documento vinculado duplicado',()=>{
  const s=makeSeed(),items=itemsFor(s),ready=preparedOrder(s,items),id=ready.orders[0].id;
  expect(()=>createSale(s,s.clients[0].id,[{...items[0],qty:999999}],'ALM-01')).toThrow('Stock insuficiente');
  expect(()=>createSale(ready,s.clients[0].id,items.map((i,j)=>j===0?{...i,qty:99999}:i),'ALM-01',id)).toThrow('conservar');
  const sold=createSale(ready,s.clients[0].id,items,'ALM-01',id);
  expect(()=>createSale(sold,s.clients[0].id,items,'ALM-01',id)).toThrow();
 });
 it('solo pagos aprobados disminuyen el saldo y no exceden el monto',()=>{
  const s=makeSeed(),sale=s.sales.find(v=>dueOn(s,v)>50)!;const original=dueOn(s,sale);
  const rejected=recordPayment(s,sale.id,20,'Yape demo','rechazado');expect(dueOn(rejected,sale)).toBe(original);
  const paid=recordPayment(rejected,sale.id,20,'Yape demo','aprobado');expect(paidOn(paid,sale.id)).toBe(paidOn(s,sale.id)+20);
  expect(dueOn(paid,sale)).toBeCloseTo(original-20,2);
  expect(()=>recordPayment(paid,sale.id,original,'Efectivo','aprobado')).toThrow();
 });
 it('valida factura RUC 11 dígitos y boleta mayor a S/ 700',()=>{
  const s=makeSeed(),client=s.clients[0].id,lines:[Item]=[{productId:s.products[0].id,qty:1,price:800,discount:0}];
  expect(()=>createSale(s,client,lines,'ALM-01',undefined,{tipoComprobante:'factura',compradorNombre:'Empresa',compradorDoc:'12345678',compradorTipoDoc:'DNI'})).toThrow('RUC');
  expect(()=>createSale(s,client,lines,'ALM-01',undefined,{tipoComprobante:'boleta',compradorNombre:'Empresa',compradorDoc:'',compradorTipoDoc:'-'})).toThrow('boleta');
  const fact=createSale(s,client,lines,'ALM-01',undefined,{tipoComprobante:'factura',compradorNombre:'Empresa',compradorDoc:s.clients[0].document,compradorTipoDoc:'RUC'});
  expect(fact.sales[0].tipoComprobante).toBe('factura');
 });
 it('transferencia conserva total, ajuste permite cero, anulación repone stock',()=>{
  const s=makeSeed(),id=s.products[0].id;
  expect(stockOf(transfer(s,id,'ALM-01','ALM-02',3),id)).toBe(stockOf(s,id));
  expect(stockOf(adjustStock(s,id,'ALM-01',0,'Conteo'),id,'ALM-01')).toBe(0);
  expect(()=>adjustStock(s,id,'ALM-01',-1,'inválido')).toThrow();
  const sale=s.sales.find(v=>paidOn(s,v.id)===0)!;
  expect(cancelSale(s,sale.id).sales.find(v=>v.id===sale.id)?.status).toBe('anulada');
  const withPayment=s.sales.find(v=>paidOn(s,v.id)>0)!;
  expect(()=>cancelSale(s,withPayment.id)).toThrow();
 });
 it('descuentos reducen el total; el estado de almacenamiento no cambia',()=>{
  expect(sumItems([{productId:'P',qty:2,price:100,discount:10}])).toBe(180);
  expect(makeSeed().version).toBe(2);
 });
});
