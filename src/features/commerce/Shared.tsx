import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {ReactNode} from 'react';
import {CheckCircle2,Eye, X} from 'lucide-react';
import './commerce-confirm.css';
import {WorkflowGuide} from '../../components/WorkflowGuide';
import {useStore} from '../../core/store';
import type {Item, State} from '../../core/types';
import {money,sumItems} from '../../core/types';
import {Badge} from '../../components/ui';
export function useCommerce(){
 const {state,update,user}=useStore();
 const [error,setError]=useState(''),[success,setSuccess]=useState('');
 const run=(action:()=>string|void)=>{setError('');setSuccess('');try{setSuccess(action()||'Operación registrada correctamente.');return true;}catch(e){setError(e instanceof Error?e.message:'No se pudo completar la operación.');return false;}};
 const clientName=(id:string)=>state.clients.find(x=>x.id===id)?.name||id;
 const productName=(id:string)=>state.products.find(x=>x.id===id)?.name||id;
 return {state,update,user,error,success,run,clientName,productName};
}
type ConfirmRequest={message:string;action:()=>void};
export function CommerceLayout({section,title,count,children,error,success}:{section:string;title:string;count:number;children:ReactNode;error?:string;success?:string}){
 const [pending,setPending]=useState<ConfirmRequest|null>(null);
 const latest=useRef<ConfirmRequest|null>(null);
 useEffect(()=>{
   const listener=(event:Event)=>{
     const request=(event as CustomEvent<ConfirmRequest>).detail;
     if(latest.current)return; // una sola confirmación en curso
     latest.current=request;setPending(request);
   };
   window.addEventListener('erp:commercial-confirm',listener);
   return()=>window.removeEventListener('erp:commercial-confirm',listener);
 },[]);
 const close=()=>{latest.current=null;setPending(null);};
 const accept=()=>{
   const request=latest.current;
   if(!request)return;
   latest.current=null;setPending(null);
   request.action(); // ejecución una sola vez, aún bajo clics repetidos
 };
 useEffect(()=>{if(!pending)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close();}};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[pending]);
 return <div className="stack"><div className="heading"><div><span className="eyebrow">GESTIÓN COMERCIAL</span><h1>{title}</h1><p>Documentos vinculados y trazabilidad · Importes en soles (PEN)</p></div><span className="count">{count} registros</span></div>
 <WorkflowGuide section={section}/>{error&&<div className="alert alert-danger" role="alert">{error}</div>}{success&&<div className="alert alert-success" role="status">{success}</div>}{children}{pending&&createPortal(<>
   <div className="modal-backdrop fade show erp-confirm-backdrop" aria-hidden="true"/>
   <div className="modal fade show d-block erp-confirm-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
    <div className="modal-dialog modal-dialog-centered" role="dialog" aria-modal="true" aria-label="Confirmar acción comercial">
     <div className="modal-content">
      <div className="modal-header"><div className="d-flex align-items-center gap-3"><span className="erp-confirm-icon"><CheckCircle2 size={20}/></span><h2 className="modal-title">Confirmar operación</h2></div><button type="button" className="btn-close" aria-label="Cancelar" onClick={close}/></div>
      <div className="modal-body">{pending.message}<p className="small mt-2 mb-0">Solo se realizará una operación al confirmar.</p></div>
      <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={close}>Cancelar</button><button type="button" autoFocus className="btn btn-primary" onClick={accept}>Confirmar</button></div>
     </div>
    </div>
   </div>
  </>,document.body)}</div>;
}
/** El detalle vive en document.body: evita que las animaciones/transformaciones del panel lo recorten. */
export function RecordDetails({kind,record,state}:{kind:string;record:{id:string;date?:string;status?:string;clientId?:string;items?:Item[];orderId?:string;quoteId?:string;saleId?:string;amount?:number;reason?:string;};state:State}){
 const [open,setOpen]=useState(false);
 const client=state.clients.find(x=>x.id===record.clientId);
 useEffect(()=>{
  if(!open)return;
  const old=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const closeOnEsc=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
  document.addEventListener('keydown',closeOnEsc);
  return ()=>{document.body.style.overflow=old;document.removeEventListener('keydown',closeOnEsc);};
 },[open]);
 return <><button type="button" className="btn btn-sm btn-outline-primary erp-action-view" onClick={()=>setOpen(true)}><Eye size={14}/> Ver detalle</button>
 {open&&createPortal(<div className="erp-detail-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false);}}><section role="dialog" aria-modal="true" aria-label={`Detalle de ${kind} ${record.id}`} className="erp-detail-modal" tabIndex={-1}>
  <header><div><span className="eyebrow">TRAZABILIDAD COMERCIAL</span><h2>{kind}: {record.id}</h2><p className="erp-detail-lead">Documento de demostración, vinculado a los movimientos del sistema.</p></div><button type="button" className="btn btn-light" aria-label="Cerrar detalle" onClick={()=>setOpen(false)}><X size={18}/></button></header>
  <div className="erp-detail-content"><div className="erp-detail-grid"><div><span>Fecha</span><strong>{record.date||'Sin fecha'}</strong></div><div><span>Estado</span><strong><Badge value={record.status||'Registrado'}/></strong></div>
   {client&&<div><span>Cliente</span><strong>{client.name}</strong><small>{client.document}</small></div>}
   {record.quoteId&&<div><span>Cotización de origen</span><strong>{record.quoteId}</strong></div>}
   {record.orderId&&<div><span>Pedido de origen</span><strong>{record.orderId}</strong></div>}
   {record.saleId&&<div><span>Venta relacionada</span><strong>{record.saleId}</strong></div>}
   {record.amount!==undefined&&<div><span>Importe</span><strong>{money(record.amount)}</strong></div>}
   {record.reason&&<div><span>Motivo</span><strong>{record.reason}</strong></div>}
  </div>
  {record.items&&<><h3>Productos ({record.items.length})</h3><div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Descuento</th><th>Total</th></tr></thead><tbody>{record.items.map((i,j)=><tr key={`${i.productId}-${j}`}><td>{state.products.find(p=>p.id===i.productId)?.name||i.productId}</td><td>{i.qty}</td><td>{money(i.price)}</td><td>{i.discount}%</td><td>{money(sumItems([i]))}</td></tr>)}</tbody></table></div><div className="text-end"><strong>Total: {money(sumItems(record.items))}</strong></div></>}
  </div><footer><button type="button" className="btn btn-primary" onClick={()=>setOpen(false)}>Cerrar</button></footer>
 </section></div>,document.body)}</>;
}
export function FilterBar({query,setQuery,status,setStatus,date,setDate,statuses}:{query:string;setQuery:(x:string)=>void;status:string;setStatus:(x:string)=>void;date:string;setDate:(x:string)=>void;statuses:string[]}){
 return <div className="commerce-filters"><label>Buscar por cliente o código<input className="form-control" type="search" placeholder="Buscar..." value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Estado<select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option>{statuses.map(x=><option value={x} key={x}>{x}</option>)}</select></label><label>Fecha<input type="date" className="form-control" value={date} onChange={e=>setDate(e.target.value)}/></label></div>;
}
/** Abre un solo diálogo Bootstrap; la acción se ejecuta una única vez al aceptarla. */
export const confirmAction=(message:string,action:()=>void)=>{
 window.dispatchEvent(new CustomEvent<ConfirmRequest>('erp:commercial-confirm',{detail:{message,action}}));
};
