import {describe,it,expect} from 'vitest';
import {makeSeed} from './seed';
import {createSalePending,hasVoucher,issueVoucher,recordPayment,dueOn} from './operations';
import type {State} from './types';
const input={tipoComprobante:'boleta' as const,compradorNombre:'Comprador de prueba',compradorDoc:'12345678',compradorTipoDoc:'DNI' as const};
const newSale=()=>{const s=makeSeed();const sale=createSalePending(s,s.clients[0].id,[{productId:s.products[0].id,qty:1,price:120,discount:0}],'ALM-01');return {sale,id:sale.sales[0].id};};
describe('Proceso venta → comprobante → cobro y compatibilidad',()=>{
 it('venta nueva queda pendiente de emisión, sin correlativo ficticio',()=>{const {sale,id}=newSale();expect(hasVoucher(sale.sales[0])).toBe(false);expect(sale.sales[0].serie).toBe('');expect(()=>recordPayment(sale,id,20,'Yape demo','aprobado')).toThrow('Primero emite');});
 it('emitir asigna correlativo permanente y permite cobrar',()=>{const {sale,id}=newSale();const emitted=issueVoucher(sale,id,input);expect(hasVoucher(emitted.sales[0])).toBe(true);expect(emitted.sales[0].correlativo).toBe(Math.max(...sale.sales.filter(v=>v.serie==='B001').map(v=>v.correlativo))+1);expect(dueOn(recordPayment(emitted,id,20,'Yape demo','aprobado'),emitted.sales[0])).toBe(100);expect(()=>issueVoucher(emitted,id,input)).toThrow('ya tiene');});
 it('se conserva número aun si el comprobante anterior está anulado',()=>{const {sale,id}=newSale();const prev=sale.sales.filter(v=>v.serie==='B001').sort((a,b)=>b.correlativo-a.correlativo)[0]!;prev.status='anulada';expect(issueVoucher(sale,id,input).sales[0].correlativo).toBe(Math.max(...sale.sales.filter(v=>v.serie==='B001').map(v=>v.correlativo))+1);});
 it('bloquea factura con DNI y boleta mayor de S/ 700 sin DNI/RUC',()=>{const {sale,id}=newSale();expect(()=>issueVoucher(sale,id,{...input,tipoComprobante:'factura'})).toThrow('RUC');const high=createSalePending(makeSeed(), 'CLI-001',[{productId:'PRO-001',qty:1,price:850,discount:0}],'ALM-01');expect(()=>issueVoucher(high,high.sales[0].id,{...input,compradorDoc:'',compradorTipoDoc:'-'})).toThrow('DNI');});
 it('reconoce documentos existentes y maneja legado sin serie',()=>{const s:State=makeSeed();expect(hasVoucher(s.sales[0])).toBe(true);const legacy={...s.sales[0],serie:undefined as unknown as string,correlativo:undefined as unknown as number};expect(hasVoucher(legacy)).toBe(false);});
});
