import {useStore} from '../../core/store';
import {money} from '../../core/types';
import {Panel} from '../../components/ui';
import {projection} from './projection';
export default function Forecast() {
  const {state}=useStore();
  const parts=new Intl.DateTimeFormat('es-PE',{year:'numeric',month:'2-digit',timeZone:'America/Lima'}).formatToParts(new Date());
  const month=parts.find(p=>p.type==='year')!.value+'-'+parts.find(p=>p.type==='month')!.value;
  const p=projection(state,month);
  return <Panel title={'Proyección mensual · '+month}><p>Promedio simple de los tres meses cerrados anteriores ({p.rows[0].key} a {p.rows[2].key}). Cada indicador requiere actividad registrada en los tres meses.</p>
    <div className="d-flex gap-4 flex-wrap"><div><small>Ventas netas estimadas</small><strong className="d-block">{p.sales===null?'Historial insuficiente':money(p.sales)}</strong></div>
    <div><small>Flujo neto de caja estimado</small><strong className="d-block">{p.flow===null?'Historial insuficiente':money(p.flow)}</strong></div></div>
    <details className="mt-2"><summary>Ver cálculo por mes</summary><div className="table-responsive"><table className="table"><thead><tr><th>Mes</th><th>Ventas menos devoluciones</th><th>Entradas menos salidas</th></tr></thead><tbody>{p.rows.map(r=><tr key={r.key}><td>{r.key}</td><td>{r.hasSales?money(r.sales):'Sin registros'}</td><td>{r.hasCash?money(r.flow):'Sin registros'}</td></tr>)}</tbody></table></div><small>La caja incluye cobros aprobados, ingresos y egresos registrados. Los importes se expresan en soles.</small></details>
  </Panel>;
}
