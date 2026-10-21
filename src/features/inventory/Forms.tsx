import {RecordPicker} from '../../components/RecordPicker';
import {useRef,useState} from 'react';
import type {ReactNode} from 'react';
import type {Product,State,Warehouse,InventoryDocument} from '../../core/types';
import {uid,money} from '../../core/types';
import {useStore,demoAccounts} from '../../core/store';
import {stockOf} from '../../core/operations';
import {Modal} from './Modal';
import {ThirdPartyPicker} from './ThirdPartyPicker';
import {categoriesOf,newProductId,postTransaction,saveCategory,saveProduct,saveWarehouse} from './service';
import type {Transaction} from './service';
import {stockStatus,warehouseAvailable} from './model';
import {AttachmentFields,DocumentPreview} from './AttachmentPicker';
import {readAttachments,DOCUMENT_TYPES,appendDocuments,downloadDocument,deleteInventoryDocument} from './documents';

export function Editor({title,onClose,onSave,children,submit='Guardar cambios',blocked=false}:{blocked?:boolean;title:string;onClose:()=>void;onSave:()=>void|Promise<void>;children:ReactNode;submit?:string}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false);
  return <Modal title={title} busy={busy} onClose={onClose}><form className="inv-form" onSubmit={async e=>{e.preventDefault();if(lock.current||blocked)return;lock.current=true;setBusy(true);setError('');await new Promise(r=>setTimeout(r,50));try{await onSave();onClose();}catch(err){setError(err instanceof Error?err.message:'No se pudo guardar.');}finally{lock.current=false;setBusy(false);}}}>{error&&<div className="alert alert-danger" role="alert">{error}</div>}<fieldset disabled={busy}>{children}</fieldset><div className="inv-actions"><button type="button" className="btn mini" disabled={busy} onClick={onClose}>Cancelar</button><button className="btn inv-primary" disabled={busy||blocked} type="submit">{busy?'Guardando…':submit}</button></div></form></Modal>;
}
const textField=(label:string,value:string,onChange:(v:string)=>void,required=false,type='text')=><label className="field">{label}<input className="form-control" type={type} required={required} value={value} onChange={e=>onChange(e.target.value)}/></label>;
export function ProductForm({product,onClose,onSaved}:{product?:Product;onClose:()=>void;onSaved:()=>void}) {
  const {state,update}=useStore();
  const [draft,setDraft]=useState<Product>(()=>product??{id:newProductId(state),sku:'',name:'',category:categoriesOf(state)[0]??'',price:0,cost:0,min:0,active:true});
  const set=<K extends keyof Product>(key:K,value:Product[K])=>setDraft({...draft,[key]:value});
  const info=stockStatus(state,state.products.find(p=>p.id===draft.id)??draft);
  return <Editor title={product?'Editar producto':'Nuevo producto'} onClose={onClose} onSave={()=>{update(s=>saveProduct(s,draft,!!product));onSaved();}}>
    <label className="field">ID único automático<input className="form-control" readOnly value={draft.id}/></label><div className="inv-fields">
    {textField('Nombre del producto',draft.name,v=>set('name',v),true)}{textField('Marca',draft.brand??'',v=>set('brand',v))}{textField('Modelo',draft.model??'',v=>set('model',v))}
    <RecordPicker label="Categoría" required rows={categoriesOf(state).map(c=>({id:c,name:c}))} value={draft.category} onChange={v=>set('category',v)} getId={c=>c.id} getLabel={c=>c.name} columns={[{label:'Categoría',value:c=>c.name},{label:'Productos',value:c=>state.products.filter(p=>p.category===c.name&&!p.archivedAt).length}]} />
    <div><RecordPicker label="Proveedor" rows={state.suppliers} value={draft.supplierId??''} onChange={v=>set('supplierId',v)} getId={v=>v.id} getLabel={v=>v.name} columns={[{label:'Código',value:v=>v.id},{label:'Proveedor',value:v=>v.name},{label:'RUC',value:v=>v.ruc,search:v=>v.ruc}]} />{draft.supplierId&&<button type="button" className="btn mini" onClick={()=>set('supplierId','')}>Quitar proveedor</button>}</div>
    {(['cost','price'] as const).map(k=><label className="field" key={k}>{k==='cost'?'Precio de compra al proveedor (S/)':'Precio de reventa (S/)'}<input className="form-control" type="number" min="0" step="0.01" required value={Number.isNaN(draft[k])?'':draft[k]} onChange={e=>set(k,e.target.value===''?NaN:Number(e.target.value))}/></label>)}
    <label className="field">Ganancia bruta por unidad<input className="form-control" readOnly value={Number.isFinite(draft.price-draft.cost)?money(draft.price-draft.cost):'—'}/></label>
    <label className="field">Stock global actual (automático)<input className="form-control" readOnly value={`${info.quantity} unidades`}/></label>
    <label className="field">Estado de stock (automático)<input className="form-control" readOnly value={`${info.label} · ${info.percent.toFixed(1)}%`}/></label></div>
    <label className="field">Características<textarea className="form-control" rows={4} maxLength={3000} value={draft.features??''} onChange={e=>set('features',e.target.value)}/></label>
    <p className="inv-note">Stock global = unidades de este producto en todos los almacenes. El 100% corresponde a su mayor stock global observado desde la actualización o primera entrada. Referencia actual: {info.reference} unidades. Las entradas y salidas actualizan el estado automáticamente.</p>
  </Editor>;
}
export function ProductDetail({id,onClose}:{id:string;onClose:()=>void}) {
  const {state:s}=useStore(),p=s.products.find(p=>p.id===id);if(!p)return null;
  const info=stockStatus(s,p),gain=p.price-p.cost;
  const entries=[['ID',p.id],['Nombre',p.name],['Marca',p.brand||'Sin registrar'],['Modelo',p.model||'Sin registrar'],['Categoría',p.category],['Proveedor',s.suppliers.find(x=>x.id===p.supplierId)?.name||'Sin asignar'],['Precio de compra',money(p.cost)],['Precio de reventa',money(p.price)],['Ganancia bruta / unidad',money(gain)],['Margen bruto',p.price>0?`${(gain/p.price*100).toFixed(1)}%`:'No aplica'],['Stock global',`${info.quantity} unidades`],['Estado',`${info.label} · ${info.percent.toFixed(1)}%`],['Referencia del 100%',`${info.reference} unidades`],['Archivo',p.archivedAt?new Date(p.archivedAt).toLocaleString('es-PE'):'En catálogo']];
  return <Modal title="Detalle completo del producto" onClose={onClose}><div className="inv-form"><dl className="inv-detail">{entries.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><h3>Características</h3><p style={{whiteSpace:'pre-wrap'}}>{p.features||'Sin registrar'}</p><h3>Existencias por almacén</h3>{s.warehouses.map(w=><p key={w.id}>{w.name}: <b>{stockOf(s,p.id,w.id)} unidades</b></p>)}<p className="inv-note">Ganancia bruta = precio de reventa − precio de compra. No descuenta gastos ni impuestos. Los productos archivados conservan su historial de ventas y movimientos.</p><button className="btn mini" onClick={onClose}>Cerrar</button></div></Modal>;
}
export function CategoryForm({previous,onClose,onSaved}:{previous?:string;onClose:()=>void;onSaved:()=>void}) {
  const {update}=useStore(),[name,setName]=useState(previous??'');
  return <Editor title={previous?'Editar categoría':'Nueva categoría'} onClose={onClose} onSave={()=>{update(s=>saveCategory(s,name,previous));onSaved();}}>{textField('Nombre',name,setName,true)}<p className="inv-note">Al renombrar, se actualizan todos los productos asociados.</p></Editor>;
}
const warehouseKinds=['Almacén Principal / Central','Sucursal / Tienda','Tránsito / En Ruta','Merma / Producto Defectuoso','Almacén Virtual / e-Commerce'];
export function WarehouseForm({warehouse,onClose,onSaved}:{warehouse?:Warehouse;onClose:()=>void;onSaved:()=>void}) {
  const {update}=useStore(),[draft,setDraft]=useState<Warehouse>(warehouse??{id:uid('ALM'),name:'',city:'',kind:warehouseKinds[0],status:'Activo'});
  const set=<K extends keyof Warehouse>(key:K,value:Warehouse[K])=>setDraft({...draft,[key]:value});
  return <Editor title={warehouse?'Editar almacén':'Nuevo almacén'} onClose={onClose} onSave={()=>{update(s=>saveWarehouse(s,draft,!!warehouse));onSaved();}}><div className="inv-fields">
    <label className="field">Código de almacén<input className="form-control" required readOnly={!!warehouse} value={draft.id} onChange={e=>set('id',e.target.value.toUpperCase())}/>{!warehouse&&<button type="button" className="btn mini" onClick={()=>set('id',uid('ALM'))}>Autogenerar código</button>}</label>
    {textField('Nombre',draft.name,v=>set('name',v),true)}
    <label className="field">Tipo de almacén<select className="form-select" value={draft.kind??warehouseKinds[0]} onChange={e=>set('kind',e.target.value)}>{warehouseKinds.map(k=><option key={k}>{k}</option>)}</select></label>
    <label className="field">Estado<select className="form-select" value={draft.status??'Activo'} onChange={e=>set('status',e.target.value as Warehouse['status'])}>{['Activo','Inactivo','En mantenimiento'].map(v=><option key={v}>{v}</option>)}</select></label></div>
    <h3>Ubicación detallada</h3>{textField('Dirección exacta',draft.address??'',v=>set('address',v),true)}<div className="inv-fields">{textField('Distrito',draft.district??'',v=>set('district',v),true)}{textField('Ciudad',draft.city,v=>set('city',v),true)}{textField('Departamento',draft.department??'',v=>set('department',v),true)}{textField('Ubigeo (6 dígitos, opcional)',draft.ubigeo??'',v=>set('ubigeo',v))}</div>
    <h3>Responsable y contacto</h3><label className="field">Encargado / responsable<select className="form-select" required value={draft.manager??''} onChange={e=>set('manager',e.target.value)}><option value="">Seleccionar usuario</option>{demoAccounts.map(a=><option key={a.email} value={a.email}>{a.name} · {a.email}</option>)}</select></label><div className="inv-fields">{textField('Teléfono / extensión',draft.phone??'',v=>set('phone',v),false,'tel')}{textField('Correo del almacén',draft.email??'',v=>set('email',v),false,'email')}</div><p className="inv-note">Los almacenes inactivos o en mantenimiento conservan sus existencias e historial, pero no permiten movimientos nuevos. El correo es informativo: esta demo no envía notificaciones por email.</p></Editor>;
}
const transactionDrafts=new Map<string,{draft:Transaction;files:File[];docKind:string}>();
export function TransactionForm({kind,onClose,onSaved}:{kind:Transaction['kind'];onClose:()=>void;onSaved:()=>void}) {
  const {state,update,user}=useStore(),available=state.warehouses.filter(w=>warehouseAvailable(state,w.id));
  const draftKey=`${user?.email??'local'}:${kind}`,cached=transactionDrafts.get(draftKey);
  const [draft,setDraft]=useState<Transaction>(cached?.draft??{kind,productId:state.products.find(p=>!p.archivedAt)?.id??'',warehouseId:available[0]?.id??'',destination:available[1]?.id??'',quantity:kind==='Ajuste'?0:1,reason:'',reference:'',thirdPartyId:'',thirdPartyKind:kind==='Entrada'?'proveedor':'cliente'});
  const [attachmentPending,setAttachmentPending]=useState(false);
  const [files,setFiles]=useState<File[]>(cached?.files??[]),[docKind,setDocKind]=useState(cached?.docKind??(kind==='Devolución'?'Orden de devolución':DOCUMENT_TYPES[0]));
  const set=<K extends keyof Transaction>(key:K,value:Transaction[K])=>setDraft({...draft,[key]:value});
  const saldo=stockOf(state,draft.productId,draft.warehouseId),delta=kind==='Ajuste'?draft.quantity-saldo:kind==='Entrada'||kind==='Devolución'?draft.quantity:-draft.quantity;
  return <Editor title={kind==='Ajuste'?'Ajuste por conteo físico':kind==='Transferencia'?'Transferir existencias':`${kind} de inventario`} blocked={attachmentPending} submit="Confirmar operación" onClose={()=>{transactionDrafts.delete(draftKey);onClose();}} onSave={async()=>{const documents=await readAttachments(files,docKind,user?.name??'Usuario local');update(s=>postTransaction(s,{...draft,documents,actor:user?.name}));transactionDrafts.delete(draftKey);onSaved();}}><div className="inv-fields"><RecordPicker label="Producto" required rows={state.products.filter(p=>!p.archivedAt)} value={draft.productId} onChange={v=>set('productId',v)} getId={p=>p.id} getLabel={p=>p.name} columns={[{label:'ID',value:p=>p.id},{label:'SKU',value:p=>p.sku,search:p=>p.sku},{label:'Producto',value:p=>p.name},{label:'Categoría',value:p=>p.category,search:p=>p.category}]} details={p=><span>{p.category} · {p.sku}</span>} />
    <RecordPicker label={kind==='Transferencia'?'Almacén de origen':'Almacén'} required rows={available} value={draft.warehouseId} onChange={v=>set('warehouseId',v)} getId={w=>w.id} getLabel={w=>w.name} columns={[{label:'Código',value:w=>w.id},{label:'Almacén',value:w=>w.name},{label:'Ciudad',value:w=>w.city}]} />
    {kind==='Transferencia'&&<RecordPicker label="Almacén de destino" required rows={available.filter(w=>w.id!==draft.warehouseId)} value={draft.destination??''} onChange={v=>set('destination',v)} getId={w=>w.id} getLabel={w=>w.name} columns={[{label:'Código',value:w=>w.id},{label:'Almacén',value:w=>w.name},{label:'Ciudad',value:w=>w.city}]} />}
    <label className="field">{kind==='Ajuste'?'Nuevo saldo físico':'Cantidad (unidades)'}<input className="form-control" type="number" min={kind==='Ajuste'?0:1} step="1" required value={Number.isNaN(draft.quantity)?'':draft.quantity} onChange={e=>set('quantity',e.target.value===''?NaN:Number(e.target.value))}/></label></div><div className="inv-preview"><span>Stock actual <b>{saldo}</b></span><span>Variación <b>{Number.isFinite(delta)?`${delta>0?'+':''}${delta}`:'—'}</b></span><span>Stock resultante <b>{Number.isFinite(delta)?saldo+delta:'—'}</b></span></div>{['Entrada','Salida','Devolución'].includes(kind)&&<ThirdPartyPicker onCreateClient={()=>transactionDrafts.set(draftKey,{draft,files,docKind})} kind={draft.thirdPartyKind} value={draft.thirdPartyId} onKindChange={value=>setDraft({...draft,thirdPartyKind:value,thirdPartyId:''})} onChange={value=>set('thirdPartyId',value)}/>}<label className="field">Motivo obligatorio<textarea className="form-control" required rows={3} maxLength={300} placeholder={kind==='Devolución'?'Indica el defecto o causa de devolución':'Describe por qué se realiza esta operación'} value={draft.reason} onChange={e=>set('reason',e.target.value)}/></label><AttachmentFields onPendingChange={setAttachmentPending} files={files} setFiles={setFiles} kind={docKind} setKind={setDocKind}/>{kind==='Devolución'&&<p className="inv-note">Para productos defectuosos, selecciona un almacén de merma. Esta devolución manual registra stock; no genera reembolso ni sustituye una devolución comercial vinculada a una venta.</p>}<p className="inv-note">Se genera una referencia única que vincula el movimiento y sus documentos. Operación simulada, sin emisión tributaria.</p></Editor>;
}
export function DocumentForm({onClose,onSaved}:{onClose:()=>void;onSaved:()=>void}) {
  const {state,update,user}=useStore(),[files,setFiles]=useState<File[]>([]),[kind,setKind]=useState(DOCUMENT_TYPES[0]),[reference,setReference]=useState('');
  const [attachmentPending,setAttachmentPending]=useState(false);
  const references=[...new Set(state.movements.map(m=>m.reference))];
  return <Editor blocked={attachmentPending} title="Guardar documento de inventario" onClose={onClose} onSave={async()=>{
    if(!files.length)throw Error('Selecciona un documento.');
    const documents=await readAttachments(files,kind,user?.name??'Usuario local');
    update(s=>{const next=structuredClone(s),movements=s.movements.filter(m=>m.reference===reference);const ref=reference||uid('EXP');
      if(reference&&!movements.length)throw Error('La referencia seleccionada ya no existe.');
      appendDocuments(next,documents.map(d=>({...d,reference:ref,movementIds:movements.map(m=>m.id)})));
      next.movements.forEach(m=>{if(m.reference===reference)m.documentIds=[...(m.documentIds??[]),...documents.map(d=>d.id)];});return next;});onSaved();
  }}><AttachmentFields onPendingChange={setAttachmentPending} files={files} setFiles={setFiles} kind={kind} setKind={setKind}/><RecordPicker label="Referencia (opcional)" rows={references.map(r=>({id:r}))} value={reference} onChange={setReference} getId={r=>r.id} getLabel={r=>r.id} columns={[{label:'Referencia de movimiento',value:r=>r.id}]} />{reference&&<button type="button" className="btn mini" onClick={()=>setReference('')}>Guardar como expediente independiente</button>}</Editor>;
}
export function ReferenceDetail({reference,onClose}:{reference:string;onClose:()=>void}) {
  const {state:s}=useStore();const docs=(s.inventoryDocuments??[]).filter(d=>d.reference===reference),moves=s.movements.filter(m=>m.reference===reference);
  return <Modal title={`Referencia ${reference}`} onClose={onClose}><div className="inv-form"><h3>Movimientos relacionados</h3>{moves.map(m=><p key={m.id}><b>{m.id}</b> · {m.type} · {m.qty>0?'+':''}{m.qty}<br/>{s.products.find(p=>p.id===m.productId)?.name} · {s.warehouses.find(w=>w.id===m.warehouseId)?.name}</p>)}<h3>Documentos adjuntos</h3>{docs.length?docs.map(d=><DocumentLink key={d.id} document={d}/>):<p>No hay documentos adjuntos a esta referencia.</p>}<button className="btn mini" onClick={onClose}>Cerrar</button></div></Modal>;
}
export function DocumentLink({document:d}:{document:InventoryDocument}) {
  const [preview,setPreview]=useState(false);
  return <div className="inv-document-link"><p><b>{d.name}</b> · {d.kind}</p><div className="inv-row-actions"><button type="button" className="btn mini" onClick={()=>setPreview(true)}>Vista previa</button><button type="button" className="btn mini" onClick={()=>downloadDocument(d)}>Descargar</button></div>{preview&&<Modal title="Vista previa del documento" onClose={()=>setPreview(false)}><div className="inv-form"><DocumentPreview document={d}/><button type="button" className="btn mini" onClick={()=>setPreview(false)}>Cerrar vista previa</button></div></Modal>}</div>;
}
export function DeleteDocumentForm({document:d,onClose,onSaved}:{document:InventoryDocument;onClose:()=>void;onSaved:()=>void}) {
  const {update,user}=useStore();
  return <Editor title="Eliminar documento de inventario" submit="Eliminar documento" onClose={onClose} onSave={()=>{update(s=>deleteInventoryDocument(s,d.id,user?.name??'Usuario local'));onSaved();}}><p>¿Eliminar <strong>{d.name}</strong>?</p><p>Se quitará el archivo y sus vínculos. Se conservarán los movimientos, las cantidades y la referencia <b>{d.reference}</b>, junto con un registro de la eliminación en auditoría.</p></Editor>;
}
export function DeleteForm({label,operation,onClose,onSaved,archive=false}:{label:string;operation:(s:State)=>State;onClose:()=>void;onSaved:()=>void;archive?:boolean}) {
  const {update}=useStore();return <Editor title={archive?'Eliminar del catálogo y conservar historial':'Eliminar registro'} submit={archive?'Archivar producto':'Confirmar eliminación'} onClose={onClose} onSave={()=>{update(operation);onSaved();}}><p>¿{archive?'Archivar':'Eliminar'} <strong>{label}</strong>?</p><p>{archive?'Solo se permite con stock cero. El producto seguirá disponible en el historial, ventas, reportes y Kardex.':'Solo se permite eliminar registros sin existencias ni referencias históricas.'}</p></Editor>;
}
