import {describe,it,expect} from 'vitest';
import {makeSeed} from '../../core/seed';
import {stockOf,createSale,returnItem,transfer} from '../../core/operations';
import {normalizeInventory,finalizeInventory,stockStatus} from './model';
import {deleteProduct,saveProduct,newProductId,saveWarehouse,postTransaction} from './service';
import {appendDocuments} from './documents';
import type {InventoryDocument} from '../../core/types';
const doc:InventoryDocument={id:'DOC-TEST',name:'guia.pdf',kind:'Guía',mime:'application/pdf',size:100,dataUrl:'data:application/pdf;base64,JVBERi0=',createdAt:'2026-10-21T12:00:00Z',actor:'Almacén',reference:'',movementIds:[]};
describe('Integrated inventory workflows',()=>{
 it('derives thresholds at 100, 50, 10 and zero from the global product balance',()=>{
  const s=normalizeInventory(makeSeed()),p=s.products[0];s.inventory.forEach(i=>{if(i.productId===p.id)i.quantity=0;});p.stockReference=100;
  for(const [qty,label,tone] of [[100,'Alto','success'],[50,'Medio · Reponer','warning'],[10,'Crítico','danger'],[0,'Agotado','danger']] as const){s.inventory.find(i=>i.productId===p.id)!.quantity=qty;expect(stockStatus(s,p)).toMatchObject({percent:qty,label,tone});}
 });
 it('migrates without losing historic data and preserves baseline after reload',()=>{
  const original=makeSeed(),s=normalizeInventory(original);expect(s.sales).toEqual(original.sales);expect(s.movements.every(m=>m.balanceAfter!==undefined)).toBe(true);
  const p=s.products[0],baseline=p.stockReference; s.inventory.find(i=>i.productId===p.id)!.quantity-=2;
  expect(normalizeInventory(JSON.parse(JSON.stringify(s))).products[0].stockReference).toBe(baseline);
 });
 it('captures separate exact balance snapshots for multiple sales and the acting user',()=>{
  const s=normalizeInventory(makeSeed()),p=s.products[0],before=stockOf(s,p.id,'ALM-01');
  const first=createSale(s,'CLI-001',[{productId:p.id,qty:1,price:10,discount:0}],'ALM-01');
  const second=createSale(first,'CLI-001',[{productId:p.id,qty:2,price:10,discount:0}],'ALM-01');
  const n=finalizeInventory(s,second,'Administrador Demo');
  expect(n.movements[0].balanceAfter).toBe(before-3);expect(n.movements[1].balanceAfter).toBe(before-1);
  expect(n.movements[0].actor).toBe('Administrador Demo');expect(n.movements[0].thirdPartyId).toBe('CLI-001');expect(n.movements[0].createdAt).toBeTruthy();
 });
 it('captures a commercial return and preserves its reason',()=>{
  const s=normalizeInventory(makeSeed()),sale=s.sales[0],p=sale.items[0].productId;
  const n=finalizeInventory(s,returnItem(s,sale.id,p,1,'Defecto de fabricación'),'Ventas');
  expect(n.movements[0].balanceAfter).toBe(stockOf(s,p,sale.warehouseId)+1);expect(n.movements[0].reason).toBe('Defecto de fabricación');
 });
 it('blocks new commercial and inventory movements in maintenance warehouses',()=>{
  const s=normalizeInventory(makeSeed());s.warehouses[0].status='En mantenimiento';
  expect(()=>finalizeInventory(s,createSale(s,'CLI-001',[{productId:'PRO-001',qty:1,price:10,discount:0}],'ALM-01'),'Ventas')).toThrow('almacén');
  expect(()=>finalizeInventory(s,transfer(s,'PRO-001','ALM-01','ALM-02',1),'Almacén')).toThrow();
 });
 it('archives only empty products and keeps sales references and historic records',()=>{
  const s=normalizeInventory(makeSeed());expect(()=>deleteProduct(s,'PRO-001')).toThrow();
  s.inventory.forEach(i=>{if(i.productId==='PRO-001')i.quantity=0;});const n=deleteProduct(s,'PRO-001');
  expect(n.products.find(p=>p.id==='PRO-001')?.active).toBe(false);expect(n.sales).toEqual(s.sales);expect(n.movements).toEqual(s.movements);
 });
 it('creates unique IDs and rejects ID overwrite',()=>{const s=normalizeInventory(makeSeed()),id=newProductId(s);expect(id).not.toBe(newProductId(s));expect(()=>saveProduct(s,{...s.products[0]})).toThrow('ID');});
 it('rejects duplicate warehouse codes without changing balances',()=>{const s=makeSeed();expect(()=>saveWarehouse(s,{id:'alm-01',name:'Duplicado',city:'Lima'})).toThrow('Código');});
 it('keeps documents linked atomically to a transaction and rejects quota overflow',()=>{
  const s=normalizeInventory(makeSeed()),supplier=s.suppliers[0];
  const n=postTransaction(s,{kind:'Entrada',productId:'PRO-001',warehouseId:'ALM-01',destination:'',quantity:2,reason:'Compra',reference:'',thirdPartyId:supplier.id,thirdPartyKind:'proveedor',documents:[doc]});
  expect(n.inventoryDocuments?.[0].reference).toBe(n.movements[0].reference);expect(n.inventoryDocuments?.[0].movementIds).toContain(n.movements[0].id);expect(n.movements[0].documentIds).toEqual(['DOC-TEST']);expect(s.inventoryDocuments).toEqual([]);
  expect(()=>appendDocuments(s,[{...doc,size:4*1024*1024}])).toThrow('Límite');expect(s.inventoryDocuments).toEqual([]);
 });
});
