import {useEffect,useRef,useState} from 'react';
import {LocateFixed,Pause} from 'lucide-react';
import {api,HttpError} from '../../core/api';
import type {Trip} from './types';

type Fix={lat:number;lng:number;accuracy:number;at:number};
export default function GpsControl({trip,onChange}:{trip:Trip;onChange:()=>void}){
  const [sharing,setSharing]=useState(false),[message,setMessage]=useState('');
  const stopRef=useRef<()=>void>(()=>{}), status=useRef(trip.status);status.current=trip.status;
  useEffect(()=>()=>stopRef.current(),[trip.id]);
  useEffect(()=>{if(['entregada','cancelada'].includes(trip.status)){stopRef.current();setSharing(false);}},[trip.status]);
  function start(){
    if(!window.isSecureContext || !navigator.geolocation){setMessage('Abre el ERP con HTTPS en tu celular o usa localhost en tu PC para habilitar GPS.');return;}
    stopRef.current();let active=true,started=status.current==='en_ruta',sending=false,lastSent=0,pending:Fix|null=null;
    const controller=new AbortController();let watch:number|undefined;let timer:number|undefined;
    const stop=()=>{active=false;controller.abort();if(watch!==undefined)navigator.geolocation.clearWatch(watch);clearInterval(timer);};
    stopRef.current=stop;setSharing(true);setMessage('Esperando permiso y primera lectura GPS…');
    const flush=async()=>{
      if(!active || sending || !pending || Date.now()-lastSent<3000)return;
      const fix=pending;pending=null;sending=true;
      try{
        if(!started){await api('/trips/'+trip.id+'/iniciar','POST',{},controller.signal);started=true;}
        if(!active)return;
        await api('/trips/'+trip.id+'/points','POST',fix,controller.signal);
        if(active){lastSent=Date.now();setMessage('Compartiendo con '+trip.viewerName+' · precisión ±'+Math.round(fix.accuracy)+' m.');onChange();}
      }catch(e){
        if(!active)return;
        setMessage((e as Error).message);
        if(e instanceof HttpError && [401,403,404].includes(e.status)){stop();setSharing(false);}
        const transient=!(e instanceof HttpError) || e.status>=500 || e.status===429;
        if(transient && !pending && Date.now()-fix.at<90000)pending=fix;
        lastSent=Date.now();
      }finally{sending=false;}
    };
    watch=navigator.geolocation.watchPosition(pos=>{
      if(!active)return;
      pending={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,at:Math.round(pos.timestamp)};
      void flush();
    },e=>{
      if(!active)return;
      if(e.code===1){stop();setSharing(false);setMessage('Permiso de ubicación denegado. Habilítalo en el navegador y vuelve a compartir.');}
      else setMessage('GPS sin señal. Mantén la pantalla abierta mientras el dispositivo busca una lectura.');
    },{enableHighAccuracy:true,maximumAge:0,timeout:20000});
    timer=window.setInterval(()=>void flush(),3200);
  }
  return <div className="rt-gps"><button type="button" className={sharing?'rt-secondary':'rt-primary'} onClick={()=>{if(sharing){stopRef.current();setSharing(false);setMessage('GPS detenido. El monitor conserva la última posición recibida.');}else start();}}>
    {sharing?<Pause size={16}/>:<LocateFixed size={16}/>} {sharing?'Pausar mi GPS':trip.status==='lista'?'Iniciar y compartir mi GPS':'Reanudar mi GPS'}</button>
    <small>Comparte solo durante esta entrega. Al salir de esta pantalla se detiene el envío.</small>{message&&<p role="status">{message}</p>}</div>;
}
