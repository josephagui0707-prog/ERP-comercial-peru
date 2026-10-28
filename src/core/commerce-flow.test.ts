import {describe,it,expect} from 'vitest';
import {makeSeed} from './seed';
import {advanceOrder,cancelSale,createOrder,createSalePending,issueVoucher,recordPayment,refundCustomer,refundPendingOn,returnItem,totals} from './operations';
import type {Item} from './types';
import type {State} from './types';
import type {VoucherInput} from './operations';

const dni:VoucherInput={tipoComprobante:'boleta',compradorNombre:'Cliente',compradorDoc:'12345678',compradorTipoDoc:'DNI'};
const line=(s:State,price=120):Item[]=>[{productId:s.products[0].id,qty:2,price,discount:0}];
/** Venta nueva con comprobante emitido; devuelve el estado y el id de la venta. */
const issued=(s:State,items:Item[],input:VoucherInput=dni)=>{
 const sold=createSalePending(s,s.clients[0].id,items,'ALM-01');
 const id=sold.sales[0].id;
 return {state:issueVoucher(sold,id,input),id};
};

describe('Flujo comercial: reglas añadidas en la revisión',()=>{
 it('un pedido cuya venta fue anulada puede venderse de nuevo',()=>{
  const s=makeSeed(),items=line(s),c=s.clients[0].id;
  const o=createOrder(s,c,items),id=o.orders[0].id;
  const ready=advanceOrder(advanceOrder(o,id,'confirmado'),id,'preparando');
  const sold=createSalePending(ready,c,items,'ALM-01',id);
  const undone=cancelSale(sold,sold.sales[0].id);
  expect(undone.orders[0].status).toBe('confirmado');
  const again=advanceOrder(undone,id,'preparando');
  const resold=createSalePending(again,c,items,'ALM-01',id);
  expect(resold.sales[0].orderId).toBe(id);
  expect(resold.sales[0].status).toBe('vigente');
  expect(()=>createSalePending(resold,c,items,'ALM-01',id)).toThrow();
 });

 it('no se puede devolver sobre una venta sin comprobante',()=>{
  const s=makeSeed(),items=line(s);
  const sold=createSalePending(s,s.clients[0].id,items,'ALM-01');
  expect(()=>returnItem(sold,sold.sales[0].id,items[0].productId,1,'Defecto')).toThrow('comprobante');
 });

 it('la devolución genera notas de crédito correlativas según el tipo de comprobante',()=>{
  const s=makeSeed(),items=line(s);
  const {state,id}=issued(s,items);
  const first=returnItem(state,id,items[0].productId,1,'Defecto');
  const second=returnItem(first,id,items[0].productId,1,'Defecto');
  expect(first.returns[0].notaCredito).toBe('BC01-00000001');
  expect(second.returns[0].notaCredito).toBe('BC01-00000002');
  const factura=makeSeed();
  const f=issued(factura,items,{tipoComprobante:'factura',compradorNombre:'Empresa',compradorDoc:factura.clients[0].document,compradorTipoDoc:'RUC'});
  expect(returnItem(f.state,f.id,items[0].productId,1,'Defecto').returns[0].notaCredito).toBe('FC01-00000001');
 });

 it('el comprobante registra fecha de emisión y valida el formato del documento',()=>{
  const s=makeSeed(),items=line(s);
  const sold=createSalePending(s,s.clients[0].id,items,'ALM-01');const id=sold.sales[0].id;
  expect(()=>issueVoucher(sold,id,{...dni,compradorDoc:'123'})).toThrow('DNI');
  expect(()=>issueVoucher(sold,id,{...dni,compradorDoc:''})).toThrow('documento');
  expect(issueVoucher(sold,id,{...dni,compradorDoc:'',compradorTipoDoc:'-'}).sales[0].fechaEmision).toBeTruthy();
 });

 it('el reembolso nace de lo cobrado, no excede el pendiente y queda como egreso de caja',()=>{
  const s=makeSeed(),items=line(s,100);          // total 200
  const {state,id}=issued(s,items);
  const paid=recordPayment(state,id,200,'Yape demo','aprobado');
  const sale=()=>paid.sales.find(v=>v.id===id)!;
  expect(refundPendingOn(paid,sale())).toBe(0);
  const returned=returnItem(paid,id,items[0].productId,1,'Defecto'); // devuelve 100 ya pagados
  const rsale=returned.sales.find(v=>v.id===id)!;
  expect(refundPendingOn(returned,rsale)).toBe(100);
  expect(()=>refundCustomer(returned,id,150,'Yape demo')).toThrow('exceder');
  expect(()=>refundCustomer(returned,id,0,'Yape demo')).toThrow();
  const refunded=refundCustomer(returned,id,60,'Yape demo');
  expect(refundPendingOn(refunded,rsale)).toBe(40);
  expect(refunded.expenses[0].source).toBe(`reembolso:${id}`);
  expect(refunded.expenses[0].type).toBe('egreso');
  const done=refundCustomer(refunded,id,40,'Yape demo');
  expect(refundPendingOn(done,rsale)).toBe(0);
  // El reembolso sale de caja pero no es un gasto operativo: no reduce la utilidad dos veces.
  expect(totals(done).expense).toBe(totals(returned).expense+100);
  expect(totals(done).profit).toBeCloseTo(totals(returned).profit,2);
 });

 it('si la venta aún tiene saldo por cobrar, la devolución no genera reembolso',()=>{
  const s=makeSeed(),items=line(s,100);
  const {state,id}=issued(s,items);
  const returned=returnItem(state,id,items[0].productId,1,'Defecto');
  expect(refundPendingOn(returned,returned.sales.find(v=>v.id===id)!)).toBe(0);
 });
});
