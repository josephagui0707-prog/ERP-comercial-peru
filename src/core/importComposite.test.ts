import {describe,expect,it} from 'vitest';
import {makeSeed} from './seed';
import {makeCommercialExampleXlsx} from './commercialTemplate';
import {readImport,planImport,importSchema} from './importXlsx';
import type {ImportData} from './importXlsx';

const demo=()=>readImport(makeCommercialExampleXlsx());

describe('Importación comercial relacionada desde XLSX',()=>{
 it('admite datos adicionales sin romper las columnas obligatorias de plantillas anteriores',()=>{
   const d=demo();
   expect(d.errors).toEqual([]);
   expect(d.counts.Cotizaciones).toBe(3);
   expect(d.counts.Pedidos).toBe(3);
   expect(d.counts.Ventas).toBe(3);
   expect(d.counts.Cobros).toBe(2);
   expect(d.counts.Caja).toBe(2);
   expect(importSchema.Ventas).not.toContain('pedido_id');
   expect(d.rows.find(r=>r.sheet==='Ventas')?.data.pedido_id).toBe('PED-XL26-001');
 });
 it('importa cotización → pedido → venta → cobro y conserva fechas y datos extra',()=>{
   const state=makeSeed(),before=JSON.stringify(state);
   const plan=planImport(demo(),state);
   expect(plan.errors).toEqual([]);
   const s=plan.next;
   const quote=s.quotes.find(x=>x.id==='COT-XL26-001')!;
   const order=s.orders.find(x=>x.id==='PED-XL26-001')!;
   const sale=s.sales.find(x=>x.id==='VEN-XL26-001')!;
   const paid=s.payments.find(x=>x.id==='PAG-XL26-001')!;
   expect(quote.orderId).toBe(order.id);
   expect(quote.validUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
   expect(quote.notes).toContain('Kit de oficina');
   expect(order.quoteId).toBe(quote.id);
   expect(order.saleId).toBe(sale.id);
   expect(order.expectedDelivery).toMatch(/^\d{4}-\d{2}-\d{2}$/);
   expect(sale.orderId).toBe(order.id);
   expect(sale.items).toHaveLength(2);
   expect(sale.serie).toBe('F009');
   expect(sale.correlativo).toBe(101);
   expect(sale.paymentMethod).toBe('Transferencia demo');
   expect(sale.compradorTipoDoc).toBe('RUC');
   expect(sale.notes).toContain('pedido');
   expect(paid.saleId).toBe(sale.id);
   expect(paid.reference).toBe('REF-TRANSFER-001');
   expect(s.expenses.find(x=>x.id==='EGR-XL26-001')?.source).toBe('GASTO-LOG-001');
   expect(JSON.stringify(state)).toBe(before);
 });
 it('evita duplicados y preserva la carga atómica ante referencias incorrectas',()=>{
   const start=makeSeed(),data=demo();
   const first=planImport(data,start);
   expect(first.errors).toEqual([]);
   const previous=JSON.stringify(first.next);
   const duplicate=planImport(data,first.next);
   expect(duplicate.errors.some(e=>e.toLowerCase().includes('duplicado'))).toBe(true);
   expect(JSON.stringify(first.next)).toBe(previous);
   const wrong:ImportData=structuredClone(data);
   for(const sale of wrong.rows.filter(r=>r.sheet==='Ventas'&&r.data.id==='VEN-XL26-001')){
     sale.data.pedido_id='PED-INEXISTENTE';
   }
   const bad=planImport(wrong,start);
   expect(bad.errors.some(e=>/pedido/i.test(e))).toBe(true);
   expect(JSON.stringify(start)).toBe(JSON.stringify(makeSeed()));
 });
});
