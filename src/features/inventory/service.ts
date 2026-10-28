import type {State, Product, Warehouse,InventoryDocument} from '../../core/types';
import {uid, today} from '../../core/types';
import {stockOf, transfer, adjustStock} from '../../core/operations';
import {warehouseAvailable} from './model';
import {appendDocuments} from './documents';

export const categoriesOf = (s:State) => [...new Set([...(s.categories ?? []), ...s.products.map(p=>p.category)])].sort();
const normalized = (v:string) => v.trim().toLocaleLowerCase('es');
const assert = (condition:unknown, message:string) => {if(!condition)throw Error(message);};
function audit(s:State, action:string, description:string) {
  s.audit.unshift({id:uid('AUD'),date:today(),action,description});
}
export function newProductId(s:State):string {
  let id:string;do{id=`PRO-${crypto.randomUUID().toUpperCase()}`;}while(s.products.some(p=>p.id===id));return id;
}
export function saveProduct(state:State,data:Product,editing=false):State {
  const s=structuredClone(state),existing=s.products.find(p=>p.id===data.id);
  assert(editing?!!existing:!existing,editing?'Producto inexistente.':'El ID ya existe. Cierra el formulario y crea el producto nuevamente.');
  assert(!existing?.archivedAt,'No se puede modificar un producto archivado.');
  const p={...data,name:data.name.trim(),sku:existing?.sku??data.id,active:true,min:existing?.min??0,stockReference:existing?.stockReference??0};
  assert(p.name&&p.id&&categoriesOf(s).includes(p.category),'Completa nombre y categoría.');
  assert(Number.isFinite(p.price)&&p.price>=0&&Number.isFinite(p.cost)&&p.cost>=0,'Precio y costo deben ser números no negativos.');
  assert(!p.supplierId||s.suppliers.some(x=>x.id===p.supplierId),'Proveedor no disponible.');
  if(editing)s.products[s.products.findIndex(x=>x.id===p.id)]=p;
  else {s.products.unshift(p);s.inventory.push(...s.warehouses.map(w=>({productId:p.id,warehouseId:w.id,quantity:0})));}
  audit(s,'Producto guardado',p.id);return s;
}
export function deleteProduct(state:State,id:string):State {
  assert(!state.inventory.some(i=>i.productId===id&&i.quantity!==0),'Solo se permite eliminar productos con stock global cero (0%).');
  const s=structuredClone(state),p=s.products.find(p=>p.id===id);assert(p,'Producto inexistente.');
  p!.archivedAt=new Date().toISOString();p!.active=false;
  audit(s,'Producto archivado',`${id}: historial conservado`);return s;
}
export function saveCategory(state:State,name:string,previous?:string):State {
  const s=structuredClone(state), value=name.trim(), categories=categoriesOf(s);
  assert(value,'Escribe un nombre para la categoría.');
  assert(!categories.some(c=>c!==previous&&normalized(c)===normalized(value)),'La categoría ya existe.');
  s.categories=previous?categories.map(c=>c===previous?value:c):[...categories,value];
  if(previous)s.products.forEach(p=>{if(p.category===previous)p.category=value;});
  audit(s,'Categoría guardada',value);return s;
}
export function deleteCategory(state:State,name:string):State {
  assert(!state.products.some(p=>p.category===name),'La categoría tiene productos asociados. Reasígnalos antes de eliminarla.');
  const s=structuredClone(state);s.categories=categoriesOf(s).filter(c=>c!==name);audit(s,'Categoría eliminada',name);return s;
}
export function saveWarehouse(state:State,data:Warehouse,editing=false):State {
  const s=structuredClone(state), w={...data,id:data.id.trim().toUpperCase(),name:data.name.trim(),city:data.city.trim()};
  assert(/^[A-Z0-9_-]{3,50}$/.test(w.id),'Código de almacén: usa de 3 a 50 letras, números, guiones o guiones bajos.');
  assert(editing?s.warehouses.some(x=>x.id===w.id):!s.warehouses.some(x=>x.id.toUpperCase()===w.id),'Código de almacén duplicado o inexistente.');
  assert(!w.email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(w.email),'Correo no válido.');
  assert(!w.phone||/^[+0-9 ()-]{6,25}$/.test(w.phone),'Teléfono no válido.');
  assert(!w.ubigeo||/^\d{6}$/.test(w.ubigeo),'El ubigeo debe tener 6 dígitos.');
  assert(w.name&&w.city,'Completa nombre y ubicación.');
  assert(!s.warehouses.some(x=>x.id!==w.id&&normalized(x.name)===normalized(w.name)),'Ya existe un almacén con ese nombre.');
  const index=s.warehouses.findIndex(x=>x.id===w.id);
  if(index>=0)s.warehouses[index]=w;
  else {s.warehouses.push(w);s.inventory.push(...s.products.map(p=>({productId:p.id,warehouseId:w.id,quantity:0})));}
  audit(s,'Almacén guardado',w.name);return s;
}
export function deleteWarehouse(state:State,id:string):State {
  assert(!state.inventory.some(i=>i.warehouseId===id&&i.quantity!==0),'El almacén tiene existencias.');
  assert(!state.movements.some(m=>m.warehouseId===id)&&!state.sales.some(x=>x.warehouseId===id),'El almacén tiene historial y debe conservarse.');
  const s=structuredClone(state);s.warehouses=s.warehouses.filter(w=>w.id!==id);s.inventory=s.inventory.filter(i=>i.warehouseId!==id);audit(s,'Almacén eliminado',id);return s;
}
export type Transaction={kind:'Entrada'|'Salida'|'Transferencia'|'Ajuste'|'Devolución';productId:string;warehouseId:string;destination:string;quantity:number;reason:string;reference:string;thirdPartyId:string;thirdPartyKind:'cliente'|'proveedor';documents?:InventoryDocument[];actor?:string};
export function postTransaction(state:State,t:Transaction):State {
  assert(state.products.some(p=>p.id===t.productId&&p.active),'Selecciona un producto activo.');
  assert(warehouseAvailable(state,t.warehouseId),'Selecciona un almacén activo.');
  if(t.kind==='Transferencia')assert(warehouseAvailable(state,t.destination),'El destino debe ser un almacén activo.');
  assert(Number.isSafeInteger(t.quantity)&&t.quantity>=(t.kind==='Ajuste'?0:1),'La cantidad debe ser un entero válido.');
  assert(t.reason.trim(),'El motivo es obligatorio.');
  if(t.kind==='Entrada'||t.kind==='Salida'||t.kind==='Devolución')assert(t.thirdPartyKind==='cliente'?state.clients.some(c=>c.id===t.thirdPartyId&&c.active):state.suppliers.some(c=>c.id===t.thirdPartyId),'Selecciona un cliente o proveedor registrado.');
  let s:State;
  if(t.kind==='Transferencia')s=transfer(state,t.productId,t.warehouseId,t.destination,t.quantity);
  else if(t.kind==='Ajuste') {
    assert(t.quantity!==stockOf(state,t.productId,t.warehouseId),'El saldo físico coincide con el saldo actual. No hay ajuste que registrar.');
    s=adjustStock(state,t.productId,t.warehouseId,t.quantity,t.reason);
  } else {
    s=structuredClone(state);const inv=s.inventory.find(i=>i.productId===t.productId&&i.warehouseId===t.warehouseId);
    assert(inv,'No existe el saldo del producto en este almacén.');
    const delta=(t.kind==='Entrada'||t.kind==='Devolución')?t.quantity:-t.quantity;
    assert(inv!.quantity+delta>=0,'Stock insuficiente en el almacén seleccionado.');
    inv!.quantity+=delta;
    s.movements.unshift({id:uid('MOV'),date:today(),productId:t.productId,warehouseId:t.warehouseId,qty:delta,type:t.kind,reason:t.reason.trim(),reference:t.reference.trim()||uid('INV'),thirdPartyId:t.thirdPartyId,thirdPartyKind:t.thirdPartyKind});
    audit(s,t.kind,`${t.productId}: ${delta}`);
  }
  // Enrich only newly appended ledger entries; legacy commercial entries remain compatible.
  const existing=new Set(state.movements.map(m=>m.id));
  for(const m of s.movements)if(!existing.has(m.id)){
    m.createdAt=new Date().toISOString();m.balanceAfter=stockOf(s,m.productId,m.warehouseId);m.reason=t.reason.trim();m.actor=t.actor;
  }
  const fresh=s.movements.filter(m=>!existing.has(m.id));
  if(t.documents?.length){const reference=fresh[0]?.reference??uid('INV');
    appendDocuments(s,t.documents.map(d=>({...d,reference,productId:t.productId,warehouseId:t.warehouseId,movementIds:fresh.map(m=>m.id)})));
    fresh.forEach(m=>{m.documentIds=t.documents!.map(d=>d.id);});}
  return s;
}
export function createThirdParty(state:State,kind:'cliente'|'proveedor',name:string,document:string):{state:State;id:string} {
  const s=structuredClone(state);name=name.trim();document=document.trim();
  assert(name.length>=2,'Ingresa un nombre válido.');
  assert(kind==='proveedor'?/^\d{11}$/.test(document):/^(\d{8}|\d{11})$/.test(document),'Usa DNI de 8 dígitos o RUC de 11 (proveedores: solo RUC).');
  assert(kind==='cliente'?!s.clients.some(c=>c.document===document):!s.suppliers.some(c=>c.ruc===document),'El documento ya está registrado en este catálogo.');
  const id=uid(kind==='cliente'?'CLI':'PRV');
  if(kind==='cliente')s.clients.unshift({id,name,document,email:'',phone:'',segment:'Empresa',active:true});
  else s.suppliers.unshift({id,name,ruc:document});
  audit(s,'Tercero creado',`${kind}: ${name}`);return {state:s,id};
}
