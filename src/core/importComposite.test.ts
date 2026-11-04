import {describe,expect,it} from 'vitest';
import {makeEmpty} from './empty';
import {makeSeed} from './seed';
import {makeCommercialExampleXlsx} from './commercialTemplate';
import {planImport,readImport} from './importXlsx';

const template=()=>readImport(makeCommercialExampleXlsx());
const initial=(seeded:boolean)=>seeded?makeSeed():makeEmpty();

describe('Excel comercial autocontenido',()=>{
 it('incluye todos los catálogos y documentos sin depender de CLI-001',()=>{
  const input=template();
  expect(input.errors).toEqual([]);
  for(const sheet of ['Categorias','Almacenes','Clientes','Productos','StockInicial','Cotizaciones','Pedidos','Ventas','Cobros','Caja']){
   expect(input.counts[sheet]).toBeGreaterThan(0);
  }
  const refs=input.rows.filter(x=>x.sheet==='Ventas').map(x=>String(x.data.cliente_id));
  expect(refs.every(id=>id.startsWith('CLI-X'))).toBe(true);
 });
 for(const seeded of [false,true]){
  it('importa de manera atómica con el estado '+(seeded?'de aula':'vacío'),()=>{
   const state=initial(seeded),raw=JSON.stringify(state),data=template(),plan=planImport(data,state);
   expect(plan.errors).toEqual([]);
   const invoice=plan.next.sales.find(x=>x.id.startsWith('VEN-X')&&x.tipoComprobante==='factura')!;
   const order=plan.next.orders.find(x=>x.id===invoice.orderId)!;
   const quote=plan.next.quotes.find(x=>x.id===order.quoteId)!;
   expect(invoice.items).toHaveLength(2);
   expect(order.saleId).toBe(invoice.id);
   expect(quote.orderId).toBe(order.id);
   expect(quote.validUntil).toBeTruthy();
   expect(invoice.compradorDoc).toHaveLength(11);
   expect(plan.next.payments.find(x=>x.saleId===invoice.id)?.reference).toContain('TRANSFER-');
   expect(JSON.stringify(state)).toBe(raw);
   const second=planImport(data,plan.next);
   expect(second.errors.length).toBeGreaterThan(0);
  });
 }
 it('no acepta referencias inexistentes ni altera el estado original',()=>{
  const input=template(),start=makeEmpty(),before=JSON.stringify(start);
  const sale=input.rows.find(r=>r.sheet==='Ventas')!;
  sale.data.almacen_id='ALM-INVALIDO';
  const plan=planImport(input,start);
  expect(plan.errors.some(error=>error.includes('ALM-INVALIDO')||error.includes('almacen_id'))).toBe(true);
  expect(JSON.stringify(start)).toBe(before);
 });
});
