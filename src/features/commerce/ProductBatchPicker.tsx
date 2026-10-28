import {useEffect,useId,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {CheckSquare,ChevronLeft,ChevronRight,PackagePlus,Search,X} from 'lucide-react';
import type {Item,State} from '../../core/types';
import {money} from '../../core/types';
import {stockOf} from '../../core/operations';
import {appendBatchProducts} from './productBatch';
import './product-batch.css';

type Mode='cotizacion'|'pedido'|'venta';
type Props={state:State;items:Item[];mode:Mode;warehouseId:string;onAdd:(next:Item[])=>void};
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-PE');

/** Selección múltiple con cantidades independientes, filtros y selección conservada entre páginas. */
export function ProductBatchPicker({state,items,mode,warehouseId,onAdd}:Props){
 const id=useId();
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [page,setPage]=useState(1);
 const [size,setSize]=useState(10);
 const [quantities,setQuantities]=useState<Record<string,string>>({});
 const [error,setError]=useState('');
 const existing=useMemo(()=>new Set(items.map(item=>item.productId)),[items]);
 const available=useMemo(()=>state.products.filter(p=>p.active&&!p.archivedAt),[state.products]);
 const filtered=useMemo(()=>available.filter(p=>normalize(`${p.sku} ${p.name} ${p.category} ${p.brand??''}`).includes(normalize(query.trim()))),[available,query]);
 const pages=Math.max(1,Math.ceil(filtered.length/size));
 const current=Math.min(page,pages);
 const visible=filtered.slice((current-1)*size,current*size);
 const selectable=(productId:string)=>!existing.has(productId)&&(mode!=='venta'||stockOf(state,productId,warehouseId)>0);
 const selectableFiltered=filtered.filter(p=>selectable(p.id));
 const chosen=Object.keys(quantities).length;
 const allFilteredSelected=selectableFiltered.length>0&&selectableFiltered.every(p=>quantities[p.id]!==undefined);
 const openDialog=()=>{setQuantities({});setError('');setQuery('');setPage(1);setOpen(true);};
 const close=()=>{setOpen(false);setError('');};
 useEffect(()=>{
  if(!open)return;
  const handleEscape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}};
  window.addEventListener('keydown',handleEscape);
  const original=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return ()=>{window.removeEventListener('keydown',handleEscape);document.body.style.overflow=original;};
 },[open]);
 const toggle=(productId:string)=>{setError('');setQuantities(previous=>{
  const next={...previous};
  if(next[productId]!==undefined)delete next[productId];else next[productId]='1';
  return next;
 });};
 const toggleAllFiltered=()=>{setError('');setQuantities(previous=>{
  const next={...previous};
  if(allFilteredSelected)selectableFiltered.forEach(product=>{delete next[product.id];});
  else selectableFiltered.forEach(product=>{if(next[product.id]===undefined)next[product.id]='1';});
  return next;
 });};
 const apply=()=>{setError('');try{
  const parsed=Object.fromEntries(Object.entries(quantities).map(([key,value])=>[key,Number(value)]));
  const next=appendBatchProducts(state,items,parsed,mode,warehouseId);
  onAdd(next);close();
 }catch(e){setError(e instanceof Error?e.message:'No fue posible añadir los productos.');}};
 const countStock=(productId:string)=>stockOf(state,productId,mode==='venta'?warehouseId:undefined);
 const priceTotal=state.products.reduce((total,p)=>{
  const q=Number(quantities[p.id]);return quantities[p.id]!==undefined&&Number.isInteger(q)&&q>0?total+q*p.price:total;
 },0);
 return <>
  <button type="button" className="btn btn-primary commerce-batch-open" onClick={openDialog}><PackagePlus size={17}/> Seleccionar varios productos</button>
  {open&&createPortal(<div className="erp-lookup-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
   <section role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} className="erp-lookup-dialog commerce-batch-dialog">
    <header><div><span className="eyebrow">CATÁLOGO · SELECCIÓN MÚLTIPLE</span><h2 id={`${id}-title`}>Agregar productos a {mode==='cotizacion'?'la cotización':mode==='pedido'?'el pedido':'la venta'}</h2><small>Marca tantos productos como necesites, indica cantidades y agrégalos juntos. Se conservan al cambiar de página.</small></div><button className="erp-lookup-close" type="button" aria-label="Cerrar catálogo" onClick={close}><X size={19}/></button></header>
    <div className="erp-lookup-body">
     <label className="erp-lookup-search"><Search size={17}/><input autoFocus type="search" placeholder="Buscar por SKU, nombre, marca o categoría…" aria-label="Buscar productos del catálogo" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label>
     <div className="commerce-batch-bar"><label><input type="checkbox" checked={allFilteredSelected} disabled={!selectableFiltered.length} onChange={toggleAllFiltered}/> Seleccionar todos los resultados del filtro ({selectableFiltered.length})</label><span><CheckSquare size={15}/> {chosen} seleccionado{chosen===1?'':'s'}</span></div>
     <div className="table-responsive erp-lookup-scroller commerce-batch-scroller"><table className="table table-hover align-middle"><thead><tr><th>Elegir</th><th>SKU</th><th>Producto</th><th>Stock disponible</th><th>Precio unitario</th><th>Cantidad</th></tr></thead><tbody>{visible.map(p=>{
      const isChosen=quantities[p.id]!==undefined;
      const inDocument=existing.has(p.id);
      const isSelectable=selectable(p.id);
      const stock=countStock(p.id);
      return <tr key={p.id} className={isChosen?'commerce-batch-selected':''}><td><input aria-label={`Seleccionar ${p.name}`} type="checkbox" checked={isChosen} disabled={!isSelectable} onChange={()=>toggle(p.id)}/></td><td>{p.sku}</td><td><strong>{p.name}</strong>{inDocument&&<span className="commerce-batch-hint">Ya agregado al documento</span>}{!inDocument&&!isSelectable&&<span className="commerce-batch-hint">Sin existencias</span>}</td><td>{stock} uds.</td><td>{money(p.price)}</td><td>{isChosen?<input className="form-control commerce-batch-qty" type="number" min="1" step="1" aria-label={`Cantidad de ${p.name}`} value={quantities[p.id]} onChange={e=>setQuantities(previous=>({...previous,[p.id]:e.target.value}))}/>:<span className="text-secondary">—</span>}</td></tr>;
     })}</tbody></table></div>
     {!filtered.length&&<p className="erp-lookup-empty">No se encontraron productos con ese filtro.</p>}
     <div className="erp-lookup-footer"><span>{filtered.length} resultados · Página {current} de {pages}</span><label>Filas <select aria-label="Productos por página" value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1);}}>{[10,20,50].map(n=><option key={n} value={n}>{n}</option>)}</select></label><button type="button" aria-label="Página anterior" disabled={current===1} onClick={()=>setPage(x=>x-1)}><ChevronLeft size={17}/></button><button type="button" aria-label="Página siguiente" disabled={current===pages} onClick={()=>setPage(x=>x+1)}><ChevronRight size={17}/></button></div>
     {error&&<div className="alert alert-danger mb-0" role="alert">{error}</div>}
     <div className="commerce-batch-actions"><div><b>{chosen} producto{chosen===1?'':'s'}</b> <span>· Importe estimado {money(priceTotal)}</span><small>Podrás editar precio y descuento en la tabla del documento antes de guardarlo.</small></div><button type="button" className="btn btn-outline-secondary" onClick={close}>Cancelar</button><button type="button" className="btn btn-primary" disabled={!chosen} onClick={apply}>Agregar {chosen} al documento</button></div>
    </div>
   </section></div>,document.body)}
 </>;
}
