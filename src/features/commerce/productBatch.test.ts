import {describe,it,expect} from 'vitest';
import {makeSeed} from '../../core/seed';
import {appendBatchProducts} from './productBatch';
import {stockOf} from '../../core/operations';

describe('Catálogo comercial: agregar varios productos en una operación',()=>{
 it('añade diez productos distintos y mantiene el precio individual del catálogo',()=>{
  const s=makeSeed();
  const selected=Object.fromEntries(s.products.slice(0,10).map((product,index)=>[product.id,index+1]));
  const added=appendBatchProducts(s,[],selected,'cotizacion','ALM-01');
  expect(added).toHaveLength(10);
  expect(new Set(added.map(i=>i.productId)).size).toBe(10);
  expect(added[5].qty).toBe(6);
  expect(added[5].price).toBe(s.products[5].price);
  expect(added.every(i=>i.discount===0)).toBe(true);
 });
 it('no altera las líneas existentes al añadir otras',()=>{
  const s=makeSeed();
  const previous=[{productId:s.products[0].id,qty:3,price:101,discount:10}];
  const added=appendBatchProducts(s,previous,{[s.products[1].id]:2,[s.products[2].id]:4},'pedido','ALM-01');
  expect(added).toHaveLength(3);
  expect(added[0]).toEqual(previous[0]);
  expect(added[0]).not.toBe(previous[0]);
  expect(previous).toHaveLength(1);
 });
 it('bloquea productos repetidos y cantidades inválidas',()=>{
  const s=makeSeed(),id=s.products[0].id;
  expect(()=>appendBatchProducts(s,[],{},'pedido','ALM-01')).toThrow('Selecciona');
  for(const qty of [0,-1,1.5,NaN])expect(()=>appendBatchProducts(s,[],{[id]:qty},'pedido','ALM-01')).toThrow('entero');
  expect(()=>appendBatchProducts(s,[{productId:id,qty:1,price:10,discount:0}],{[id]:1},'cotizacion','ALM-01')).toThrow('ya está');
 });
 it('no permite agregar productos inactivos o archivados',()=>{
  const s=makeSeed(),id=s.products[0].id;
  s.products[0].active=false;
  expect(()=>appendBatchProducts(s,[],{[id]:1},'cotizacion','ALM-01')).toThrow('no está activo');
 });
 it('en venta comprueba el stock del almacén elegido; cotización no descuenta existencias',()=>{
  const s=makeSeed(),id=s.products[0].id,qty=stockOf(s,id,'ALM-01')+1;
  expect(()=>appendBatchProducts(s,[],{[id]:qty},'venta','ALM-01')).toThrow('Stock insuficiente');
  expect(appendBatchProducts(s,[],{[id]:qty},'cotizacion','ALM-01')[0].qty).toBe(qty);
  expect(stockOf(s,id,'ALM-01')).toBe(qty-1);
 });
 it('mantiene la versión y las referencias del estado original',()=>{
  const s=makeSeed();
  appendBatchProducts(s,[],{[s.products[0].id]:2},'pedido','ALM-01');
  expect(s.version).toBe(2);
  expect(s.orders).toBeDefined();
 });
});
