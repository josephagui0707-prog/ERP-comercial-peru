import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {RecordPicker} from '../../components/RecordPicker';
import {PaginatedTable} from '../../components/PaginatedTable';
import {Badge,Field,MethodChip,MethodPicker,Panel} from '../../components/ui';
import {dueOn,recordPayment,hasVoucher} from '../../core/operations';
import {money} from '../../core/types';
import {CommerceLayout,RecordDetails,confirmAction,useCommerce} from './Shared';
export default function Payments(){
 const {state:s,update,run,error,success,clientName}=useCommerce();const [params]=useSearchParams();
 const [id,setId]=useState(''),[amount,setAmount]=useState(''),[method,setMethod]=useState('Yape demo');
 const [result,setResult]=useState<'aprobado'|'rechazado'|'cancelado'>('aprobado'),[query,setQuery]=useState('');
 useEffect(()=>{const sale=s.sales.find(v=>v.id===params.get('sale')&&v.status==='vigente'&&hasVoucher(v));if(sale){setId(sale.id);setAmount(String(dueOn(s,sale)));}},[params.get('sale')]);
 const selectedSale=s.sales.find(x=>x.id===id);
 const eligible=s.sales.filter(v=>v.status==='vigente'&&hasVoucher(v)&&dueOn(s,v)>0);
 const record=()=>{const sale=s.sales.find(v=>v.id===id);if(!sale){run(()=>{throw Error('Selecciona una venta vigente.');});return;}
 const n=Number(amount);if(!confirmAction(`¿Registrar el pago simulado de ${money(n)} para ${id}?`))return;
 run(()=>{update(old=>recordPayment(old,id,n,method,result));setId('');setAmount('');return 'Transacción simulada registrada; el saldo se actualizó según el resultado.';});};
 return <CommerceLayout section="cobros" title="Cobros y pagos" count={s.payments.length} error={error} success={success}>
 <Panel title="Registrar cobro simulado"><p className="text-secondary small">Selecciona una venta con comprobante emitido. Los pagos parciales reducen el saldo pendiente.</p><div className="alert alert-warning">Demostración local: sin conexión con bancos, Yape, Plin ni tarjetas. No introduzcas información financiera real.</div><div className="form-grid"><RecordPicker label="Venta con saldo" rows={eligible} value={id} onChange={v=>{setId(v);const sale=s.sales.find(x=>x.id===v);setAmount(sale?String(dueOn(s,sale)):'');}} getId={v=>v.id} getLabel={v=>`${v.id} — ${clientName(v.clientId)}`} columns={[{label:'Venta',value:v=>v.id},{label:'Cliente',value:v=>clientName(v.clientId)},{label:'Saldo',value:v=>money(dueOn(s,v))}]}/><div><b>Método de pago</b><MethodPicker value={method} onChange={setMethod}/></div><Field label="Importe S/"><input className="form-control" type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></Field><Field label="Resultado de simulación"><select className="form-select" value={result} onChange={e=>setResult(e.target.value as typeof result)}><option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option><option value="cancelado">Cancelado</option></select></Field></div>{selectedSale&&<div className="commerce-payment-summary"><span>Venta <b>{selectedSale.id}</b></span><span>Total <b>{money(selectedSale.total||0)}</b></span><span>Saldo por cobrar <b>{money(dueOn(s,selectedSale))}</b></span></div>}<button type="button" className="btn btn-primary" disabled={!id||!amount||Number(amount)<=0||Number(amount)>(selectedSale?dueOn(s,selectedSale):0)} onClick={record}>Confirmar transacción simulada</button></Panel>
 <Panel title="Historial de pagos" actions={<input className="form-control" aria-label="Buscar pagos" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar venta o referencia"/>}><PaginatedTable><table className="table table-hover align-middle erp-table"><thead><tr><th>Pago</th><th>Venta</th><th>Importe</th><th>Método</th><th>Estado</th><th>Referencia</th><th>Detalle</th></tr></thead><tbody>{s.payments.filter(p=>(p.id+p.saleId+p.reference).toLowerCase().includes(query.toLowerCase())).map(p=><tr key={p.id}><td>{p.id}</td><td>{p.saleId}</td><td>{money(p.amount)}</td><td><MethodChip name={p.method}/></td><td><Badge value={p.status}/></td><td>{p.reference}</td><td><RecordDetails kind="Pago" record={p} state={s}/></td></tr>)}{!s.payments.some(p=>(p.id+p.saleId+p.reference).toLowerCase().includes(query.toLowerCase()))&&<tr><td colSpan={7} className="text-center py-4">No hay registros que coincidan con los filtros.</td></tr>}</tbody></table></PaginatedTable></Panel>
 </CommerceLayout>;
}
