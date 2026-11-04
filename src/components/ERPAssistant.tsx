import {useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Bot,ArrowUp,X,Minimize2,ShieldCheck,ExternalLink,Sparkles,Trash2} from 'lucide-react';
import {useStore} from '../core/store';
import {api} from '../core/api';
import {allowed} from '../core/permissions';
import {advanceOrder,createQuote,dueOn,stockOf} from '../core/operations';
import {createThirdParty,newProductId,saveProduct} from '../features/inventory/service';
import {interpretLocal} from '../core/assistant-local';
import type {LocalProposal} from '../core/assistant-local';
import './assistant.css';

type Msg={by:'user'|'bot';text:string};
type Command={type:'trip';id:string;label:string}|{type:'order';id:string;status:'confirmado'|'preparando';label:string}|LocalProposal;
type Answer={answer?:string;mode:'local'|'gemini';fallback?:boolean;providerUnavailable?:boolean;open?:string;proposal?:{id:string;label:string}};

const WELCOME_MSG = '¡Hola! Soy el asistente ERP con IA Gemini.\nPuedo consultar tus datos, explicar procesos y preparar acciones para que las confirmes.\n\nCon Gemini activo, también puedo resolver dudas sobre IGV, SUNAT y procesos comerciales.\n\nEscribe «ayuda» para ver ejemplos.';

const shortcutText=(role:string)=>role==='monitor'?['Ver mis rutas','Ayuda']:role==='repartidor'?['Ver mis rutas','Crea una entrega simulada','Ayuda']:role==='finanzas'?['Consultar saldos','Ventas de hoy','Ayuda']:role==='almacen'?['Productos con poco stock','Registrar producto','Ayuda']:['Nueva cotización','Ventas de hoy','Productos con poco stock','Ayuda'];

