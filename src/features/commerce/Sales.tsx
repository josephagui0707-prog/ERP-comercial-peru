import {useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {createSalePending} from '../../core/operations';
import {CommerceLayout,useCommerce,confirmAction} from './Shared';
import {DocumentBuilder} from './DocumentBuilder';
import {SalesHistory} from './SalesHistory';
export default function Sales(){
 const {state:s,update,run,error,success}=useCommerce(),navigate=useNavigate();const [params]=useSearchParams();
 const [direct,setDirect]=useState(false);const order=s.orders.find(o=>o.id===params.get('order'));
 return <CommerceLayout section="ventas" title="Ventas" count={s.sales.length} error={error} success={success}>
 {params.get('order')&&(!order||order.status!=='preparando'||Boolean(order.saleId))&&<div className="alert alert-warning" role="alert">Este pedido no está disponible para convertirlo en venta. Solo se permiten pedidos en preparación sin venta vinculada. Puedes consultar su estado desde Pedidos.</div>}
 {params.get('order')&&(!order||order.status!=='preparando'||Boolean(order.saleId))?null:order?.status==='preparando'&&!order.saleId?<DocumentBuilder key={order.id} mode="venta" initialClient={order.clientId} initialItems={order.items} locked onSave={(client,items,warehouse)=>{if(!confirmAction(`¿Registrar la venta del pedido ${order.id}? Se descontarán las existencias.`))return;run(()=>{let id='';update(old=>{const next=createSalePending(old,client,items,warehouse,order.id);id=next.sales[0].id;return next;});navigate(`/comprobantes?sale=${encodeURIComponent(id)}`);});}}/>:<><div className="alert alert-info">Para mantener la trazabilidad, inicia la venta desde un <strong>pedido en preparación</strong>. La venta inmediata queda como excepción para atención de mostrador.</div><button type="button" className="btn btn-outline-secondary mb-3" onClick={()=>setDirect(v=>!v)}>{direct?'Ocultar venta inmediata':'Registrar venta inmediata (sin pedido)'}</button>{direct&&<DocumentBuilder mode="venta" onSave={(client,items,warehouse)=>{if(!confirmAction('¿Registrar una venta inmediata sin pedido previo? Se descontará el stock; el comprobante se emitirá después.'))return;run(()=>{let id='';update(old=>{const next=createSalePending(old,client,items,warehouse);id=next.sales[0].id;return next;});navigate(`/comprobantes?sale=${encodeURIComponent(id)}`);});}}/>}</>}
 <SalesHistory/>
 </CommerceLayout>;
}
