import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {Maximize2} from 'lucide-react';
import type {Place,Position,Sample} from './types';
import {distance,lengthLabel} from './types';

type Props={origin:Place;destination:Place;points:Sample[];onPick?:(p:Position)=>void;mode?:'gps'|'demo';frameKey?:string};
const latlng=(p:Position):L.LatLngTuple=>[p.lat,p.lng];
function icon(label:string,kind:string){
  return L.divIcon({className:'route-pin-wrap',iconSize:[34,34],iconAnchor:[17,17],html:kind==='truck'?'<span class="route-pin truck">'+'<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2 5h12v12H2zM14 9h4l4 4v4h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>' +'</span>':'<span class="route-pin '+kind+'">'+label+'</span>'});
}
const pins={origin:icon('A','origin'),destination:icon('B','destination')};
function bearing(a:Position,b:Position) {
  const radians=Math.PI/180,dlng=(b.lng-a.lng)*radians;
  const y=Math.sin(dlng)*Math.cos(b.lat*radians);
  const x=Math.cos(a.lat*radians)*Math.sin(b.lat*radians)-Math.sin(a.lat*radians)*Math.cos(b.lat*radians)*Math.cos(dlng);
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function vehicleIcon(direction:number) {
  return L.divIcon({className:'route-pin-wrap',iconSize:[42,42],iconAnchor:[21,21],
    html:`<span class="route-pin truck" style="--heading:${Number.isFinite(direction)?direction:0}deg" aria-hidden="true"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 19-9-5-9 5 9-19Z"/></svg></span>`});
}
export default function RouteMap({origin,destination,points,onPick,frameKey='',mode='gps'}:Props){
  const host=useRef<HTMLDivElement>(null), map=useRef<L.Map|null>(null), layers=useRef<L.LayerGroup|null>(null);
  const frame=useRef(()=>{}),pick=useRef(onPick),[tilesMissing,setTilesMissing]=useState(false);
  pick.current=onPick;
  useEffect(()=>{
    if(!host.current)return;
    const instance=L.map(host.current,{zoomControl:true,scrollWheelZoom:false,preferCanvas:true,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,worldCopyJump:true});
    map.current=instance;
    instance.createPane('aula');instance.getPane('aula')!.style.zIndex='250';
    instance.attributionControl.setPrefix(false);
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'});
    tiles.on('tileerror',()=>setTilesMissing(true));tiles.on('tileload',()=>setTilesMissing(false));tiles.addTo(instance);
    layers.current=L.layerGroup().addTo(instance);
    instance.on('click',(event:L.LeafletMouseEvent)=>pick.current?.({lat:+event.latlng.lat.toFixed(6),lng:+event.latlng.wrap().lng.toFixed(6)}));
    const observer=new ResizeObserver(()=>instance.invalidateSize({animate:false}));observer.observe(host.current);
    return ()=>{observer.disconnect();instance.remove();map.current=null;layers.current=null;};
  },[]);
  useEffect(()=>{
    const m=map.current;if(!m||!tilesMissing||mode!=='demo')return;
    const layer=L.imageOverlay('/maps/plano-aula.svg',[[-12.131,-77.042],[-12.116,-77.022]],{pane:'aula',interactive:false,alt:'Plano ilustrativo de la ruta de práctica'}).addTo(m);
    return ()=>{layer.remove();};
  },[tilesMissing,mode]);
  useEffect(()=>{
    const m=map.current,g=layers.current;if(!m||!g)return;
    if(![origin.lat,origin.lng,destination.lat,destination.lng].every(Number.isFinite))return;
    g.clearLayers();const a=latlng(origin),b=latlng(destination);
    const all:L.LatLngTuple[]=[a,b,...points.map(latlng)];
    frame.current=()=>m.fitBounds(L.latLngBounds(all),{padding:[42,42],maxZoom:17,animate:false});
    L.polyline([a,b],{color:'#686f89',weight:2,dashArray:'5 9',opacity:.72,interactive:false}).addTo(g);
    if(points.length>1){
      const traveled=points.map(latlng);
      L.polyline(traveled,{color:'#063d4e',weight:14,opacity:.9,lineCap:'round',lineJoin:'round',interactive:false}).addTo(g);
      L.polyline(traveled,{color:'#1ccfff',weight:7,opacity:1,lineCap:'round',lineJoin:'round',interactive:false}).addTo(g);
    }
    const marker=(p:Position,symbol:L.DivIcon,title:string,z:number)=>{
      const node=document.createElement('span');node.textContent=title;
      L.marker(latlng(p),{icon:symbol,title,alt:title,zIndexOffset:z}).bindTooltip(node).addTo(g);
    }
    marker(origin,pins.origin,'A · '+origin.name,20);marker(destination,pins.destination,'B · '+destination.name,30);
    const last=points.at(-1),previous=points.at(-2);
    if(last){
      const direction=previous?bearing(previous,last):bearing(origin,destination);
      marker(last,vehicleIcon(direction),mode==='demo'?'Vehículo simulado':'Última posición GPS',100);
    }
  },[origin.lat,origin.lng,origin.name,destination.lat,destination.lng,destination.name,points,mode]);
  useEffect(()=>{frame.current();},[frameKey,origin.lat,origin.lng,destination.lat,destination.lng]);
  const last=points.at(-1);
  useEffect(()=>{
    const m=map.current;if(m&&last && !m.getBounds().pad(-0.08).contains(latlng(last))) m.panTo(latlng(last),{animate:false});
  },[last?.seq,last?.lat,last?.lng]);
  const prev=points.at(-2);
  const kmh=last&&prev&&last.at>prev.at?Math.max(0,Math.round(distance(prev,last)/(last.at-prev.at)*3600000)):0;
  const metersToDest=distance(last||origin,destination);
  const remainingSeconds=mode==='demo'&&last?Math.max(0,(49-last.seq)*2):null;
  return <div className="rt-map-shell rt-nav-theme"><div ref={host} className="rt-map" aria-label="Mapa de la entrega. A es la salida y B es el destino."/>
    {!onPick&&<><div className="rt-nav-instruction" aria-label="Destino de navegación ilustrativa">
      <span className="rt-nav-eyebrow">{mode==='demo'?'SIMULACIÓN DE RUTA':'SEGUIMIENTO GPS'}</span>
      <strong>{destination.name}</strong>
      <small>Desde {origin.name}</small>
    </div><div className="rt-nav-dashboard">
      <div><span>{mode==='demo'?'Velocidad simulada':'Velocidad estimada'}</span><strong>{points.length>1?kmh:'—'} <small>km/h</small></strong></div>
      <div><span>Distancia a B</span><strong>{lengthLabel(metersToDest)}</strong></div>
      <div><span>{mode==='demo'?'Tiempo restante (sim.)':'Ubicación'}</span><strong>{remainingSeconds!==null?Math.ceil(remainingSeconds/60)+' min':last?'Recibida':'Sin datos'}</strong></div>
    </div></>
    <button className="rt-fit" type="button" onClick={()=>frame.current()} aria-label="Ver todo el recorrido"><Maximize2 size={17}/></button>
    {tilesMissing&&<div className="rt-map-note">{mode==='demo'?'Plano ilustrativo de aula · sin conexión':'Calles sin conexión · Se conservan los puntos del recorrido'}</div>}</div>;
}
