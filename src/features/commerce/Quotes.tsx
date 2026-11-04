import {useEffect,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {Badge,Panel} from '../../components/ui';
import {PaginatedTable} from '../../components/PaginatedTable';
import {approveQuote,createOrder,createQuote,rejectQuote} from '../../core/operations';
import {money,sumItems} from '../../core/types';
import {CommerceLayout,FilterBar,RecordDetails,confirmAction,useCommerce} from './Shared';
import {DocumentBuilder} from './DocumentBuilder';
export default function Quotes(){
 const {state:s,update,run,error,success,clientName}=useCommerce();const navigate=useNavigate();
 const [params,setParams]=useSearchParams();
 const [creating,setCreating]=useState(()=>params.get('crear')==='1');
 useEffect(()=>{if(params.get('crear')==='1')setCreating(true);},[params]);
 const toggleCreating=()=>{const next=!creating;setCreating(next);if(params.has('crear')){const p=new URLSearchParams(params);p.delete('crear');setParams(p,{replace:true});}};const [query,setQuery]=useState(''),[status,setStatus]=useState(''),[date,setDate]=useState('');
 const rows=s.quotes.filter(q=>(q.id+' '+clientName(q.clientId)).toLowerCase().includes(query.toLowerCase())&&(!status||q.status===status)&&(!date||q.date===date));
 return <CommerceLayout section="cotizaciones" title="Cotizaciones" count={s.quotes.length} error={error} success={success}>
 <div className="commerce-new-document"><div><strong>Cotizaciones pendientes de decisión</strong><small>Aprueba una propuesta antes de convertirla en pedido.</small></div><button type="button" className="btn btn-primary" onClick={toggleCreating}>{creating?'Cerrar formulario':'+ Nueva cotización'}</button></div>
 {creating&&<DocumentBuilder mode="cotizacion" onSave={(client,items)=>{if(run(()=>{update(old=>createQuote(old,client,items));return 'Cotización guardada como borrador.';}))setCreating(false);}}/>}
 <Panel title="Historial y decisiones comerciales"><FilterBar query={query} setQuery={setQuery} status={status} setStatus={setStatus} date={date} setDate={setDate} statuses={['borrador','aprobada','rechazada','convertida']}/>
 <PaginatedTable><table className="table table-hover align-middle erp-table"><thead><tr><th>Documento</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(q=><tr key={q.id}><td><b>{q.id}</b></td><td>{clientName(q.clientId)}</td><td>{q.date}</td><td>{money(sumItems(q.items))}</td><td><Badge value={q.status}/></td><td className="commerce-actions"><RecordDetails kind="Cotización" record={q} state={s}/>{q.status==='borrador'&&<><button type="button" className="btn btn-sm btn-outline-success" onClick={()=>{confirmAction(`¿Aprobar la cotización ${q.id}?`,()=>run(()=>update(old=>approveQuote(old,q.id))));}}>Aprobar</button><button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>{confirmAction(`¿Rechazar la cotización ${q.id}? No podrá convertirse en pedido.`,()=>run(()=>update(old=>rejectQuote(old,q.id))));}}>Rechazar</button></>}{q.status==='aprobada'&&<button type="button" className="btn btn-sm btn-primary" onClick={()=>{confirmAction(`¿Crear el pedido de ${q.id} sin modificar cliente ni productos?`,()=>run(()=>{let id='';update(old=>{const next=createOrder(old,q.clientId,q.items,q.id);id=next.orders[0].id;return next;});navigate(`/pedidos?focus=${encodeURIComponent(id)}`);}));}}>Crear pedido →</button>}{q.status==='convertida'&&q.orderId&&<button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=>navigate(`/pedidos?focus=${encodeURIComponent(q.orderId!)}`)}>Ver pedido →</button>}</td></tr>)}{!rows.length&&<tr><td colSpan={6} className="text-center text-secondary py-4">No hay registros que coincidan con los filtros.</td></tr>}</tbody></table></PaginatedTable></Panel>
 </CommerceLayout>;
}
