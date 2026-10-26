import {useState} from 'react';
import {useStore} from '../../core/store';
import {money} from '../../core/types';
import {Panel} from '../../components/ui';
import Dialog from '../../components/Dialog';
import {PaginatedTable} from '../../components/PaginatedTable';
import {payPurchase} from './service';
export default function Payables(){
 const {state,update}=useStore();const [id,setId]=useState('');const [error,setError]=useState('');const [message,setMessage]=useState('');
 const rows=state.purchases.filter(p=>p.status==='recibida'&&p.items?.length&&!p.paidAt),selected=rows.find(p=>p.id===id);
 return <Panel title="Cuentas por pagar a proveedores"><p>Compras recibidas pendientes de pago · Total: <strong>{money(rows.reduce((n,p)=>n+p.amount,0))}</strong></p>{message&&<p role="status" className="alert alert-success">{message}</p>}<PaginatedTable><table className="table erp-table"><thead><tr><th>Orden</th><th>Proveedor</th><th>Documento</th><th>Saldo</th><th>Acción</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td>{p.id}</td><td>{state.suppliers.find(s=>s.id===p.supplierId)?.name}</td><td>{p.document}</td><td>{money(p.amount)}</td><td><button className="btn btn-sm btn-outline-primary" onClick={()=>{setId(p.id);setError('')}}>Registrar pago</button></td></tr>)}</tbody></table></PaginatedTable>{!rows.length&&<p>No hay compras recibidas pendientes de pago.</p>}{selected&&<Dialog title="Confirmar pago al proveedor" confirm onClose={()=>setId('')}><p>Registrar el pago total de <strong>{money(selected.amount)}</strong> por {selected.id}.</p><p>Se añadirá un egreso simulado y se cerrará este saldo. No se transfiere dinero real.</p>{error&&<p role="alert" className="alert alert-danger">{error}</p>}<div className="admin-actions"><button className="btn btn-outline-secondary" onClick={()=>setId('')}>Volver</button><button className="btn btn-primary" onClick={()=>{try{update(s=>payPurchase(s,selected.id));setId('');setMessage('Pago registrado en el libro de movimientos financieros.')}catch(e){setError((e as Error).message)}}}>Confirmar pago</button></div></Dialog>}</Panel>;
}
