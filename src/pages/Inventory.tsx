import {useState} from 'react';
import type {ReactNode} from 'react';
import {NavLink} from 'react-router-dom';
import {Package,Warehouse as WarehouseIcon,Activity,TriangleAlert,Plus} from 'lucide-react';
import {useStore} from '../core/store';
import {money} from '../core/types';
import type {Movement,Product} from '../core/types';
import {stockOf} from '../core/operations';
import {DataTable} from '../features/inventory/DataTable';
import type {Column} from '../features/inventory/DataTable';
import {CategoryForm,DeleteForm,ProductForm,TransactionForm,WarehouseForm,ProductDetail,DocumentForm,ReferenceDetail,DeleteDocumentForm} from '../features/inventory/Forms';
import {categoriesOf,deleteCategory,deleteProduct,deleteWarehouse} from '../features/inventory/service';
import {stockStatus,movementType,partyName} from '../features/inventory/model';
import {downloadDocument} from '../features/inventory/documents';
import '../styles/inventory.css';
const tabs=[['productos','Productos'],['categorias','Categorías'],['almacenes','Almacenes'],['stock','Existencias'],['kardex','Kardex'],['transferencias','Transferencias'],['ajustes','Ajustes'],['movimientos','Movimientos'],['documentos-inventario','Documentos']] as const;
export default function InventoryPage({section}:{section:string}) {
  const {state:s}=useStore(),[modal,setModal]=useState<ReactNode>(null),[message,setMessage]=useState(''),[showArchived,setShowArchived]=useState(false);
  const close=()=>setModal(null),saved=()=>setMessage('Operación guardada. Los datos del ERP están actualizados.');
  const props={onClose:close,onSaved:saved};
  const pname=(id:string)=>s.products.find(p=>p.id===id)?.name??id,wname=(id:string)=>s.warehouses.find(w=>w.id===id)?.name??id;
  const badge=(text:string,tone='neutral')=><span className={`inv-badge ${tone}`}>{text}</span>;
  const action=(label:string,fn:()=>void)=><button className="btn mini" type="button" onClick={fn}>{label}</button>;
  const low=s.products.filter(p=>!p.archivedAt&&stockStatus(s,p).percent<=50);
  const master=['productos','categorias','almacenes'].includes(section);
  const stateBadge=(p:Product)=>{const info=stockStatus(s,p);return <span className={`inv-badge ${info.tone}`}>{info.label} · {info.percent.toFixed(1)}%</span>;};
  const productColumns:Column<Product>[]=[
    {key:'id',label:'ID',value:p=>p.id},
    {key:'name',label:'Producto',value:p=>p.name,render:p=><div className="inv-product"><span><Package size={18}/></span><div><b>{p.name}</b><small>{[p.brand,p.model].filter(Boolean).join(' · ')||'Marca/modelo sin registrar'}</small></div></div>},
    {key:'category',label:'Categoría',value:p=>p.category},
    {key:'price',label:'Reventa',value:p=>p.price,render:p=>money(p.price)},
    {key:'stock',label:'Stock global',value:p=>stockOf(s,p.id)},
    {key:'state',label:'Estado de stock',value:p=>`${stockStatus(s,p).label} ${stockStatus(s,p).percent.toFixed(1)}%`,render:stateBadge},
    {key:'actions',label:'Acciones',value:()=>'',filter:false,render:p=><div className="inv-row-actions">{action('Detalle',()=>setModal(<ProductDetail id={p.id} onClose={close}/>))}{!p.archivedAt&&<>{action('Editar',()=>setModal(<ProductForm product={p} {...props}/>))}<button className="btn mini" disabled={stockOf(s,p.id)!==0} title={stockOf(s,p.id)!==0?'Solo disponible con stock cero':'Eliminar del catálogo y conservar historial'} onClick={()=>setModal(<DeleteForm archive label={p.name} operation={s=>deleteProduct(s,p.id)} {...props}/>)}>Eliminar</button></>}</div>}
  ];
  // The shared ledger is newest-first. Preserve insertion order for legacy date-only entries.
  const movements=s.movements.filter(m=>(section!=='transferencias'||m.type==='Transferencia')&&(section!=='ajustes'||m.type==='Ajuste')).sort((a,b)=>(b.createdAt??b.date).localeCompare(a.createdAt??a.date));
  const movementColumns:Column<Movement>[]=[
    {key:'id',label:'ID movimiento',value:m=>m.id},
    {key:'date',label:'Fecha y hora',value:m=>m.createdAt??m.date,render:m=>m.createdAt?new Date(m.createdAt).toLocaleString('es-PE'):<>{m.date}<small>Hora no registrada</small></>},
    {key:'type',label:'Tipo de movimiento',value:m=>movementType(m,section==='movimientos'),render:m=>badge(movementType(m,section==='movimientos'),m.type==='Ajuste'?'warning':m.type==='Transferencia'?'neutral':m.qty>0?'success':'danger')},
    {key:'product',label:'ID / Producto',value:m=>`${m.productId} ${pname(m.productId)}`,render:m=><><b>{pname(m.productId)}</b><small>{m.productId}</small></>},
    {key:'warehouse',label:'Almacén',value:m=>wname(m.warehouseId)},
    {key:'qty',label:section==='movimientos'?'Cantidad':'Variación',value:m=>section==='movimientos'?Math.abs(m.qty):m.qty,render:m=><strong className={m.qty>0?'inv-positive':'inv-negative'}>{section==='movimientos'?Math.abs(m.qty):`${m.qty>0?'+':''}${m.qty}`}<small>{m.type==='Venta'?'Vendidas':m.qty>0?'Ingresan':'Salen'}</small></strong>},
    {key:'balance',label:'Stock resultante',value:m=>m.balanceAfter??'No registrado',render:m=><>{m.balanceAfter??'No registrado'}{m.balanceSource==='reconstruido'&&<small>Reconstruido del historial</small>}</>},
    {key:'party',label:'Cliente / Proveedor',value:m=>partyName(s,m)},
    {key:'reason',label:'Motivo / Origen',value:m=>`${m.reason} ${m.actor??''}`,render:m=><>{m.reason}<small>{m.actor??'Usuario no registrado'} · {m.type==='Apertura'?'Stock inicial':m.type}</small></>},
    {key:'reference',label:'Referencia',value:m=>m.reference,render:m=><button className="btn mini" onClick={()=>setModal(<ReferenceDetail reference={m.reference} onClose={close}/>)}>{m.reference}{m.documentIds?.length?` · ${m.documentIds.length} adj.`:''}</button>}
  ];
  const ledger=['kardex','movimientos','transferencias','ajustes'].includes(section);
  return <div className="inventory-module stack"><div className="inv-heading"><div><span className="eyebrow">INVENTARIO · CONTROL OPERATIVO</span><h1>{tabs.find(t=>t[0]===section)?.[1]??'Inventario'}</h1><p>Catálogo centralizado y trazabilidad de tus existencias.</p></div><span className="inv-local"><i/> Persistencia local</span></div>
    {!master&&<div className="inv-stats">{[{label:'Productos activos',value:s.products.filter(p=>p.active).length,hint:`${categoriesOf(s).length} categorías`,icon:Package},{label:'Unidades en stock',value:s.inventory.reduce((a,i)=>a+i.quantity,0).toLocaleString('es-PE'),hint:`${s.warehouses.length} almacenes`,icon:WarehouseIcon},{label:'Valor del inventario',value:money(s.inventory.reduce((a,i)=>a+i.quantity*(s.products.find(p=>p.id===i.productId)?.cost??0),0)),hint:'Valorizado al costo actual',icon:Activity},{label:'Alertas de reposición',value:low.length,hint:'Productos al 50% o menos',icon:TriangleAlert}].map(({label,value,hint,icon:Icon})=><div className="inv-stat" key={label}><div><span>{label}</span><Icon size={19}/></div><strong>{value}</strong><small>{hint}</small></div>)}</div>}
    {section==='stock'&&low.length>0&&<section className="inv-stock-alerts" aria-live="polite"><h2>Alertas de reposición · {low.length} productos</h2>{low.slice(0,8).map(p=>{const info=stockStatus(s,p);return <div key={p.id} className={`inv-stock-alert ${info.tone}`}><div><b>{p.name}</b><small>{p.id}</small><span>{info.quantity===0?'Agotado: el producto se terminó. Necesita reposición.':info.percent<=10?'Stock crítico: quedan pocas unidades. Solicita reposición urgente al proveedor.':'Stock al 50% o menos. Solicita más unidades al proveedor.'}</span></div><b>{info.quantity} unidades · {info.percent.toFixed(1)}%</b></div>;})}{low.length>8&&<p className="inv-note">Se muestran las primeras 8 alertas. Consulta el listado paginado de existencias para ver todas.</p>}</section>}
    <nav className="inv-tabs" aria-label="Módulos relacionados">{tabs.filter(([path])=>['productos','categorias','almacenes'].includes(section)?['productos','categorias','almacenes'].includes(path):!['productos','categorias','almacenes'].includes(path)).map(([path,label])=><NavLink key={path} to={`/${path}`}>{label}</NavLink>)}</nav>
    {message&&<div className="inv-notice" role="status">{message}<button type="button" aria-label="Cerrar aviso" onClick={()=>setMessage('')}>✕</button></div>}
    <div className="inv-section-head"><div><h2>{tabs.find(t=>t[0]===section)?.[1]}</h2><p>{{productos:'Administra el catálogo compartido de productos.',categorias:'Organiza tus productos y mantén sus categorías actualizadas.',almacenes:'Ubicaciones y capacidad operativa de tu inventario.',stock:'Consulta existencias por producto y almacén.',kardex:'Consulta entradas, salidas y referencias del historial.',movimientos:'Registra entradas y salidas con clientes y proveedores.',transferencias:'Traslada unidades sin alterar el stock total.',ajustes:'Concilia las existencias con el conteo físico.','documentos-inventario':'Archivo local de guías, devoluciones y órdenes vinculadas a sus operaciones.'}[section]}</p></div><div className="inv-row-actions">
    {section==='productos'&&<button className="btn inv-primary" onClick={()=>setModal(<ProductForm {...props}/>)}><Plus size={16}/> Nuevo producto</button>}
    {section==='categorias'&&<button className="btn inv-primary" onClick={()=>setModal(<CategoryForm {...props}/>)}><Plus size={16}/> Nueva categoría</button>}
    {section==='almacenes'&&<button className="btn inv-primary" onClick={()=>setModal(<WarehouseForm {...props}/>)}><Plus size={16}/> Nuevo almacén</button>}
    {['stock','kardex','movimientos'].includes(section)&&<>{action('Registrar devolución',()=>setModal(<TransactionForm kind="Devolución" {...props}/>))}{action('Registrar salida',()=>setModal(<TransactionForm kind="Salida" {...props}/>))}<button className="btn inv-primary" onClick={()=>setModal(<TransactionForm kind="Entrada" {...props}/>)}><Plus size={16}/> Registrar entrada</button></>}
    {section==='transferencias'&&<button className="btn inv-primary" onClick={()=>setModal(<TransactionForm kind="Transferencia" {...props}/>)}>Nueva transferencia</button>}
    {section==='ajustes'&&<button className="btn inv-primary" onClick={()=>setModal(<TransactionForm kind="Ajuste" {...props}/>)}>Nuevo ajuste</button>}</div></div>
    {section==='productos'&&<><label className="inv-archive-toggle"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> Ver historial de productos archivados</label><DataTable key={showArchived?'archive':'catalog'} title={showArchived?'Historial de productos archivados':'Catálogo de productos'} rows={s.products.filter(p=>showArchived?!!p.archivedAt:!p.archivedAt)} columns={productColumns} rowKey={p=>p.id}/></>}
    {section==='categorias'&&<DataTable title="Catálogo de categorías" rows={categoriesOf(s).map(name=>({name,count:s.products.filter(p=>p.category===name).length}))} rowKey={c=>c.name} columns={[{key:'name',label:'Categoría',value:c=>c.name},{key:'count',label:'Productos',value:c=>c.count},{key:'actions',label:'Acciones',filter:false,value:()=>'',render:c=><div className="inv-row-actions">{action('Editar',()=>setModal(<CategoryForm previous={c.name} {...props}/>))}{action('Eliminar',()=>setModal(<DeleteForm label={c.name} operation={s=>deleteCategory(s,c.name)} {...props}/>))}</div>}]}/>}
    {section==='almacenes'&&<DataTable title="Red de almacenes" rows={s.warehouses} rowKey={w=>w.id} columns={[
      {key:'id',label:'Código',value:w=>w.id},{key:'name',label:'Almacén',value:w=>w.name},{key:'kind',label:'Tipo',value:w=>w.kind??'Central'},
      {key:'location',label:'Ubicación',value:w=>[w.address,w.district,w.city,w.department,w.ubigeo].filter(Boolean).join(' · ')},
      {key:'manager',label:'Responsable',value:w=>w.manager??'Sin asignar'},{key:'contact',label:'Contacto',value:w=>[w.phone,w.email].filter(Boolean).join(' · ')},
      {key:'status',label:'Estado',value:w=>w.status??'Activo',render:w=>badge(w.status??'Activo',!w.status||w.status==='Activo'?'success':'warning')},
      {key:'units',label:'Unidades',value:w=>s.inventory.filter(i=>i.warehouseId===w.id).reduce((a,i)=>a+i.quantity,0)},
      {key:'actions',label:'Acciones',filter:false,value:()=>'',render:w=><div className="inv-row-actions">{action('Editar / Detalle',()=>setModal(<WarehouseForm warehouse={w} {...props}/>))}{action('Eliminar',()=>setModal(<DeleteForm label={w.name} operation={s=>deleteWarehouse(s,w.id)} {...props}/>))}</div>}
    ]}/>}
    {section==='stock'&&<DataTable title="Existencias por almacén" rows={s.inventory.filter(i=>!s.products.find(p=>p.id===i.productId)?.archivedAt)} rowKey={i=>`${i.productId}-${i.warehouseId}`} columns={[{key:'id',label:'ID',value:i=>i.productId},{key:'product',label:'Producto',value:i=>pname(i.productId)},{key:'warehouse',label:'Almacén',value:i=>wname(i.warehouseId)},{key:'qty',label:'Disponible',value:i=>i.quantity},{key:'value',label:'Valor al costo',value:i=>i.quantity*(s.products.find(p=>p.id===i.productId)?.cost??0),render:i=>money(i.quantity*(s.products.find(p=>p.id===i.productId)?.cost??0))},{key:'alert',label:'Alerta global',value:i=>{const p=s.products.find(p=>p.id===i.productId);return p?stockStatus(s,p).label:'—';},render:i=>{const p=s.products.find(p=>p.id===i.productId);return p?stateBadge(p):'—';}}]}/>}
    {ledger&&<><DataTable title={section==='movimientos'?'Movimientos recientes':'Registro de operaciones'} rows={movements} columns={movementColumns} rowKey={m=>m.id}/><p className="inv-note">El stock resultante es el saldo histórico inmediatamente después de esa operación, no el stock actual. Los saldos antiguos se reconstruyen solo cuando el historial completo concilia con las existencias y se identifican como reconstruidos; en otro caso muestran «No registrado». No se inventan horas. Las ventas comerciales se incluyen aquí; cada transferencia comparte una referencia entre salida y entrada.</p></>}
    {section==='documentos-inventario'&&<><button className="btn inv-primary" onClick={()=>setModal(<DocumentForm {...props}/>)}>＋ Subir documento</button><DataTable title="Documentos de inventario" rows={s.inventoryDocuments??[]} rowKey={d=>d.id} columns={[
      {key:'id',label:'ID documento',value:d=>d.id},{key:'name',label:'Archivo',value:d=>d.name},{key:'kind',label:'Tipo de documento',value:d=>d.kind},
      {key:'date',label:'Fecha y hora',value:d=>d.createdAt,render:d=>new Date(d.createdAt).toLocaleString('es-PE')},
      {key:'actor',label:'Registrado por',value:d=>d.actor},{key:'reference',label:'Referencia',value:d=>d.reference,render:d=><button className="btn mini" onClick={()=>setModal(<ReferenceDetail reference={d.reference} onClose={close}/>)}>{d.reference}</button>},
      {key:'size',label:'KB',value:d=>Math.ceil(d.size/1024)}, {key:'actions',label:'Acciones',value:()=>'',filter:false,render:d=><div className="inv-row-actions"><button className="btn mini" onClick={()=>downloadDocument(d)}>Descargar</button><button className="btn mini inv-delete-document" onClick={()=>setModal(<DeleteDocumentForm document={d} {...props}/>)}>Eliminar</button></div>}
    ]}/><p className="inv-note">Los documentos se conservan en este navegador junto con sus referencias y movimientos. Capacidad de adjuntos: 3 MB. La eliminación requiere confirmación, conserva los movimientos y queda registrada en auditoría.</p></>}
    {modal}
  </div>;
}
