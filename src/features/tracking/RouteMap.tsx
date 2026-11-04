import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {Maximize2} from 'lucide-react';
import type {Place,Position,Sample} from './types';
import {lengthLabel} from './types';
import {nextTurn,roadSection} from './roadRoute';
import type {RoadRoute} from './roadRoute';

type Props={origin:Place;destination:Place;points:Sample[];roadRoute?:RoadRoute;trafficNotice?:string;onPick?:(p:Position)=>void;mode?:'gps'|'demo';frameKey?:string};
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
export default function RouteMap({origin,destination,points,roadRoute,trafficNotice,onPick,frameKey='',mode='gps'}:Props){
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
    const m=map.current,g=layers.current;if(!m||!g)return;
    if(![origin.lat,origin.lng,destination.lat,destination.lng].every(Number.isFinite))return;
    g.clearLayers();
    const road=roadRoute?.coordinates||[];
    const roadCoords=road.map(latlng);
    const boundsCoords=roadCoords.length>1?roadCoords:[latlng(origin),latlng(destination)];
    frame.current=()=>m.fitBounds(L.latLngBounds(boundsCoords),{padding:[56,56],maxZoom:17,animate:false});
    if(roadCoords.length>1){
      L.polyline(roadCoords,{color:'#ffffff',weight:13,opacity:.95,lineCap:'round',lineJoin:'round',interactive:false}).addTo(g);
      L.polyline(roadCoords,{color:'#6835dc',weight:8,opacity:1,lineCap:'round',lineJoin:'round',interactive:false}).addTo(g);
      if(mode==='demo'&&roadRoute){
        const traffic=roadSection(roadRoute,.64,.73).map(latlng);
        L.polyline(traffic,{color:'#f59c30',weight:9,opacity:.9,lineCap:'round',lineJoin:'round',interactive:false})
          .bindTooltip('Zona de tráfico SIMULADO · No son datos reales').addTo(g);
      }
    }
    if(points.length>1){
      const traveled=points.map(latlng);
      L.polyline(traveled,{color:'#ffffff',weight:11,opacity:.94,lineCap:'round',interactive:false}).addTo(g);
      L.polyline(traveled,{color:'#a78bfa',weight:6,opacity:1,lineCap:'round',interactive:false}).addTo(g);
    }
    const marker=(p:Position,symbol:L.DivIcon,title:string,z:number)=>{
      const node=document.createElement('span');node.textContent=title;
      L.marker(latlng(p),{icon:symbol,title,alt:title,zIndexOffset:z}).bindTooltip(node).addTo(g);
    }
    marker(road[0]||origin,pins.origin,'A · '+origin.name,20);
    marker(road.at(-1)||destination,pins.destination,'B · '+destination.name,30);
    const last=points.at(-1),previous=points.at(-2);
    if(last){
      const direction=previous?bearing(previous,last):bearing(origin,destination);
      marker(last,vehicleIcon(direction),mode==='demo'?'Vehículo simulado':'Última posición GPS',100);
    }
  },[origin.lat,origin.lng,origin.name,destination.lat,destination.lng,destination.name,roadRoute,points,mode]);
  useEffect(()=>{frame.current();},[frameKey,origin.lat,origin.lng,destination.lat,destination.lng,roadRoute]);
  const last=points.at(-1);
  useEffect(()=>{
    const m=map.current;if(m&&last && !m.getBounds().pad(-0.08).contains(latlng(last))) m.panTo(latlng(last),{animate:false});
  },[last?.seq,last?.lat,last?.lng]);

  const progress=mode==='demo'&&points.length?Math.max(0,Math.min(1,(points[points.length-1].seq-1)/48)):0;
  const roadRemaining=roadRoute?roadRoute.distance*(1-progress):null;
  const maneuver=roadRoute?nextTurn(roadRoute,progress):null;
  const eta=roadRoute?Math.max(1,Math.ceil(roadRoute.duration*(1-progress)/60)):null;
  const simulatedSeconds=mode==='demo'&&points.length?Math.max(0,(49-points[points.length-1].seq)*2):96;
  return <div className="rt-map-shell rt-street-nav">
    <div ref={host} className="rt-map" aria-label="Mapa vial: trayecto por calles con línea morada y vehículo en movimiento."/>
    {!onPick&&<div className="rt-drive-heading">
      <span className="rt-drive-direction">↗</span>
      <div>
        <small>{maneuver?maneuver.instruction:'Sigue la ruta marcada'}</small>
        <strong>{maneuver?maneuver.road:destination.name}</strong>
        <span>{maneuver?lengthLabel(maneuver.meters)+' hasta el siguiente giro':'Ruta sobre calles · OSRM'}</span>
      </div>
    </div>}
    {!onPick&&trafficNotice&&<div className="rt-traffic-warning" role="status" aria-live="polite">
      <span aria-hidden="true">⚠️</span><div><strong>AVISO DE TRÁFICO SIMULADO</strong><span>{trafficNotice}</span></div>
    </div>}
    <button className="rt-fit" type="button" onClick={()=>frame.current()} aria-label="Mostrar la ruta completa"><Maximize2 size={17}/></button>
    {!onPick&&<div className="rt-drive-footer">
      <div><small>Distancia vial pendiente</small><strong>{roadRemaining===null?'—':lengthLabel(roadRemaining)}</strong></div>
      <div><small>Tiempo estimado sin tráfico</small><strong>{eta===null?'—':eta+' min'}</strong></div>
      {mode==='demo'&&<div><small>Simulación acelerada</small><strong>{Math.ceil(simulatedSeconds/60)} min</strong></div>}
    </div>}
    {!onPick&&<div className="rt-map-source">Ruta: OSRM · OpenStreetMap</div>}
    {!onPick&&!roadRoute&&<div className="rt-route-unavailable">No hay ruta vial calculada. No se dibuja línea recta.</div>}
    {tilesMissing&&<div className="rt-map-note">No se cargaron las calles. Comprueba tu conexión.</div>}
  </div>;

}
