import {useEffect,useState} from 'react';
import {RecordPicker} from '../../components/RecordPicker';
import {Field,Panel} from '../../components/ui';
import {useStore} from '../../core/store';
import type {Item} from '../../core/types';
import {calcBase,calcIGV,money,sumItems} from '../../core/types';
import {stockOf,validateCommercialItems} from '../../core/operations';
import {useCommerce} from './Shared';
import {ProductBatchPicker} from './ProductBatchPicker';

type Mode='cotizacion'|'pedido'|'venta';
type Props={mode:Mode;onSave:(clientId:string,items:Item[],warehouseId:string)=>void;initialClient?:string;initialItems?:Item[];locked?:boolean};
/** Editor único para los tres documentos; los importes incluyen IGV 18 %. */
export function DocumentBuilder({mode,onSave,initialClient='',initialItems=[],locked=false}:Props){
 const {state:s}=useStore();const {productName}=useCommerce();
 const [client,setClient]=useState(initialClient),[warehouse,setWarehouse]=useState(()=>(s.warehouses.find(w=>!w.status||w.status==='Activo')??s.warehouses[0])?.id??'');
 const [product,setProduct]=useState(''),[qty,setQty]=useState('1'),[price,setPrice]=useState(''),[discount,setDiscount]=useState('0');
 const [items,setItems]=useState<Item[]>(()=>initialItems.map(i=>({...i})));
 const [error,setError]=useState('');
 useEffect(()=>{if(initialClient)setClient(initialClient);},[initialClient]);
 useEffect(()=>{if(initialItems.length)setItems(initialItems.map(i=>({...i})));},[initialItems]);
 const selected=s.products.find(p=>p.id===product);
 const changeProduct=(id:string)=>{setProduct(id);const p=s.products.find(p=>p.id===id);if(p)setPrice(String(p.price));};
 const addLine=()=>{setError('');try{
  if(locked)throw Error('Las líneas del documento original no pueden modificarse.');
  if(!selected)throw Error('Selecciona un producto activo.');
  const n=Number(qty),v=Number(price),d=Number(discount);
  const next={productId:product,qty:n,price:v,discount:d};
  // Sumar cantidades cuando el mismo producto conserva precio y descuento.
  const current=items.find(i=>i.productId===product);
  if(current&&(current.price!==v||current.discount!==d))throw Error('El producto ya existe con otro precio o descuento. Edita su línea en la tabla.');
  const merged=current?items.map(i=>i.productId===product?{...i,qty:i.qty+n}:i):[...items,next];
  validateCommercialItems(s,merged);
  setItems(merged);setProduct('');setQty('1');setPrice('');setDiscount('0');
 }catch(e){setError(e instanceof Error?e.message:'No se pudo agregar el producto.');}};
 const edit=(id:string,field:'qty'|'price'|'discount',value:string)=>setItems(old=>old.map(i=>i.productId===id?{...i,[field]:value===''?NaN:Number(value)}:i));
 const base=sumItems(items),gross=items.reduce((a,i)=>a+i.qty*i.price,0),disc=Math.round((gross-base)*100)/100;
 const submit=()=>{setError('');try{if(!client)throw Error('Selecciona un cliente.');validateCommercialItems(s,items);onSave(client,items.map(i=>({...i})),warehouse);}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el documento.');}};
 return <Panel title={mode==='cotizacion'?'Preparar cotización':mode==='pedido'?'Preparar pedido':'Registrar venta'}>
 {locked&&<div className="alert alert-info">Cliente y productos heredados del pedido. No es posible cambiar sus líneas; continúa con el almacén.</div>}
 {error&&<div role="alert" className="alert alert-danger">{error}</div>}
 <div className="commerce-builder-grid"><div>
 <RecordPicker label="Cliente" required rows={s.clients.filter(c=>c.active||c.id===client)} value={client} onChange={locked?()=>{}:setClient} getId={c=>c.id} getLabel={c=>c.name} columns={[{label:'Cliente',value:c=>c.name},{label:'Documento',value:c=>c.document,search:c=>c.document},{label:'Estado',value:c=>c.active?'Activo':'Inactivo'}]}/>
 {locked&&<p className="text-secondary small">El cliente se comprobará frente al pedido antes de confirmar.</p>}
 {mode==='venta'&&<Field label="Almacén de salida"><select className="form-select" value={warehouse} onChange={e=>setWarehouse(e.target.value)}>{s.warehouses.filter(w=>!w.status||w.status==='Activo').map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>}
 {!locked&&<><ProductBatchPicker state={s} items={items} mode={mode} warehouseId={warehouse} onAdd={next=>{setItems(next);setError('');}}/><p className="commerce-batch-helper">Selecciona varios productos en un solo paso, o añade uno individualmente a continuación.</p><div className="commerce-line-form"><RecordPicker label="Producto" required rows={s.products.filter(p=>p.active&&!p.archivedAt)} value={product} onChange={changeProduct} getId={p=>p.id} getLabel={p=>p.name} columns={[{label:'SKU',value:p=>p.sku,search:p=>p.sku},{label:'Producto',value:p=>p.name},{label:'Stock disponible',value:p=>stockOf(s,p.id,mode==='venta'?warehouse:undefined)},{label:'Precio',value:p=>money(p.price)}]} details={p=><span>Disponible {mode==='venta'?stockOf(s,p.id,warehouse):stockOf(s,p.id)} unidades · {money(p.price)}</span>}/>
 <label>Cantidad<input className="form-control" type="number" min="1" step="1" value={qty} onChange={e=>setQty(e.target.value)}/></label><label>Precio S/<input className="form-control" type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label><label>Descuento %<input className="form-control" type="number" min="0" max="100" step="0.01" value={discount} onChange={e=>setDiscount(e.target.value)}/></label>
 <button type="button" className="btn btn-outline-primary" onClick={addLine}>Añadir producto</button></div></>}
 </div><aside className="commerce-totals"><strong>Resumen del documento</strong><div><span>Líneas</span><b>{items.length}</b></div><div><span>Importe bruto</span><b>{money(gross)}</b></div><div><span>Descuentos</span><b>− {money(disc)}</b></div><div><span>Base imponible</span><b>{money(calcBase(base))}</b></div><div><span>IGV incluido (18 %)</span><b>{money(calcIGV(base))}</b></div><div className="commerce-total-final"><span>Total</span><strong>{money(base)}</strong></div><small>Los precios incluyen IGV; la cotización no descuenta inventario.</small></aside></div>
 <div className="table-responsive commerce-lines"><table className="table table-hover align-middle"><thead><tr><th>Producto</th><th>Stock disponible</th><th>Cantidad</th><th>Precio unitario</th><th>Descuento %</th><th>Importe</th><th>Acción</th></tr></thead><tbody>{items.map(i=><tr key={i.productId}><td>{productName(i.productId)}</td><td>{stockOf(s,i.productId,mode==='venta'?warehouse:undefined)} uds.</td><td><input aria-label={`Cantidad de ${productName(i.productId)}`} className="form-control commerce-line-input" type="number" min="1" step="1" disabled={locked} value={Number.isNaN(i.qty)?'':i.qty} onChange={e=>edit(i.productId,'qty',e.target.value)}/></td><td><input aria-label={`Precio de ${productName(i.productId)}`} className="form-control commerce-line-input" type="number" step="0.01" min="0" disabled={locked} value={Number.isNaN(i.price)?'':i.price} onChange={e=>edit(i.productId,'price',e.target.value)}/></td><td><input aria-label={`Descuento de ${productName(i.productId)}`} className="form-control commerce-line-input" type="number" min="0" max="100" step="0.01" disabled={locked} value={Number.isNaN(i.discount)?'':i.discount} onChange={e=>edit(i.productId,'discount',e.target.value)}/></td><td>{money(sumItems([i]))}</td><td><button type="button" className="btn btn-sm btn-outline-danger" disabled={locked} onClick={()=>setItems(old=>old.filter(x=>x.productId!==i.productId))}>Quitar</button></td></tr>)}{!items.length&&<tr><td colSpan={7} className="text-center text-secondary py-4">No hay productos agregados.</td></tr>}</tbody></table></div>
 <div className="align-end"><button type="button" className="btn btn-primary" disabled={!client||!items.length} onClick={submit}>{mode==='cotizacion'?'Guardar borrador':mode==='pedido'?'Registrar pedido':'Registrar venta'}</button></div>
 </Panel>;
}
