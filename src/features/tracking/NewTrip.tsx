import {useEffect,useState} from 'react';
import {MapPin,FlaskConical,Navigation} from 'lucide-react';
import Dialog from '../../components/Dialog';
import {api,newId} from '../../core/api';
import {useStore} from '../../core/store';
import type {Account} from '../../core/store';
import RouteMap from './RouteMap';
import type {Person,Trip,Position,Place} from './types';

const noPoints:never[]=[];
const practiceRoutes=[
 {origin:{name:'Punto de despacho',lat:-12.12555,lng:-77.03535},destination:{name:'Instituto de ejemplo',lat:-12.12077,lng:-77.02956}},
 {origin:{name:'Salida norte · simulación',lat:-12.1169,lng:-77.0318},destination:{name:'Destino sur · simulación',lat:-12.1275,lng:-77.0384}},
 {origin:{name:'Salida oeste · simulación',lat:-12.1237,lng:-77.0420},destination:{name:'Destino este · simulación',lat:-12.1180,lng:-77.0248}},
 {origin:{name:'Salida centro · simulación',lat:-12.1194,lng:-77.0359},destination:{name:'Destino costero · simulación',lat:-12.1289,lng:-77.0414}}
];

type Side='origin'|'destination';
export default function NewTrip({user,order,onClose,onCreated}:{user:Account;order:string;onClose:()=>void;onCreated:(trip:Trip)=>void}){
  const {state:s}=useStore();
  const [orderRef,setOrderRef]=useState(order);
  const [mode,setMode]=useState<'gps'|'demo'>('demo'),[title,setTitle]=useState(order?'Entrega de '+order:'Entrega personalizada');
  const [people,setPeople]=useState<Person[]>([]),[viewer,setViewer]=useState(''),[driver,setDriver]=useState(user.role==='repartidor'?user.id:'');
  const [routeOption,setRouteOption]=useState(()=>{try{return (JSON.parse(localStorage.getItem('erp_static_v1_trips')||'[]') as unknown[]).length%practiceRoutes.length;}catch{return 0;}});
  const [places,setPlaces]=useState(()=>structuredClone(practiceRoutes[routeOption])),[side,setSide]=useState<Side>('origin'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[id]=useState(newId);
  useEffect(()=>{let keep=true;api<Person[]>('/directory').then(list=>{if(!keep)return;setPeople(list);setViewer(list.find(p=>p.role==='monitor')?.id||'');setDriver(user.role==='repartidor'?user.id:list.find(p=>p.role==='repartidor')?.id||'');setLoaded(true);}).catch(e=>keep&&setError(e.message));return()=>{keep=false;};},[user.id,user.role]);
  function edit(which:Side,patch:Partial<Place>){setPlaces(old=>({...old,[which]:{...old[which],...patch}}));}
  const pick=(p:Position)=>edit(side,p);
  const rotateRoute=()=>{const next=(routeOption+1)%practiceRoutes.length;setRouteOption(next);setPlaces(structuredClone(practiceRoutes[next]));};
  const locate=()=>{
    if(!navigator.geolocation || !window.isSecureContext){setError('La ubicación del dispositivo necesita HTTPS o localhost. También puedes elegir el punto en el mapa.');return;}
    navigator.geolocation.getCurrentPosition(p=>{pick({lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6)});setError('');},()=>setError('No se pudo leer la ubicación. Selecciona un punto en el mapa.'),{timeout:15000,maximumAge:0,enableHighAccuracy:true});
  };
  return <Dialog title="Nueva entrega" onClose={()=>{if(!busy)onClose();}}><form className="rt-form" onSubmit={async e=>{
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try{const trip=await api<Trip>('/trips','POST',{id,title,mode,driver,viewer,order_ref:orderRef,...places});onCreated(trip);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }}>
    <fieldset><legend>Tipo de recorrido</legend><div className="rt-modes">
      <label><input type="radio" name="source" checked={mode==='demo'} onChange={()=>setMode('demo')}/><FlaskConical size={17}/> Simulación</label>
      <label><input type="radio" name="source" checked={mode==='gps'} onChange={()=>setMode('gps')}/><Navigation size={17}/> GPS real</label></div></fieldset>
    <label>Nombre de la entrega<input required maxLength={90} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label>Pedido relacionado (opcional)<select value={orderRef} onChange={e=>setOrderRef(e.target.value)}><option value="">Entrega independiente · sin pedido</option>{orderRef&&!s.orders.some(o=>o.id===orderRef)&&<option value={orderRef}>{orderRef} · referenciado desde Pedidos</option>}{s.orders.filter(o=>o.status!=='cancelado').map(o=><option value={o.id} key={o.id}>{o.id} · {s.clients.find(c=>c.id===o.clientId)?.name||o.clientId} · {o.status}</option>)}</select></label>
    <div className="rt-field-grid"><label>Quién reparte<select required disabled={user.role==='repartidor'} value={driver} onChange={e=>setDriver(e.target.value)}><option value="">Seleccionar</option>{people.filter(x=>x.role==='repartidor').map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
    <label>Quién recibe y monitorea<select required value={viewer} onChange={e=>setViewer(e.target.value)}><option value="">Seleccionar</option>{people.filter(x=>x.role==='monitor').map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label></div>
    {loaded&&(!driver||!viewer)&&<p className="alert alert-warning">Se necesita una cuenta activa de cada tipo. Administración puede crearlas en Usuarios y roles.</p>}
    <fieldset><legend>Ubicaciones A y B · selecciona tus puntos</legend><p className="rt-hint">{mode==='demo'?'En la simulación puedes elegir A y B. Los puntos personalizados se conectan en línea recta ilustrativa, no representan una ruta vial calculada.':'En GPS real el dispositivo envía posiciones. Selecciona A y B antes de crear la entrega.'} Selecciona A o B y haz clic en el mapa, o escribe las coordenadas.</p>{mode==='demo'&&<button type="button" className="rt-secondary" onClick={rotateRoute}>Cambiar recorrido de ejemplo ({routeOption+1}/{practiceRoutes.length})</button>}
      <div className="rt-modes">{(['origin','destination'] as Side[]).map(k=><label key={k}><input type="radio" name="point" checked={side===k} onChange={()=>setSide(k)}/>{k==='origin'?'A · Salida':'B · Destino'}</label>)}</div>
      <RouteMap origin={places.origin} destination={places.destination} points={noPoints} onPick={pick}/>
      <button type="button" className="rt-secondary" onClick={locate}><MapPin size={16}/> Usar mi ubicación para {side==='origin'?'A':'B'}</button>
      {(['origin','destination'] as Side[]).map(k=><div className="rt-coords" key={k}><label>{k==='origin'?'A · Nombre del origen':'B · Nombre del destino'}<input required maxLength={80} value={places[k].name} onChange={e=>edit(k,{name:e.target.value})}/></label><label>Latitud<input type="number" required step="any" min="-85" max="85" value={Number.isFinite(places[k].lat)?places[k].lat:''} onChange={e=>edit(k,{lat:e.target.valueAsNumber})}/></label><label>Longitud<input type="number" required step="any" min="-180" max="180" value={Number.isFinite(places[k].lng)?places[k].lng:''} onChange={e=>edit(k,{lng:e.target.valueAsNumber})}/></label></div>)}</fieldset>
    {error&&<p role="alert" className="alert alert-danger">{error}</p>}<div className="rt-buttons"><button type="button" className="rt-secondary" onClick={onClose} disabled={busy}>Volver</button><button className="rt-primary" disabled={busy||!loaded||!driver||!viewer}>{busy?'Guardando…':'Crear entrega'}</button></div>
  </form></Dialog>;
}
