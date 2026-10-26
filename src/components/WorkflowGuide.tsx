import {Link} from 'react-router-dom';
import {ArrowRight,CheckCircle2} from 'lucide-react';
import {allowed} from '../core/permissions';
import {useStore} from '../core/store';
const STEPS=[{path:'cotizaciones',label:'Cotizar',hint:'Definir propuesta'},{path:'pedidos',label:'Pedido',hint:'Confirmar solicitud'},{path:'ventas',label:'Venta',hint:'Registrar salida'},{path:'comprobantes',label:'Comprobante',hint:'Consultar documento'},{path:'cobros',label:'Cobro',hint:'Registrar pago'}];
export function WorkflowGuide({section}:{section:string}){
  const {user}=useStore();
  const index=STEPS.findIndex(s=>s.path===section);
  if(index<0||!user)return null;
  const next=STEPS.slice(index+1).find(s=>allowed(user.role,s.path));
  return <section className="erp-process-guide" aria-label="Flujo comercial"><header><div><span className="eyebrow">RUTA OPERATIVA</span><strong>Del primer contacto al cobro</strong></div><small>Los pasos muestran el orden recomendado; cada registro se confirma en su módulo.</small></header><div className="erp-process-steps">{STEPS.map((s,i)=>allowed(user.role,s.path)?<Link key={s.path} to={'/'+s.path} aria-current={s.path===section?'step':undefined} className={'erp-process-step'+(i===index?' is-current':i<index?' is-completed':'')}><span className="erp-step-num">{i<index?<CheckCircle2 size={16}/>:String(i+1).padStart(2,'0')}</span><span><b>{s.label}</b><small>{s.hint}</small></span>{i<STEPS.length-1&&<ArrowRight className="erp-process-arrow"size={14}/>}</Link>:null)}</div><footer><span>{section==='cotizaciones'?'Aprobar una cotización habilita «Convertir a pedido».':section==='pedidos'?'Puedes crear una venta desde un pedido para conservar la relación.':section==='ventas'?'Registrar una venta genera un comprobante simulado y actualiza el stock.':section==='comprobantes'?'El comprobante se consulta desde el historial; no es un documento tributario real.':'Solo los pagos aprobados reducen el saldo pendiente de la venta.'}</span>{next&&<Link to={'/'+next.path} className="erp-next-step">Siguiente: {next.label} <ArrowRight size={15}/></Link>}</footer></section>;
}
