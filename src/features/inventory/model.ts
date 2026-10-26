import type {Product,State,Movement} from '../../core/types';
import {stockOf} from '../../core/operations';
/** Percentage denominator: highest observed global stock since migration/first receipt.
 * It is independent of the current balance, so a withdrawal actually lowers the percentage. */
export function stockStatus(s:State,p:Product) {
  const quantity=stockOf(s,p.id),reference=Math.max(p.stockReference??quantity,quantity);
  const percent=reference>0?Math.min(100,quantity/reference*100):0;
  return {quantity,reference,percent,label:quantity===0?'Agotado':percent<=10?'Crítico':percent<=50?'Medio · Reponer':'Alto',tone:percent<=10?'danger':percent<=50?'warning':'success'};
}
export const warehouseAvailable=(s:State,id:string)=>s.warehouses.some(w=>w.id===id&&(!w.status||w.status==='Activo'));
export function normalizeInventory(input:State):State {
  const s=structuredClone(input);
  s.inventoryDocuments??=[];
  for(const p of s.products){p.stockReference=Math.max(p.stockReference??0,stockOf(s,p.id));p.active=!p.archivedAt;}
  for(const w of s.warehouses){w.status??='Activo';w.kind??='Almacén Principal / Central';}
  if((s.inventoryRevision??0)<2){
    // Old demo seed was appended, subsequent operations were prepended. Only
    // reconstruct when that known order reproduces the complete current balance.
    const isSeed=(m:Movement)=>/^MOV-(?:\d+|S\d+-PRO-\d+)$/.test(m.id);
    const seed=s.movements.filter(isSeed),newer=s.movements.filter(m=>!isSeed(m)).reverse();
    if(seed.length){
      const balances=new Map<string,number>(),snapshots=new Map<string,number>();let valid=true;
      for(const m of [...seed,...newer]){const key=`${m.productId}/${m.warehouseId}`;const q=(balances.get(key)??0)+m.qty;balances.set(key,q);snapshots.set(m.id,q);if(q<0)valid=false;}
      for(const i of s.inventory)if((balances.get(`${i.productId}/${i.warehouseId}`)??0)!==i.quantity)valid=false;
      if(valid)for(const m of s.movements)if(m.balanceAfter===undefined){m.balanceAfter=snapshots.get(m.id);m.balanceSource='reconstruido';}
    }
  }
  s.inventoryRevision=2;
  return s;
}
/** Capture all ledger writers (sales/returns included) in the shared atomic commit.
 * Walk newly prepended entries in chronological insertion order to snapshot each balance. */
export function finalizeInventory(previous:State,next:State,actor:string):State {
  const s=normalizeInventory(next),known=new Set(previous.movements.map(m=>m.id));
  const fresh=s.movements.filter(m=>!known.has(m.id)).reverse(),balances=new Map<string,number>();
  for(const m of fresh){
    if(!warehouseAvailable(previous,m.warehouseId)&&!warehouseAvailable(s,m.warehouseId))throw Error('El almacén está inactivo o en mantenimiento. No admite nuevos movimientos.');
    if(!warehouseAvailable(s,m.warehouseId))throw Error('Selecciona un almacén activo.');
    if(s.products.find(p=>p.id===m.productId)?.archivedAt)throw Error('El producto está archivado. No admite nuevos movimientos.');
    const key=`${m.productId}/${m.warehouseId}`;
    const balance=(balances.get(key)??stockOf(previous,m.productId,m.warehouseId))+m.qty;
    if(!Number.isSafeInteger(balance)||balance<0)throw Error('El movimiento generaría un stock inválido.');
    balances.set(key,balance);m.balanceAfter=balance;m.balanceSource='capturado';m.createdAt??=new Date().toISOString();m.actor??=actor;
    const sale=s.sales.find(x=>x.id===m.reference)||s.sales.find(x=>x.id===s.returns.find(r=>r.id===m.reference)?.saleId);
    if(sale&&!m.thirdPartyId){m.thirdPartyId=sale.clientId;m.thirdPartyKind='cliente';}
  }
  return s;
}
export function movementType(m:Movement,compact=false) {
  if(compact)return m.type==='Ajuste'?'Ajuste':m.qty>=0?'Entrada':'Salida';
  if(m.type==='Apertura')return 'Stock inicial';
  if(m.type==='Anulación')return 'Entrada · Anulación';
  return m.type;
}
export function partyName(s:State,m:Movement) {
  if(m.thirdPartyId)return m.thirdPartyKind==='proveedor'?s.suppliers.find(c=>c.id===m.thirdPartyId)?.name??m.thirdPartyId:s.clients.find(c=>c.id===m.thirdPartyId)?.name??m.thirdPartyId;
  const sale=s.sales.find(x=>x.id===m.reference)||s.sales.find(x=>x.id===s.returns.find(r=>r.id===m.reference)?.saleId);
  return s.clients.find(c=>c.id===sale?.clientId)?.name??'—';
}
