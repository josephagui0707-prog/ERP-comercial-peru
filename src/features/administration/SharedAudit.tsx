import {useCallback,useEffect,useState} from 'react';
import {Panel} from '../../components/ui';
import {PaginatedTable} from '../../components/PaginatedTable';
import {api} from '../../core/api';
type Entry={id:number;at:number;action:string;ref:string;actor:string};
const labels:Record<string,string>={'sesion.inicio':'Inicio de sesión','sesion.cierre':'Cierre de sesión','cuenta.creada':'Cuenta creada','cuenta.actualizada':'Cuenta actualizada','entrega.creada':'Entrega creada','entrega.iniciada':'Salida','entrega.entregada':'Llegada','entrega.cancelada':'Entrega cancelada','asistente.entrega.creada':'Entrega creada desde el asistente'};
export default function SharedAudit(){
  const [rows,setRows]=useState<Entry[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const reload=useCallback(async()=>{setBusy(true);try{setRows(await api<Entry[]>('/audit'));setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}},[]);
  useEffect(()=>{void reload();},[reload]);
  return <Panel title="Cuentas y entregas del servidor" actions={<button type="button" className="btn btn-sm btn-outline-primary" disabled={busy} onClick={reload}>Actualizar historial</button>}>
    <p>Últimos 100 eventos de tu organización. Horario de Lima.</p>
    {error&&<p role="alert" className="alert alert-warning">{error}</p>}
    <PaginatedTable><table className="table erp-table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Referencia</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.at).toLocaleString('es-PE',{timeZone:'America/Lima'})}</td><td>{r.actor}</td><td>{labels[r.action]||r.action}</td><td>{r.ref.slice(0,8)}</td></tr>)}</tbody></table></PaginatedTable>
  </Panel>;
}
