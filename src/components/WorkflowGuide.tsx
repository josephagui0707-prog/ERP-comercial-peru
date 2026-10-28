import {Link} from 'react-router-dom';
import {ArrowRight,CheckCircle2} from 'lucide-react';
import {allowed} from '../core/permissions';
import {useStore} from '../core/store';
import {dueOn,hasVoucher} from '../core/operations';

const STEPS=[{path:'cotizaciones',name:'Cotizaciones'},{path:'pedidos',name:'Pedidos'},{path:'ventas',name:'Ventas'},{path:'comprobantes',name:'Comprobantes'},{path:'cobros',name:'Cobros'}];
/** Cola de trabajo real; no implica que las etapas anteriores hayan ocurrido en cada registro. */
export function WorkflowGuide({section}:{section:string}){
 const {state:s,user}=useStore();
 if(!user||!STEPS.some(x=>x.path===section))return null;
 const pending=[s.quotes.filter(q=>q.status==='aprobada').length,
  s.orders.filter(o=>o.status==='pendiente'||o.status==='confirmado'||o.status==='preparando').length,
  s.orders.filter(o=>o.status==='preparando'&&!o.saleId).length,
  s.sales.filter(v=>v.status==='vigente'&&!hasVoucher(v)).length,
  s.sales.filter(v=>v.status==='vigente'&&hasVoucher(v)&&dueOn(s,v)>0).length];
 const current=STEPS.findIndex(x=>x.path===section);
 return <section className="commerce-work-queue" aria-label="Pendientes del proceso comercial">
  <div className="commerce-work-queue-header"><div><span className="eyebrow">SEGUIMIENTO DEL PROCESO</span><strong>Trabajo pendiente por etapa</strong></div><small>Los documentos avanzan solo mediante acciones válidas.</small></div>
  <div className="commerce-work-queue-items">{STEPS.map((step,i)=>allowed(user.role,step.path)?<Link key={step.path} to={`/${step.path}`} className={'commerce-work-queue-item'+(i===current?' current':'')} aria-current={i===current?'step':undefined}>
    <span className="commerce-work-queue-index">{i+1}</span><span>{step.name}</span><strong>{pending[i]}</strong>{i===current?<CheckCircle2 size={15}/>:<ArrowRight size={14}/>}</Link>:null)}</div>
 </section>;
}
