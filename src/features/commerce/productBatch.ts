import type {Item,State} from '../../core/types';
import {stockOf,validateCommercialItems} from '../../core/operations';

type Mode='cotizacion'|'pedido'|'venta';

/**
 * Añade varias referencias de catálogo a un mismo documento sin duplicar productos.
 * No modifica el State, sus contratos ni los documentos almacenados.
 */
export function appendBatchProducts(state:State,existing:Item[],quantities:Record<string,number>,mode:Mode,warehouseId:string):Item[]{
 const ids=Object.keys(quantities);
 if(!ids.length)throw Error('Selecciona al menos un producto del catálogo.');
 const inDocument=new Set(existing.map(item=>item.productId));
 const additions:Item[]=[];
 for(const id of ids){
  const product=state.products.find(p=>p.id===id&&p.active&&!p.archivedAt);
  if(!product)throw Error('Uno de los productos seleccionados no está activo o ya no existe.');
  if(inDocument.has(id))throw Error(`${product.name} ya está en el documento. Cambia su cantidad en la tabla.`);
  const qty=quantities[id];
  if(!Number.isInteger(qty)||qty<=0)throw Error(`La cantidad de ${product.name} debe ser un entero mayor que cero.`);
  if(mode==='venta'&&qty>stockOf(state,id,warehouseId))throw Error(`Stock insuficiente para ${product.name} en el almacén seleccionado.`);
  additions.push({productId:id,qty,price:product.price,discount:0});
 }
 const result=[...existing.map(item=>({...item})),...additions];
 validateCommercialItems(state,result);
 return result;
}
