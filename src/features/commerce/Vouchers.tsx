import {useEffect,useMemo,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {Badge,Panel} from '../../components/ui';
import {PaginatedTable} from '../../components/PaginatedTable';
import {money,sumItems} from '../../core/types';
import type {TipoComprobante} from '../../core/types';
import {hasVoucher,issueVoucher,dueOn} from '../../core/operations';
import {CommerceLayout,RecordDetails,confirmAction,useCommerce} from './Shared';
import {receiptPDF} from '../../core/export';

export default function Vouchers(){
 const {state:s,update,run,error,success,clientName,productName}=useCommerce();
 const navigate=useNavigate();const [params]=useSearchParams();
 const saleId=params.get('sale')||'';
 const [selected,setSelected]=useState('');const [kind,setKind]=useState<TipoComprobante>('boleta');
 const [name,setName]=useState(''),[doc,setDoc]=useState('');
 const [docType,setDocType]=useState<'RUC'|'DNI'|'CE'|'PASAPORTE'|'-'>('-');
 const [address,setAddress]=useState('');
 const [filter,setFilter]=useState<'pendientes'|'emitidos'|'todos'>('todos');
 const [query,setQuery]=useState('');
 const sale=s.sales.find(v=>v.id===selected&&v.status==='vigente');
 const pending=s.sales.filter(v=>v.status==='vigente'&&!hasVoucher(v));
 useEffect(()=>{if(saleId)setSelected(saleId);},[saleId]);
 useEffect(()=>{
   if(!sale||hasVoucher(sale))return;
   const client=s.clients.find(x=>x.id===sale.clientId);
   const document=(sale.compradorDoc||client?.document||'').trim();
   setName(sale.compradorNombre||client?.name||'');setDoc(document);
   setDocType(/^\d{11}$/.test(document)?'RUC':/^\d{8}$/.test(document)?'DNI':'-');
   setAddress(sale.compradorDireccion||'');setKind('boleta');
 },[selected]);
 const rows=useMemo(()=>s.sales.filter(v=>(filter==='pendientes'?!hasVoucher(v)&&v.status==='vigente':filter==='emitidos'?hasVoucher(v):true)&&`${v.id} ${clientName(v.clientId)} ${v.serie||''}`.toLowerCase().includes(query.toLowerCase())),[s.sales,filter,query,s.clients]);
 const emit=()=>{
  if(!sale)return;
  if(!confirmAction(`¿Emitir ${kind} de demostración para ${sale.id}? El número de serie será permanente.`))return;
  run(()=>{update(old=>issueVoucher(old,sale.id,{tipoComprobante:kind,compradorNombre:name,compradorDoc:doc,compradorTipoDoc:docType,compradorDireccion:address}));setSelected('');setFilter('emitidos');return 'Comprobante emitido. Ya puedes registrar el cobro vinculado a la venta.';});
 };
 const pdf=(v:typeof s.sales[number])=>{if(!hasVoucher(v))return;
  receiptPDF({id:v.id,tipoComprobante:v.tipoComprobante,serie:v.serie,correlativo:v.correlativo,date:v.fechaEmision||v.date,
   compradorNombre:v.compradorNombre||clientName(v.clientId),compradorDoc:v.compradorDoc||'',compradorTipoDoc:v.compradorTipoDoc||'-',compradorDireccion:v.compradorDireccion,items:v.items.map(i=>({name:productName(i.productId),qty:i.qty,price:i.price,amount:sumItems([i])})),total:sumItems(v.items),igv:v.igv,baseImponible:v.baseImponible,paymentMethod:v.paymentMethod||'Pendiente'});
 };
 return <CommerceLayout section="comprobantes" title="Comprobantes" count={s.sales.filter(hasVoucher).length} error={error} success={success}>
  <div className="alert alert-info">Los comprobantes de este ERP son <strong>simulados, sin validez tributaria</strong>. La venta descuenta el inventario; la emisión asigna una serie y número únicos.</div>
  {sale&&hasVoucher(sale)&&<div className="alert alert-success" role="status">La venta <b>{sale.id}</b> ya tiene el comprobante <b>{sale.serie}-{String(sale.correlativo).padStart(8,'0')}</b>.{dueOn(s,sale)>0&&<button type="button" className="btn btn-sm btn-success ms-2" onClick={()=>navigate(`/cobros?sale=${encodeURIComponent(sale.id)}`)}>Ir al cobro →</button>}</div>}
  <div className="commerce-voucher-stats"><span><strong>{pending.length}</strong> ventas sin comprobante</span><span><strong>{s.sales.filter(hasVoucher).length}</strong> comprobantes emitidos</span></div>
  {sale&&!hasVoucher(sale)&&<Panel title={`Emitir comprobante para ${sale.id}`}>
   <div className="commerce-voucher-head"><strong>Cliente: {clientName(sale.clientId)}</strong><strong>Total: {money(sumItems(sale.items))}</strong></div>
   <div className="commerce-voucher-form">
    <label>Tipo de comprobante<select className="form-select" value={kind} onChange={e=>setKind(e.target.value as TipoComprobante)}><option value="boleta">Boleta</option><option value="factura">Factura</option></select></label>
    <label>Nombre o razón social<input className="form-control" value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Tipo de documento<select className="form-select" value={docType} onChange={e=>setDocType(e.target.value as typeof docType)}><option value="-">Sin documento</option><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></select></label>
    <label>Número de documento<input className="form-control" value={doc} onChange={e=>setDoc(e.target.value)} placeholder="DNI 8 dígitos / RUC 11 dígitos"/></label>
    {kind==='factura'&&<label>Dirección fiscal<input className="form-control" value={address} onChange={e=>setAddress(e.target.value)}/></label>}
   </div><p className="text-secondary small mt-3">Factura: RUC de 11 dígitos. Boleta mayor de S/ 700: DNI de 8 dígitos o RUC de 11 dígitos.</p>
   <button type="button" className="btn btn-primary" onClick={emit}>Confirmar emisión simulada</button>
  </Panel>}
  <Panel title="Bandeja de emisión y consulta">
   <div className="commerce-voucher-filters"><label>Buscar venta o cliente<input className="form-control" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Venta, cliente o serie…"/></label><label>Mostrar<select className="form-select" value={filter} onChange={e=>{setFilter(e.target.value as typeof filter);setSelected('');}}><option value="pendientes">Pendientes de emisión</option><option value="emitidos">Emitidos</option><option value="todos">Todos</option></select></label></div>
   <PaginatedTable><table className="table table-hover align-middle erp-table"><thead><tr><th>Venta</th><th>Cliente</th><th>Total</th><th>Comprobante</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
    {rows.map(v=><tr key={v.id} className={v.id===selected?'table-info':''}><td><b>{v.id}</b></td><td>{clientName(v.clientId)}</td><td>{money(sumItems(v.items))}</td><td>{hasVoucher(v)?`${v.serie}-${String(v.correlativo).padStart(8,'0')}`:'Pendiente de emisión'}</td><td><Badge value={v.status}/></td><td className="commerce-actions"><RecordDetails kind="Venta" record={v} state={s}/>{hasVoucher(v)?<><button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=>pdf(v)}>PDF de prueba</button>{v.status==='vigente'&&dueOn(s,v)>0&&<button type="button" className="btn btn-sm btn-outline-success" onClick={()=>navigate(`/cobros?sale=${encodeURIComponent(v.id)}`)}>Cobrar →</button>}</>:<button type="button" disabled={v.status!=='vigente'} className="btn btn-sm btn-primary" onClick={()=>{setSelected(v.id);window.scrollTo({top:0,behavior:'smooth'});}}>Preparar comprobante →</button>}</td></tr>)}
    {!rows.length&&<tr><td colSpan={6} className="text-center py-4 text-secondary">No hay registros para estos filtros.</td></tr>}
   </tbody></table></PaginatedTable>
  </Panel>
 </CommerceLayout>;
}
