import {describe,it,expect} from 'vitest';
import {makeSeed} from '../../core/seed';
import {deleteInventoryDocument} from './documents';
import type {InventoryDocument} from '../../core/types';
const attachment=(id:string):InventoryDocument=>({id,name:`${id}.pdf`,kind:'Guía',mime:'application/pdf',size:100,dataUrl:'data:application/pdf;base64,JVBERg==',createdAt:'2026-10-21T12:00:00Z',actor:'Almacén',reference:'GUIA-TEST',movementIds:['MOV-1']});
describe('Document deletion',()=>{
 it('removes only the chosen attachment, clears all its links and preserves balances/history',()=>{
  const s=makeSeed();s.inventoryDocuments=[attachment('DOC-A'),attachment('DOC-B')];s.movements[0].documentIds=['DOC-A','DOC-B'];s.movements[1].documentIds=['DOC-A'];
  const snapshot=structuredClone(s),n=deleteInventoryDocument(s,'DOC-A','Administrador');
  expect(n.inventoryDocuments?.map(d=>d.id)).toEqual(['DOC-B']);expect(n.movements[0].documentIds).toEqual(['DOC-B']);expect(n.movements[1].documentIds).toEqual([]);
  expect(n.inventory).toEqual(s.inventory);expect(n.sales).toEqual(s.sales);expect(n.products).toEqual(s.products);
  expect(n.movements.map(({documentIds:_,...m})=>m)).toEqual(s.movements.map(({documentIds:_,...m})=>m));
  expect(n.audit[0].description).toContain('Administrador');expect(n.audit[0].description).toContain('GUIA-TEST');expect(s).toEqual(snapshot);
 });
 it('rejects a stale deletion without modifying unrelated records',()=>{const s=makeSeed();const snapshot=structuredClone(s);expect(()=>deleteInventoryDocument(s,'missing','Almacén')).toThrow('ya no existe');expect(s).toEqual(snapshot);});
});
