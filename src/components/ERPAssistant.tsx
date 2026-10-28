import {useState} from 'react';
import type {FormEvent} from 'react';
import {useNavigate} from 'react-router-dom';
import {Bot,ArrowUp, X,Minimize2,MessageCircle,ArrowRight,ShieldCheck,Sparkles} from 'lucide-react';
import {useStore} from '../core/store';
import type {State} from '../core/types';
import {money} from '../core/types';
import {dueOn,stockOf} from '../core/operations';
import './assistant.css';

type Message={by:'user'|'bot';text:string};
const tips:Record<string,string>={
 'cotizaciones':'Estás en Cotizaciones. Crea una oferta, apruébala cuando el cliente la acepte y pasarás automáticamente a Pedidos.',
 'pedidos':'Estás en Pedidos. Cada pedido conserva los productos de la cotización. Selecciona Preparar venta para abrir Ventas con el pedido precargado.',
 'ventas':'Estás en Ventas. Confirma la venta en un almacén; el stock se descuenta y pasarás a Comprobantes.',
 'comprobantes':'Estás en Comprobantes. Consulta o exporta el PDF de demostración y continúa al cobro de la misma venta.',
 'cobros':'Estás en Cobros. Selecciona una venta pendiente, registra un pago simulado con tu confirmación y revisa el saldo.',
 'devoluciones':'Estás en Postventa. Vincula cada devolución a una venta y el inventario se actualiza.',
 'clientes':'En Clientes puedes mantener los datos maestros. También es posible dar de alta un cliente sin salir del flujo comercial.',
 'inicio':'El dashboard es una vista de indicadores; para registrar una operación entra en Cotizaciones.',
 'stock':'En Existencias se consulta la disponibilidad de cada almacén. La venta valida las cantidades antes de descontar inventario.',
 'integraciones':'Las integraciones deben configurarse con credenciales protegidas en un servidor; las demostraciones locales no son pasarelas bancarias reales.',
};
function localAnswer(question:string,s:State,section:string){
 const q=question.toLocaleLowerCase('es-PE');
 const pendingQuotes=s.quotes.filter(x=>x.status==='borrador'||x.status==='aprobada').length;
 const pendingOrders=s.orders.filter(x=>x.status!=='completado'&&x.status!=='cancelado').length;
 const unpaid=s.sales.filter(v=>v.status==='vigente'&&dueOn(s,v)>0);
 const balance=unpaid.reduce((a,v)=>a+dueOn(s,v),0);
 const low=s.products.filter(p=>p.active&&stockOf(s,p.id)<=p.min).length;
 if(/(qué|que).*(hac|sigui)|siguiente paso|donde (empiezo|continu)|cómo comenzar|ayuda/.test(q))return tips[section]||'Para iniciar, abre Cotizaciones. Los módulos siguen separados y el ERP te conduce al siguiente cuando confirmas una acción.';
 if(/cotiza|presupuesto|oferta/.test(q))return `Hay ${pendingQuotes} cotizaciones abiertas. Una cotización reúne cliente, productos y precios; cuando el cliente la acepta, el sistema crea un pedido desde ella. En Cotizaciones puedes aprobarlas y enviarlas a Pedidos.`;
 if(/pedido|orden/.test(q))return `Hay ${pendingOrders} pedidos pendientes. Un pedido se registra tras la aceptación de una cotización y antes de registrar la venta. En Pedidos puedes abrir una venta precargada.`;
 if(/cobr|pago|deuda|pendiente|saldo/.test(q))return `Hay ${unpaid.length} ventas con saldo por cobrar, que suman ${money(balance)}. Abre Cobros y selecciona la venta para continuar. Los métodos y pagos disponibles son simulados.`;
 if(/stock|existencia|inventario|almacén|almacen/.test(q))return `Hay ${low} productos activos cuyo stock total está en o por debajo del mínimo configurado. Antes de confirmar una venta se comprueba el stock en el almacén elegido. Revisa Existencias si necesitas reponer.`;
 if(/client/.test(q))return `Hay ${s.clients.filter(c=>c.active).length} clientes activos. Puedes registrar uno en Mantenimiento → Clientes antes de preparar la cotización.`;
 if(/boleta|factura|comprobante|sunat/.test(q))return 'Cuando se registra una venta desde un pedido, se asocia un comprobante de demostración que se puede exportar a PDF. No es un comprobante electrónico autorizado por SUNAT.';
 if(/devoluc|postventa|reembolso/.test(q))return 'Las devoluciones se encuentran en Flujo comercial → Postventa y devoluciones. Selecciona una venta, producto, cantidad y motivo; el sistema vincula el registro a la venta y ajusta el inventario. La gestión financiera de reembolsos reales requiere una integración adicional.';
 if(/ia|api|gemini|inteligencia artificial/.test(q))return 'Funciono en modo guía local, con respuestas basadas en los registros de este navegador. Si el administrador conecta un backend seguro con Gemini, también puedo responder consultas en lenguaje natural. Nunca efectúo pagos ni operaciones sin una acción explícita del usuario.';
 return `${tips[section]||'Puedes consultar el estado de cotizaciones, pedidos, ventas, cobros, inventario y clientes.'} Dime qué necesitas hacer o escribe «¿Qué ventas faltan cobrar?».`;
}
export default function ERPAssistant({section}:{section:string}){
 const {state:s,user}=useStore();const navigate=useNavigate();
 const [open,setOpen]=useState(false);const [question,setQuestion]=useState('');
 const [messages,setMessages]=useState<Message[]>([{by:'bot',text:'¡Hola! Soy el asistente comercial del ERP. Puedo explicarte el siguiente paso, resumir pendientes y ayudarte a ubicar operaciones. No realizo cambios sin tu confirmación.'}]);
 const [busy,setBusy]=useState(false);const [mode,setMode]=useState<'local'|'gemini'>('local');
 const endpoint=(import.meta.env.VITE_ASSISTANT_API_URL||'').trim();
 if(!user)return null;
 const go=(path:string)=>{navigate(path);setOpen(false);};
 const send=async(raw:string)=>{const value=raw.trim().slice(0,500);if(!value||busy)return;setQuestion('');setMessages(old=>[...old,{by:'user',text:value}]);setBusy(true);
  const fallback=localAnswer(value,s,section);
  if(!endpoint){setMessages(old=>[...old,{by:'bot',text:fallback}]);setMode('local');setBusy(false);return;}
  try{const valid=s.sales.filter(v=>v.status==='vigente');const pending=valid.filter(v=>dueOn(s,v)>0);
   const payload={question:value,context:{section,counts:{clients:s.clients.filter(c=>c.active).length,openQuotes:s.quotes.filter(q=>q.status==='borrador'||q.status==='aprobada').length,openOrders:s.orders.filter(o=>o.status!=='completado'&&o.status!=='cancelado').length,sales:valid.length,unpaid:pending.length,lowStockProducts:s.products.filter(p=>p.active&&stockOf(s,p.id)<=p.min).length},pendingBalance:Number(pending.reduce((a,v)=>a+dueOn(s,v),0).toFixed(2))}};
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('IA no disponible');const result=await response.json();
   if(typeof result.answer!=='string'||!result.answer.trim())throw Error('Respuesta vacía');setMessages(old=>[...old,{by:'bot',text:result.answer.slice(0,1700)}]);setMode('gemini');
  }catch{setMessages(old=>[...old,{by:'bot',text:`La IA externa no está disponible. Guía local: ${fallback}`}]);setMode('local');}finally{setBusy(false);}
 };
 const submit=(event:FormEvent)=>{event.preventDefault();void send(question);};
 return <div className="erp-assistant-root"><button type="button"className="erp-assistant-launch"aria-label="Abrir asistente del ERP"aria-expanded={open}onClick={()=>setOpen(x=>!x)}>{open?<X size={24}/>:<><Bot size={25}/><i/></>}</button>
 {open&&<section className="erp-assistant-panel"aria-label="Asistente comercial"><header><div className="erp-assistant-avatar"><Bot size={23}/></div><div><b>Asistente ERP</b><small>{mode==='gemini'?'IA Gemini conectada':'Guía local contextual'} · Solo lectura</small></div><button onClick={()=>setOpen(false)}aria-label="Minimizar asistente"><Minimize2 size={18}/></button></header><div className="erp-assistant-messages"role="log"aria-live="polite">{messages.map((m,i)=><div key={i}className={'erp-assistant-message '+m.by}>{m.by==='bot'&&<Bot size={15}/>}<p>{m.text}</p></div>)}{busy&&<p className="erp-assistant-typing">Preparando respuesta...</p>}</div><div className="erp-assistant-shortcuts"><button onClick={()=>void send('¿Qué debo hacer ahora?')}>¿Qué sigue?</button><button onClick={()=>void send('¿Cuánto falta cobrar?')}>Saldos</button><button onClick={()=>void send('¿Cuántas cotizaciones están pendientes?')}>Cotizaciones</button></div><div className="erp-assistant-links"><button onClick={()=>go('/cotizaciones')}><ArrowRight size={14}/> Iniciar en Cotizaciones</button><button onClick={()=>go('/cobros')}><MessageCircle size={14}/> Ver cobros pendientes</button></div><form onSubmit={submit}><input aria-label="Escribe tu consulta"value={question}onChange={e=>setQuestion(e.target.value)}maxLength={500}placeholder="Pregúntame sobre el ERP..."/><button type="submit"aria-label="Enviar consulta"disabled={!question.trim()||busy}><ArrowUp size={17}/></button></form><footer><ShieldCheck size={13}/> No ejecuta operaciones. No envíes datos privados. <Sparkles size={13}/></footer></section>}</div>;
}