export default function ERPAssistant({section}:{section:string}){
 const {state:s,user,update}=useStore(),navigate=useNavigate();
 const [open,setOpen]=useState(false),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[mode,setMode]=useState('local');
 const [messages,setMessages]=useState<Msg[]>([{by:'bot',text:WELCOME_MSG}]);
 const [command,setCommand]=useState<Command|null>(null),[link,setLink]=useState('');
 const bottom=useRef<HTMLDivElement>(null),lock=useRef(false);

 useEffect(()=>{if(open)bottom.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[messages,open,command]);

 if(!user)return null;
 const role=user.role;

 const say=(text:string)=>setMessages(old=>[...old.slice(-49),{by:'bot',text}]);
 const go=(path:string)=>{if(allowed(role,path.split('?')[0])){navigate('/'+path);setOpen(false);}};

 const clearHistory=()=>{
  setMessages([{by:'bot',text:WELCOME_MSG}]);
  setCommand(null);
  setLink('');
 };

 const send=async(raw:string)=>{
  const value=raw.trim();if(!value||lock.current)return;
  lock.current=true;setBusy(true);setMode('local');setCommand(null);setLink('');setQuestion('');setMessages(old=>[...old,{by:'user',text:value}]);
  const q=value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  try{
   if(/\b(confirma|confirmar|prepara|preparar)\b/.test(q)&&/pedido/.test(q)&&!/simula/.test(q)){
    if(!allowed(role,'pedidos')){say('Tu perfil no puede cambiar pedidos.');return;}
    const code=q.match(/\bped-[a-z0-9-]+\b/i)?.[0],order=s.orders.find(o=>o.id.toLowerCase()===code?.toLowerCase());
    if(!order){say('Incluye el código del pedido; por ejemplo: «Confirma el pedido PED-1».');return;}
    const status=q.includes('prepar')?'preparando':'confirmado';
    if(order.status!==(status==='preparando'?'confirmado':'pendiente')){say('El pedido '+order.id+' está '+order.status+' y no admite ese cambio.');return;}
    say('Propuesta: '+order.id+' pasará de '+order.status+' a '+status+'. No he guardado ningún cambio.');setCommand({type:'order',id:order.id,status,label:'Confirmar cambio de estado'});return;
   }
   const local=interpretLocal(value,s,role);
   if(local){say(local.answer);if(local.open)setLink(local.open);if(local.proposal)setCommand(local.proposal);return;}
   const counts={openOrders:s.orders.filter(o=>!['completado','cancelado'].includes(o.status)).length,openQuotes:s.quotes.filter(o=>['borrador','aprobada'].includes(o.status)).length,unpaid:s.sales.filter(v=>v.status==='vigente'&&dueOn(s,v)>0).length,lowStockProducts:s.products.filter(p=>p.active&&stockOf(s,p.id)<=p.min).length};
   const history=messages
    .slice(1)
    .slice(-20)
    .map(m=>({role:m.by==='user'?'user':'model' as 'user'|'model',text:m.text}));
   const ans=await api<Answer>('/assistant','POST',{question:value,context:{counts},history});
   setMode(ans.mode);if(ans.answer)say(ans.answer);
   else say('No tengo una acción segura para esa consulta. Puedo mostrarte datos reales o abrir formularios. Prueba «ayuda», «nueva cotización», «stock», «ventas de hoy» o «crear una entrega simulada».');
   if(ans.proposal)setCommand({type:'trip',...ans.proposal});if(ans.open==='rutas'&&allowed(role,'rutas'))setLink('rutas');
  }catch(e){
   const err=e as Error;
   const isNetwork=err.message.includes('fetch')||err.message.includes('network')||err.message.includes('NetworkError')||err.message.includes('Failed to fetch');
   if(isNetwork){say('No se pudo conectar con el servidor. Verifica tu conexión a internet e inténtalo de nuevo.');}
   else{say('Error al procesar la consulta: '+err.message+'. Prueba «ayuda» para usar comandos locales.');}
  }
  finally{setBusy(false);lock.current=false;}
 };

 const apply=async()=>{
  if(!command||lock.current)return;lock.current=true;setBusy(true);
  try{
   if(command.type==='trip'){const t=await api<{id:string}>('/assistant/confirm','POST',{id:command.id});say('Entrega creada correctamente. Puedes abrirla en Rutas.');setLink('rutas?entrega='+encodeURIComponent(t.id));}
   else if(command.type==='order'){if(!allowed(role,'pedidos'))throw Error('Sin permisos.');update(old=>advanceOrder(old,command.id,command.status));say('Pedido '+command.id+' actualizado a '+command.status+'.');setLink('pedidos?focus='+encodeURIComponent(command.id));}
   else if(command.type==='quote'){if(!allowed(role,'cotizaciones'))throw Error('Sin permisos.');update(old=>{const p=old.products.find(x=>x.id===command.productId);if(!p)throw Error('El producto ya no existe.');return createQuote(old,command.clientId,[{productId:p.id,qty:command.qty,price:p.price,discount:0}]);});say('Cotización guardada como borrador. Puedes revisarla, aprobarla y convertirla a pedido.');setLink('cotizaciones');}
   else if(command.type==='client'){if(!allowed(role,'clientes'))throw Error('Sin permisos.');update(old=>{const created=createThirdParty(old,'cliente',command.name,command.document);const c=created.state.clients.find(c=>c.id===created.id);if(c)c.email=command.email;return created.state;});say('Cliente registrado en el catálogo de este navegador.');setLink('clientes');}
   else if(command.type==='product'){if(!allowed(role,'productos'))throw Error('Sin permisos.');update(old=>saveProduct(old,{id:newProductId(old),sku:command.sku,name:command.name,category:command.category,price:command.price,cost:command.cost,min:5,active:true}));say('Producto registrado. Stock inicial: 0. Registra una entrada antes de venderlo.');setLink('productos');}
   setCommand(null);
  }catch(e){say('No se guardó el cambio: '+(e as Error).message);setCommand(null);}
  finally{lock.current=false;setBusy(false);}
 };

 const linkLabel=link.startsWith('rutas')?'Abrir ruta':link.startsWith('pedidos')?'Abrir pedido':link.startsWith('cotizaciones')?'Abrir cotizaciones':link.startsWith('productos')?'Abrir productos':link.startsWith('clientes')?'Abrir clientes':'Abrir módulo';

 return <div className="erp-assistant-root"><button type="button" className="erp-assistant-launch" aria-label="Abrir asistente del ERP" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={22}/>:<Bot size={25}/>}</button>
 {open&&<section className="erp-assistant-panel" aria-label="Asistente del ERP"><header><div className="erp-assistant-avatar"><Bot size={22}/></div><div><b>Asistente de operaciones</b><small><span className="erp-assistant-badge"><Sparkles size={10}/>{mode==='gemini'?'✨ Gemini AI':'📊 Datos locales'}</span> · {user.name}</small></div>
  {messages.length>1&&<button type="button" className="erp-assistant-clear" aria-label="Limpiar conversación" title="Limpiar historial" onClick={clearHistory}><Trash2 size={15}/></button>}
  <button type="button" aria-label="Minimizar asistente" onClick={()=>setOpen(false)}><Minimize2 size={17}/></button></header>
  <div className="erp-assistant-messages" role="log" aria-live="polite">{messages.map((m,i)=><div key={i} className={'erp-assistant-message '+m.by}>{m.by==='bot'&&<Bot size={15}/>}<p>{m.text}</p></div>)}{busy&&<small className="erp-assistant-typing">Procesando consulta…</small>}<div ref={bottom}/></div>
  {command&&<div className="erp-assistant-links erp-assistant-confirm"><button disabled={busy} onClick={()=>void apply()}>{command.label}</button><button disabled={busy} onClick={()=>{setCommand(null);say('Propuesta descartada, no hubo cambios.');}}>Cancelar</button></div>}
  {link&&<div className="erp-assistant-links"><button type="button" onClick={()=>go(link)}><ExternalLink size={14}/>{linkLabel}</button></div>}
  <div className="erp-assistant-shortcuts">{shortcutText(role).map(q=><button type="button" disabled={busy||command!==null} onClick={()=>void send(q)} key={q}>{q}</button>)}</div>
  <form onSubmit={e=>{e.preventDefault();void send(question);}}><input aria-label="Escribe tu consulta" value={question} maxLength={500} autoComplete="off" spellCheck={false} onChange={e=>setQuestion(e.target.value)} placeholder="Pregunta por stock, ventas o crea un documento…"/><button aria-label="Enviar consulta" disabled={busy||!question.trim()}><ArrowUp size={17}/></button></form><footer><ShieldCheck size={13}/> Cambios solo tras confirmación · {section}</footer>
 </section>}</div>;
}
