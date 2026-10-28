import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import {makeEmpty} from './empty';
import {importSchema,readImport,planImport} from './importXlsx';
import type {ImportData,ImportRow} from './importXlsx';
import {dueOn} from './operations';
import {sumItems} from './types';
import {finalizeInventory} from '../features/inventory/model';

// Preserve Buffer offsets rather than reading Node's pooled backing allocation.
const load=()=>{const b=fs.readFileSync('public/plantillas/ERP_Datos_Importacion.xlsx');return readImport(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer);};
const modified=(source:ImportData,sheet:ImportRow['sheet'],column:string,value:unknown)=>({...source,rows:source.rows.map((r,i)=>r.sheet===sheet&&i===source.rows.findIndex(x=>x.sheet===sheet)?{...r,data:{...r.data,[column]:value}}:r)});

describe('Carga XLSX transaccional',()=>{
 it('inicia vacío y carga el archivo entregado con relaciones y saldos conciliados',()=>{
  const empty=makeEmpty(),input=load(),before=JSON.stringify(empty),p=planImport(input,empty);
  expect(p.errors).toEqual([]);expect(input.rows).toHaveLength(622);expect(JSON.stringify(empty)).toBe(before);
  const s=finalizeInventory(empty,p.next,'Prueba');
  expect(s.clients).toHaveLength(60);expect(s.products).toHaveLength(64);expect(s.warehouses).toHaveLength(4);expect(s.categories).toHaveLength(8);expect(s.suppliers).toHaveLength(12);
  expect(s.sales).toHaveLength(48);expect(s.purchases).toHaveLength(24);expect(s.payments).toHaveLength(32);expect(s.returns).toHaveLength(6);
  for(const i of s.inventory){const moves=s.movements.filter(m=>m.productId===i.productId&&m.warehouseId===i.warehouseId);expect(moves.reduce((n,m)=>n+m.qty,0)).toBe(i.quantity);expect(i.quantity).toBeGreaterThanOrEqual(0);}
  for(const sale of s.sales){expect(sale.total).toBe(sumItems(sale.items));expect(Math.round((sale.igv+sale.baseImponible)*100)).toBe(Math.round(sale.total*100));expect(dueOn(s,sale)).toBeGreaterThanOrEqual(0);}
  expect(s.purchases.filter(p=>p.paidAt)).toHaveLength(6);
  expect(s.expenses.filter(e=>s.purchases.some(p=>p.id===e.source&&p.paidAt))).toHaveLength(6);
  expect(s.movements.every(m=>Number.isSafeInteger(m.balanceAfter)&&m.balanceAfter!>=0)).toBe(true);
 });
 it('rechaza reimportar la misma carga sin modificar el estado existente',()=>{const input=load(),s=planImport(input,makeEmpty()).next,before=JSON.stringify(s),again=planImport(input,s);expect(again.errors.some(e=>e.includes('duplicado'))).toBe(true);expect(JSON.stringify(s)).toBe(before);});
 it.each([
  ['Productos','categoria','Inexistente','Categoría no existe'],
  ['Productos','sku','ERP-0002','SKU duplicado'],
  ['Clientes','documento','123','Documento'],
  ['Productos','costo',-3,'costo'],
  ['StockInicial','cantidad',1.5,'entero'],
  ['Cobros','importe',9999999,'saldo pendiente'],
  ['Devoluciones','cantidad',999,'saldo devolvible'],
  ['Ventas','cantidad',99999,'Stock insuficiente'],
  ['StockInicial','fecha','2026-02-30','fecha'],
 ] as const)('bloquea %s.%s inválido', (sheet,col,value,error)=>{const p=planImport(modified(load(),sheet,col,value),makeEmpty());expect(p.errors.some(e=>e.toLowerCase().includes(error.toLowerCase()))).toBe(true);});
 it('rechaza encabezados incorrectos y fórmulas aunque tengan valor guardado',()=>{
  const book=XLSX.utils.book_new(),sheet=XLSX.utils.aoa_to_sheet([['nombre'],['Prueba']]);sheet.A2={t:'s',v:'Prueba',f:'"Prueba"'};XLSX.utils.book_append_sheet(book,sheet,'Categorias');
  expect(readImport(XLSX.write(book,{type:'array',bookType:'xlsx'})).errors.join()).toContain('fórmulas');
  sheet.A1.v='equivocado';expect(readImport(XLSX.write(book,{type:'array',bookType:'xlsx'})).errors.join()).toContain('encabezados');
 });
 it('permite hojas parciales y carga inicial cero sin inventar transacciones',()=>{const data:ImportData={rows:[{sheet:'Categorias',line:2,data:{nombre:'Nueva categoría'}}],errors:[],counts:{Categorias:1}};const p=planImport(data,makeEmpty());expect(p.errors).toEqual([]);expect(p.next.categories).toEqual(['Nueva categoría']);expect(p.next.sales).toHaveLength(0);});
 it('revalida contra el estado actual antes de guardar',()=>{const input=load(),current=makeEmpty();expect(planImport(input,current).errors).toEqual([]);current.clients.push({id:'OTRO',name:'Registro reciente',document:'20990000001',email:'a@example.com',phone:'',segment:'Empresa',active:true});expect(planImport(input,current).errors.join()).toContain('Documento duplicado');});
 it('mantiene el contrato de columnas de la plantilla',()=>{const data=load();for(const row of data.rows)expect(Object.keys(row.data)).toEqual(importSchema[row.sheet]);});
});
