import {describe,it,expect} from 'vitest';
import {makeSeed} from './seed';
import {interpretLocal} from './assistant-local';
import {createQuote} from './operations';

describe('asistente local conectado a registros',()=>{
 const s=makeSeed();
 it('prepara una cotización validada y no la guarda hasta confirmar',()=>{
  const answer=interpretLocal('cotiza 2 EC-0001 para CLI-001',s,'admin');
  expect(answer?.proposal?.type).toBe('quote');
  expect(s.quotes).toHaveLength(14);
  const p=answer?.proposal;
  if(!p||p.type!=='quote')throw Error('Propuesta no preparada');
  expect(createQuote(s,p.clientId,[{productId:p.productId,qty:p.qty,price:s.products[0].price,discount:0}]).quotes).toHaveLength(15);
 });
 it('rechaza SKU y cliente inexistentes',()=>{
  expect(interpretLocal('cotiza 1 NADA para CLI-001',s,'admin')?.proposal).toBeUndefined();
  expect(interpretLocal('cotiza 1 EC-0001 para CLI-999',s,'admin')?.proposal).toBeUndefined();
 });
 it('conserva permisos por rol',()=>{
  expect(interpretLocal('nueva cotización',s,'monitor')?.open).toBeUndefined();
  expect(interpretLocal('nueva cotización',s,'ventas')?.open).toBe('cotizaciones?crear=1');
  expect(interpretLocal('stock',s,'almacen')?.answer).toContain('productos');
 });
 it('prepara nuevos clientes y productos con confirmación',()=>{
  expect(interpretLocal('registrar cliente: Comercial Aurora | 20123456789 | ventas@aurora.pe',s,'admin')?.proposal?.type).toBe('client');
  expect(interpretLocal('registrar producto: Mouse optico | MOU-100 | 45 | 25 | Periféricos',s,'admin')?.proposal?.type).toBe('product');
  expect(interpretLocal('registrar producto: Mouse | EC-0001 | 45 | 25 | Periféricos',s,'admin')?.proposal).toBeUndefined();
 });
 it('responde cifras del estado actual',()=>{
  expect(interpretLocal('ventas de hoy',s,'admin')?.answer).toContain('Hoy');
  expect(interpretLocal('stock de EC-0001',s,'almacen')?.answer).toContain('Laptop');
 });
});
