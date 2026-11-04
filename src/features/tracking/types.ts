import type {RoadRoute} from './roadRoute';
export type Place={name:string;lat:number;lng:number};
export type Position=Pick<Place,'lat'|'lng'>;
export type Sample=Position & {seq:number;at:number;accuracy:number};
export type Trip={id:string;title:string;mode:'gps'|'demo';status:'lista'|'en_ruta'|'entregada'|'cancelada';driver:string;viewer:string;created_by:string;driverName:string;viewerName:string;order_ref:string;origin:Place;destination:Place;roadRoute?:RoadRoute;created:number;started:number|null;ended:number|null};
export type Person={id:string;name:string;role:'monitor'|'repartidor'};
export const statusText={lista:'Lista para salir',en_ruta:'En camino',entregada:'Entregada',cancelada:'Cancelada'};
export const samplePlaces={origin:{name:'Punto de despacho',lat:-12.12555,lng:-77.03535},destination:{name:'Instituto de ejemplo',lat:-12.12077,lng:-77.02956}};
export function distance(a:Position,b:Position) {
  const rad=Math.PI/180;
  const h=Math.sin((b.lat-a.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;
  return 12742000*Math.asin(Math.sqrt(Math.min(1,h)));
}
export const lengthLabel=(m:number)=>m<1000?Math.round(m)+' m':(m/1000).toLocaleString('es-PE',{maximumFractionDigits:2})+' km';
export const clock=(at:number)=>new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(at);
