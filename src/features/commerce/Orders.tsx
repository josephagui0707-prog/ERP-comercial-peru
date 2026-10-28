import {useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {Badge,Panel} from '../../components/ui';
import {PaginatedTable} from '../../components/PaginatedTable';
import {advanceOrder,createOrder} from '../../core/operations';
import {money,sumItems} from '../../core/types';
import {CommerceLayout,FilterBar,RecordDetails,confirmAction,useCommerce} from './Shared';
import {DocumentBuilder} from './DocumentBuilder';
export default function Orders(){
 const {state:s,update,run,error,success,clientName}=useCommerce(),navigate=useNavigate();const [params]=useSearchParams();
 const [creating,setCreating]=useState(false);const [query,setQuery]=useState(''),[status,setStatus]=useState(''),[date,setDate]=useState('');
 const focus=params.get('focus');const highlighted=s.orders.find(o=>o.id===focus);
 const rows=s.orders.filter(o=>(o.id+' '+clientName(o.clientId)).toLowerCase().includes(query.toLowerCase())&&(!status||o.status===status)&&(!date||o.date===date));
 const change=(id:string,next:'confirmado'|'preparando'|'cancelado',message:string)=>{if(!confirmAction(message))return;run(()=>update(old=>advanceOrder(old,id,next)));};
 return <CommerceLayout section="pedidos" title="Pedidos" count={s.orders.length} error={error} success={success}>
 {highlighted&&<div className="alert alert-info" role="status">Pedido <b>{highlighted.id}</b> cargado. Estado actual: <b>{highlighted.status}</b>. Primero confirma, luego pasa a preparación y finalmente registra la venta.</div>}
 <div className="commerce-new-document"><div><strong>Pedidos y seguimiento</strong><small>La conversión desde cotizaciones conserva todos los datos. Los pedidos directos son una excepción.</small></div><button type="button" className="btn btn-outline-primary" onClick={()=>setCreating(x=>!x)}>{creating?'Cerrar formulario':'+ Pedido directo'}</button></div>
 {creating&&<DocumentBuilder mode="pedido" onSave={(client,items)=>{if(run(()=>{update(old=>createOrder(old,client,items));return 'Pedido registrado como pendiente.';}))setCreating(false);}}/>}
 <Panel title="Seguimiento de pedidos"><FilterBar query={query} setQuery={setQuery} status={status} setStatus={setStatus} date={date} setDate={setDate} statuses={['pendiente','confirmado','preparando','completado','cancelado']}/>
 <PaginatedTable><table className="table table-hover align-middle erp-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Origen</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(o=><tr key={o.id} className={focus===o.id?'table-info':''}><td><b>{o.id}</b></td><td>{clientName(o.clientId)}</td><td>{o.quoteId||'Pedido directo'}</td><td>{o.date}</td><td>{money(sumItems(o.items))}</td><td><Badge value={o.status}/></td><td className="commerce-actions"><RecordDetails kind="Pedido" record={o} state={s}/>{o.status==='pendiente'&&<button className="btn btn-sm btn-outline-primary" onClick={()=>change(o.id,'confirmado',`¿Confirmar el pedido ${o.id}?`)}>Confirmar</button>}{o.status==='confirmado'&&<button className="btn btn-sm btn-outline-primary" onClick={()=>change(o.id,'preparando',`¿Pasar el pedido ${o.id} a preparación?`)}>Iniciar preparación</button>}{o.status==='preparando'&&!o.saleId&&<button className="btn btn-sm btn-primary" onClick={()=>navigate('/ventas?order='+encodeURIComponent(o.id))}>Registrar venta →</button>}{['pendiente','confirmado','preparando'].includes(o.status)&&<button className="btn btn-sm btn-outline-danger" onClick={()=>change(o.id,'cancelado',`¿Cancelar el pedido ${o.id}? Esta acción no se puede deshacer.`)}>Cancelar</button>}{o.saleId&&<button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=>navigate('/ventas?sale='+encodeURIComponent(o.saleId!))}>Ver venta →</button>}</td></tr>)}{!rows.length&&<tr><td colSpan={7} className="text-center text-secondary py-4">No hay registros que coincidan con los filtros.</td></tr>}</tbody></table></PaginatedTable></Panel>
 </CommerceLayout>;
}
