import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Activity,ArrowDown,Check,Flag,History,MapPin,Navigation,Pause,Play,Plus,Radio,Route,Truck,Users,ClipboardCheck,Clock3,PackageCheck} from 'lucide-react';
import type {Account} from '../../core/store';
import {useStore} from '../../core/store';
import {api} from '../../core/api';
import Dialog from '../../components/Dialog';
import {clock,distance,lengthLabel,statusText} from './types';
import type {Trip,Sample} from './types';
import RouteMap from './RouteMap';
import NewTrip from './NewTrip';
import GpsControl from './GpsControl';
import {useTrips} from './useTrips';
import './tracking.css';

function Journey({trip,points,user,refresh}:{trip:Trip;points:Sample[];user:Account;refresh:()=>void}){
  const [cursor,setCursor]=useState<number|null>(null),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(4);
  const [action,setAction]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const tick=setInterval(()=>setNow(Date.now()),10000);return()=>clearInterval(tick);},[]);
  const replay=cursor!==null,step=cursor??Math.max(0,points.length-1);
  const visible=useMemo(()=>replay?points.slice(0,step+1):points,[points,replay,step]);
  const last=visible.at(-1), total=useMemo(()=>visible.reduce((sum,p,i)=>sum+(i?distance(visible[i-1],p):0),0),[visible]);
  const ended=trip.status==='entregada'||trip.status==='cancelada',driver=user.role==='repartidor'&&user.id===trip.driver;
  const canSimulate=trip.mode==='demo'&&(driver||user.role==='admin'||trip.created_by===user.id);
  const nextDelay=cursor!==null&&cursor<points.length-1?(points[cursor+1].at-points[cursor].at)/speed:null;
  useEffect(()=>{
    if(!playing || cursor===null || nextDelay===null){if(playing)setPlaying(false);return;}
    const delay=nextDelay;
    const timer=setTimeout(()=>setCursor(cursor+1),Math.max(80,Math.min(2147483647,delay)));
    return()=>clearTimeout(timer);
  },[playing,cursor,nextDelay]);
  const change=async(command:string)=>{
    if(action)return;setAction(command);setConfirm('');setError('');setNotice('');
    try{await api('/trips/'+trip.id+'/'+command,'POST',{});setNotice(command==='iniciar'?'Simulación iniciada.':command==='finalizar'?'Llegada confirmada.':'Entrega cancelada.');refresh();}
    catch(e){setError((e as Error).message);}finally{setAction('');}
  };
  const freshness=!last?'Esperando primera posición':replay?'Punto del historial':ended?'Última posición guardada':now-last.at>45000?'Sin señal reciente':'Posición actualizada';
  return <div className="rt-columns"><section className="rt-card rt-map-card" aria-label="Detalle geográfico">
    <div className="rt-map-head"><div><span className="rt-kicker">{replay?'REPETICIÓN':trip.mode==='demo'?'RUTA SIMULADA':'LOCALIZACIÓN GPS'}</span><h2>{trip.title}</h2></div><span className={'rt-status '+trip.status}>{statusText[trip.status]}</span></div>
    <RouteMap origin={trip.origin} destination={trip.destination} points={visible} mode={trip.mode} frameKey={trip.id}/>
    <div className="rt-map-legend"><span><i className="rt-line"/> Recorrido registrado</span><span><i className="rt-dash"/> Referencia A–B (no navegación)</span></div>
    <div className="rt-facts"><div><span><Route size={15}/> Recorrido</span><strong>{lengthLabel(total)}</strong></div><div><span><MapPin size={15}/> Hasta B en línea recta</span><strong>{last?lengthLabel(distance(last,trip.destination)):'—'}</strong></div><div><span><Activity size={15}/> {replay?'Hora del punto':'Última lectura'}</span><strong>{last?clock(last.at):'—'}</strong></div></div>
    <section className="rt-replay"><div className="rt-minihead"><h3><History size={18}/> Repetir recorrido</h3>{replay&&<button type="button" className="rt-text" onClick={()=>{setPlaying(false);setCursor(null);}}>Volver al seguimiento</button>}</div>
      {points.length<2?<p>La repetición se habilita con dos posiciones registradas.</p>:<>
      <div className="rt-player"><button type="button" className="rt-play" aria-label={playing?'Pausar repetición':'Reproducir recorrido'} onClick={()=>{if(playing){setPlaying(false);return;}if(cursor===null||cursor>=points.length-1)setCursor(0);setPlaying(true);}}>{playing?<Pause size={17}/>:<Play size={17}/>}</button>
        <input aria-label="Punto del recorrido" type="range" min={0} max={points.length-1} value={step} onChange={e=>{setPlaying(false);setCursor(+e.target.value);}}/>
        <select aria-label="Velocidad de repetición" value={speed} onChange={e=>setSpeed(+e.target.value)}>{[1,4,16,64].map(s=><option key={s} value={s}>{s}×</option>)}</select></div>
      <small>Punto {step+1} de {points.length} · Horario de Lima</small></>}
    </section>
  </section><aside className="rt-side"><section className="rt-card rt-itinerary"><span className="rt-kicker">HOJA DE RUTA</span><h2>Itinerario</h2>
    <div className="rt-stop"><i>A</i><div><small>Salida</small><strong>{trip.origin.name}</strong></div></div><ArrowDown className="rt-down" size={16}/>
    <div className="rt-stop"><i>B</i><div><small>Destino</small><strong>{trip.destination.name}</strong></div></div>
    <hr/><h3><Users size={16}/> Participantes</h3><dl><dt>Reparte</dt><dd>{trip.driverName}</dd><dt>Monitorea</dt><dd>{trip.viewerName}</dd>{trip.order_ref&&<><dt>Pedido</dt><dd>{trip.order_ref}</dd></>}</dl>
  </section><section className="rt-card rt-activity"><span className="rt-kicker">ESTADO DEL ENVÍO</span><h3>{trip.mode==='demo'?<Truck size={18}/>:<Radio size={18}/>} {trip.mode==='demo'?'Simulación de aula':'Ubicación del dispositivo'}</h3>
    <p>{freshness}{last&&trip.mode==='gps'?' · ±'+Math.round(last.accuracy)+' m':''}</p>
    {(driver||canSimulate)&&!ended&&(trip.mode==='gps'?(driver?<GpsControl trip={trip} onChange={refresh}/>:null):trip.status==='lista'&&<button type="button" className="rt-primary" disabled={!!action} onClick={()=>void change('iniciar')}><Play size={16}/> Iniciar simulación</button>)}
    {driver&&trip.mode==='gps'&&trip.status==='en_ruta'&&<button type="button" className="rt-primary" disabled={!!action} onClick={()=>setConfirm('finalizar')}><Flag size={16}/> Confirmar llegada</button>}
    {user.role==='monitor'&&!ended&&<p>{trip.status==='lista'?'El repartidor aún no inició. El mapa se actualizará cuando salga.':'Puedes seguir el recorrido desde aquí.'}</p>}
    {!ended&&(driver||trip.created_by===user.id||user.role==='admin')&&<button type="button" className="rt-text" disabled={!!action} onClick={()=>setConfirm('cancelar')}>Cancelar entrega</button>}
    {notice&&<p role="status" className="rt-success"><Check size={15}/> {notice}</p>}{error&&<p role="alert" className="alert alert-danger">{error}</p>}
  </section>{!!points.length&&<details className="rt-card rt-log"><summary>Ver posiciones registradas ({points.length})</summary><p>Últimas 30 muestras · coordenadas en grados</p><ol>{points.slice(-30).reverse().map(p=><li key={p.seq}><b>{clock(p.at)}</b><span>{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span></li>)}</ol></details>}</aside>
  {confirm&&<Dialog title={confirm==='cancelar'?'Cancelar entrega':'Confirmar llegada al destino'} onClose={()=>setConfirm('')} confirm><p>{confirm==='cancelar'?'El recorrido terminará y sus posiciones quedarán disponibles para repetición.':'El servidor verificará que el GPS esté próximo al punto B.'}</p><div className="rt-buttons"><button className="rt-secondary" onClick={()=>setConfirm('')}>Volver</button><button className="rt-primary" onClick={()=>void change(confirm)}>Confirmar</button></div></Dialog>}</div>;
}
export default function Tracking(){
  const {user}=useStore(),[params,setParams]=useSearchParams();
  const requested=params.get('pedido')||'',preferred=params.get('entrega')||'';
  const {trips,selected,choose,detail,ready,live,error,refresh}=useTrips(preferred);
  const [creating,setCreating]=useState(false),[orderHandled,setOrderHandled]=useState('');
  useEffect(()=>{
    if(!requested||!ready||error||orderHandled===requested)return;
    setOrderHandled(requested);const existing=trips.find(t=>t.order_ref===requested && t.status!=='cancelada');
    if(existing)choose(existing.id);else setCreating(true);
  },[requested,ready,error,orderHandled,trips,choose]);
  if(!user)return null;
  return <div className="rt-screen"><div className="rt-heading"><div><span className="rt-kicker"><Navigation size={14}/> DISTRIBUCIÓN</span><h1>Rutas y entregas</h1><p>{user.role==='monitor'?'Sigue los pedidos que te asignaron y revisa cómo llegaron a su destino.':'Coordina quién lleva el pedido, comparte su ubicación y revisa el recorrido.'}</p></div>
    {user.role!=='monitor'&&<button type="button" className="rt-primary" onClick={()=>setCreating(true)}><Plus size={17}/> Nueva entrega</button>}</div>
    <div className="rt-control-kpis" aria-label="Estado de las entregas">
      <div><span><Truck size={17}/> Total registradas</span><strong>{trips.length}</strong><small>Entregas del perfil</small></div>
      <div><span><Clock3 size={17}/> Por iniciar</span><strong>{trips.filter(t=>t.status==='lista').length}</strong><small>Listas para salir</small></div>
      <div><span><Navigation size={17}/> En camino</span><strong>{trips.filter(t=>t.status==='en_ruta').length}</strong><small>Seguimiento activo</small></div>
      <div><span><PackageCheck size={17}/> Finalizadas</span><strong>{trips.filter(t=>t.status==='entregada').length}</strong><small>Llegadas registradas</small></div>
    </div>
    <div className="rt-toolbar"><label>Entrega <select value={selected} onChange={e=>{choose(e.target.value);setParams({entrega:e.target.value},{replace:true});}} aria-label="Entrega seleccionada">{!trips.length&&<option value="">Sin entregas</option>}{trips.map(t=><option key={t.id} value={t.id}>{t.title} · {statusText[t.status]} · {t.id.slice(0,6)}</option>)}</select></label><span className={'rt-connection '+(live?'online':'')}><i/>{live?'Conectado en vivo':'Reconectando · consulta periódica'}</span></div>
    {error&&<p role="alert" className="alert alert-warning">{error} <button className="rt-text" onClick={()=>void refresh()}>Reintentar</button></p>}
    {!!trips.length&&<div className="rt-control-recent"><span><ClipboardCheck size={15}/> Panel de despachos</span><div>{trips.slice(0,4).map(t=><button className={selected===t.id?'active':''} type="button" key={t.id} onClick={()=>{choose(t.id);setParams({entrega:t.id},{replace:true});}}><strong>{t.title}</strong><small>{statusText[t.status]} · {t.order_ref||'Sin pedido'}</small></button>)}</div></div>}
    {detail?<Journey key={detail.trip.id} trip={detail.trip} points={detail.points} user={user} refresh={refresh}/>:!ready||selected?<div className="rt-skeleton" role="status">Cargando recorrido…</div>:<section className="rt-card rt-empty"><Truck size={32}/><h2>Aún no tienes entregas</h2><p>{user.role==='monitor'?'Cuando te asignen una, aparecerá aquí.':'Crea la primera entrega y selecciona quién la recibe.'}</p></section>}
    {creating&&user.role!=='monitor'&&<NewTrip user={user} order={requested} onClose={()=>{setCreating(false);if(requested)setParams({},{replace:true});}} onCreated={trip=>{setCreating(false);setParams({entrega:trip.id},{replace:true});choose(trip.id);}}/>}
  </div>;
}
