import type {State,Purchase,Item} from '../../core/types';
import {sumItems,today,uid} from '../../core/types';
import {warehouseAvailable} from '../inventory/model';
export type PurchaseDraft={id?:string;supplierId:string;warehouseId:string;items:Item[];notes:string};
const log=(s:State,action:string,id:string)=>s.audit.unshift({id:uid('AUD'),date:new Date().toISOString(),action,description:id});
function validate(s:State,p:PurchaseDraft){
 if(!s.suppliers.some(x=>x.id===p.supplierId))throw Error('Selecciona un proveedor válido.');
 if(!warehouseAvailable(s,p.warehouseId))throw Error('Selecciona un almacén activo.');
 if(!p.items.length)throw Error('Agrega al menos un producto.');
 const ids=new Set<string>();
 for(const i of p.items){if(ids.has(i.productId))throw Error('No repitas productos; modifica su cantidad.');ids.add(i.productId);
 if(!s.products.some(x=>x.id===i.productId&&x.active&&!x.archivedAt)||!Number.isSafeInteger(i.qty)||i.qty<=0||!Number.isFinite(i.price)||i.price<=0||i.discount!==0)throw Error('Revisa los productos, cantidades enteras y costos positivos.');}
 if(!Number.isFinite(sumItems(p.items))||sumItems(p.items)>1e12)throw Error('El importe supera el límite permitido.');
}
export function savePurchase(state:State,draft:PurchaseDraft):State{
 const s=structuredClone(state);validate(s,draft);
 const previous=s.purchases.find(p=>p.id===draft.id);
 if(draft.id&&!previous)throw Error('Orden inexistente.');
 if(previous&&previous.status!=='borrador'&&!(previous.status==='ordenada'&&!previous.items?.length))throw Error('Solo puedes editar borradores o completar órdenes antiguas sin detalle.');
 const purchase:Purchase={id:previous?.id||uid('COM'),date:previous?.date||today(),supplierId:draft.supplierId,warehouseId:draft.warehouseId,items:structuredClone(draft.items),notes:draft.notes.trim(),amount:sumItems(draft.items),status:'borrador'};
 if(previous)s.purchases=s.purchases.map(p=>p.id===previous.id?purchase:p);else s.purchases.unshift(purchase);
 log(s,previous?'Compra actualizada':'Compra creada',purchase.id);return s;
}
export function transitionPurchase(state:State,id:string,action:'ordenar'|'recibir'|'cancelar',document=''):State{
 const s=structuredClone(state),p=s.purchases.find(p=>p.id===id);if(!p)throw Error('Orden inexistente.');
 if(action==='cancelar'){if(!['borrador','ordenada'].includes(p.status))throw Error('No se puede cancelar esta orden.');p.status='cancelada';}
 else{
 if(p.status!==(action==='ordenar'?'borrador':'ordenada'))throw Error('La orden ya cambió de estado.');
 validate(s,{supplierId:p.supplierId,warehouseId:p.warehouseId||'',items:p.items||[],notes:p.notes||''});
 if(action==='ordenar')p.status='ordenada';
 else{
 if(!document.trim())throw Error('Ingresa la referencia del documento del proveedor.');
 if(s.purchases.some(other=>other.id!==id&&other.status==='recibida'&&other.supplierId===p.supplierId&&other.document?.toLowerCase()===document.trim().toLowerCase()))throw Error('Este documento ya fue recibido para el proveedor.');
 p.status='recibida';p.receivedAt=today();p.document=document.trim();
 for(const i of p.items!){const row=s.inventory.find(x=>x.productId===i.productId&&x.warehouseId===p.warehouseId);
 if(row)row.quantity+=i.qty;else s.inventory.push({productId:i.productId,warehouseId:p.warehouseId!,quantity:i.qty});
 s.movements.unshift({id:uid('MOV'),date:today(),productId:i.productId,warehouseId:p.warehouseId!,qty:i.qty,type:'Compra',reason:'Recepción de orden de compra',reference:id,thirdPartyId:p.supplierId,thirdPartyKind:'proveedor'});}
 }
 }
 log(s,action==='recibir'?'Compra recibida':action==='ordenar'?'Compra ordenada':'Compra cancelada',id);return s;
}
export function payPurchase(state:State,id:string):State{
 const s=structuredClone(state),p=s.purchases.find(p=>p.id===id);
 if(!p||p.status!=='recibida'||p.paidAt||!p.items?.length)throw Error('La compra no tiene un saldo pendiente válido.');
 p.paidAt=today();s.expenses.unshift({id:uid('PAG-COM'),date:today(),type:'egreso',amount:p.amount,category:'Compras',description:`Pago total ${p.id} · ${p.document}`,source:p.id});
 log(s,'Pago a proveedor',id);return s;
}
