import {useStore} from '../../core/store';
import {money} from '../../core/types';
import {projection} from './projection';
import {BarChart3,Calculator,Info,TrendingUp,WalletCards} from 'lucide-react';

export default function Forecast(){
 const {state}=useStore();
 const parts=new Intl.DateTimeFormat('es-PE',{year:'numeric',month:'2-digit',timeZone:'America/Lima'}).formatToParts(new Date());
 const month=parts.find(p=>p.type==='year')!.value+'-'+parts.find(p=>p.type==='month')!.value;
 const p=projection(state,month);
 const available=p.rows.filter(row=>row.hasSales||row.hasCash).length;
 const max=Math.max(1,...p.rows.map(r=>Math.abs(r.sales)),...p.rows.map(r=>Math.abs(r.flow)));
 return <section className="exec-forecast" aria-label="Proyección financiera del mes">
  <header className="exec-forecast-heading"><div><span className="exec-forecast-label"><Calculator size={15}/> ESTIMACIÓN · DATOS HISTÓRICOS</span>
    <h2>Proyección mensual <span>{month}</span></h2>
    <p>Promedio simple de los tres meses cerrados anteriores. No es una predicción de inteligencia artificial ni un presupuesto aprobado.</p>
  </div><span className="exec-forecast-method">Base: 3 meses</span></header>
  <div className="exec-forecast-body">
    <div className="exec-forecast-kpis">
      <div><div className="exec-forecast-kpi-label"><TrendingUp size={16}/> Ventas netas estimadas</div>
        <strong>{p.sales===null?'Historial insuficiente':money(p.sales)}</strong><small>Ventas vigentes menos devoluciones</small>
      </div>
      <div><div className="exec-forecast-kpi-label"><WalletCards size={16}/> Flujo neto estimado</div>
        <strong>{p.flow===null?'Historial insuficiente':money(p.flow)}</strong><small>Cobros e ingresos menos egresos</small>
      </div>
    </div>
    <div className="exec-forecast-trend"><div className="exec-forecast-trend-title"><BarChart3 size={16}/><b>Base de cálculo</b></div>
      {p.rows.map(r=><div key={r.key} className="exec-forecast-month">
        <span>{r.key}</span><div className="exec-forecast-bar" title={'Ventas '+money(r.sales)}><i style={{width:(Math.abs(r.sales)/max*100)+'%'}}/></div><strong>{r.hasSales?money(r.sales):'Sin ventas'}</strong>
      </div>)}
      <small>{available}/3 meses con actividad registrada · barras de ventas netas</small>
    </div>
  </div>
  {p.sales===null||p.flow===null?<p className="exec-forecast-warning"><Info size={15}/> No hay datos suficientes de los tres meses para estimar ambos indicadores con el método actual.</p>:null}
  <details className="exec-forecast-detail"><summary>Consultar desglose y metodología</summary>
    <div className="table-responsive"><table className="table"><thead><tr><th>Mes</th><th>Ventas netas</th><th>Flujo de caja</th></tr></thead><tbody>{p.rows.map(r=><tr key={r.key}><td>{r.key}</td><td>{r.hasSales?money(r.sales):'Sin registros'}</td><td>{r.hasCash?money(r.flow):'Sin registros'}</td></tr>)}</tbody></table></div>
    <p>Los importes están en soles. La proyección es el promedio de tres meses con actividad en cada indicador; si falta alguno, se informa «Historial insuficiente».</p>
  </details>
 </section>;
}
