/**
 * Rutas viales para DEMOSTRACIONES académicas.
 * OSRM público: uso ligero, sin SLA ni datos de tráfico en tiempo real.
 * Se consulta solo al crear o recuperar una entrega, nunca en cada posición.
 */
import type {Place,Position} from './types';
import {distance} from './types';

export type RoadTurn={atRatio:number;road:string;instruction:string};
export type RoadRoute={
  coordinates:Position[];
  distance:number;
  duration:number;
  turns:RoadTurn[];
  provider:'OSRM';
};

type OsrmStep={name?:string;maneuver?:{type?:string;modifier?:string;location?:number[]}};
type OsrmResponse={
  code?:string;
  routes?:Array<{distance:number;duration:number;geometry?:{coordinates?:number[][]};legs?:Array<{steps?:OsrmStep[]}>}>;
  waypoints?:Array<{distance?:number}>;
};

const ENDPOINT='https://router.project-osrm.org/route/v1/driving/';

function ensurePlace(p:Place){
  if(!p||![p.lat,p.lng].every(Number.isFinite)||Math.abs(p.lat)>85||Math.abs(p.lng)>180)
    throw Error('Coordenadas no válidas para calcular la ruta vial.');
}
function turnText(type:string,modifier:string){
  if(type==='roundabout'||type==='rotary')return 'Entra a la rotonda';
  if(type==='merge')return 'Incorpórate a la vía';
  if(modifier==='right'||modifier==='sharp right')return 'Gira a la derecha';
  if(modifier==='slight right')return 'Mantente a la derecha';
  if(modifier==='left'||modifier==='sharp left')return 'Gira a la izquierda';
  if(modifier==='slight left')return 'Mantente a la izquierda';
  if(type==='continue')return 'Continúa de frente';
  if(type==='fork')return 'Sigue por la bifurcación';
  return 'Continúa por la vía';
}
function measured(coords:Position[]){
  const acc:number[]=[0];
  for(let i=1;i<coords.length;i++)acc.push(acc[i-1]+distance(coords[i-1],coords[i]));
  return acc;
}
export function positionOnRoad(route:RoadRoute,progress:number):Position{
  const pts=route.coordinates;
  if(!pts.length)throw Error('No hay geometría vial.');
  const progressClamped=Math.min(1,Math.max(0,progress));
  if(progressClamped<=0)return pts[0];
  if(progressClamped>=1)return pts[pts.length-1];
  const acc=measured(pts),target=acc[acc.length-1]*progressClamped;
  let low=1,high=acc.length-1;
  while(low<high){const mid=(low+high)>>1;if(acc[mid]<target)low=mid+1;else high=mid;}
  const i=low,segment=acc[i]-acc[i-1],factor=segment>0?(target-acc[i-1])/segment:0;
  return {lat:pts[i-1].lat+(pts[i].lat-pts[i-1].lat)*factor,
    lng:pts[i-1].lng+(pts[i].lng-pts[i-1].lng)*factor};
}
export function roadSection(route:RoadRoute,from:number,to:number):Position[]{
  const pts=route.coordinates;
  if(pts.length<2)return [];
  const acc=measured(pts),total=acc[acc.length-1];
  const start=Math.max(0,Math.min(1,from)),end=Math.max(start,Math.min(1,to));
  const middle=pts.filter((_,i)=>acc[i]>start*total&&acc[i]<end*total);
  return [positionOnRoad(route,start),...middle,positionOnRoad(route,end)];
}
export function nextTurn(route:RoadRoute,progress:number):{instruction:string;road:string;meters:number}|null{
  const step=route.turns.find(t=>t.atRatio>progress+0.002);
  return step?{instruction:step.instruction,road:step.road,meters:Math.max(0,(step.atRatio-progress)*route.distance)}:null;
}
export async function calculateRoadRoute(origin:Place,destination:Place):Promise<RoadRoute>{
  ensurePlace(origin);ensurePlace(destination);
  if(distance(origin,destination)<30)throw Error('Los puntos A y B deben estar separados al menos 30 metros.');
  const url=ENDPOINT+`${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=false`;
  let response:Response;
  try{response=await fetch(url,{signal:AbortSignal.timeout(16000)});}
  catch{throw Error('No se pudo contactar el servicio de rutas viales (OSRM). Comprueba Internet y vuelve a intentar.');}
  if(!response.ok)throw Error('El servicio de rutas viales está temporalmente ocupado. Intenta nuevamente.');
  let data:OsrmResponse;
  try{data=await response.json() as OsrmResponse;}
  catch{throw Error('El servicio vial devolvió una respuesta no válida.');}
  const chosen=data.routes?.[0],raw=chosen?.geometry?.coordinates;
  if(data.code!=='Ok'||!chosen||!raw||raw.length<2)throw Error('No existe un trayecto vehicular disponible entre estos puntos. Elige lugares cercanos a calles.');
  if(data.waypoints?.some(p=>(p.distance||0)>250))
    throw Error('Uno de los puntos está a más de 250 m de una calle transitable. Selecciona un punto junto a la pista.');
  if(raw.length>7000)throw Error('El recorrido es demasiado extenso para esta demostración. Selecciona puntos más cercanos.');
  const coords=raw.map(p=>({lat:p[1],lng:p[0]}));
  if(coords.some(p=>![p.lat,p.lng].every(Number.isFinite)))throw Error('La geometría vial recibida no es válida.');
  const cumulative=measured(coords),geometryMeters=cumulative[cumulative.length-1];
  if(!geometryMeters)throw Error('El trazado vial está vacío.');
  const turns:RoadTurn[]=[];
  let previous=0;
  for(const leg of chosen.legs||[]){
    for(const step of leg.steps||[]){
      const man=step.maneuver,kind=man?.type||'';
      if(kind==='depart'||kind==='arrive'||!man?.location)continue;
      const p={lat:man.location[1],lng:man.location[0]};
      let bestIndex=previous,bestDistance=Infinity;
      for(let i=previous;i<coords.length;i++){
        const d=distance(coords[i],p);if(d<bestDistance){bestDistance=d;bestIndex=i;}
      }
      previous=bestIndex;
      turns.push({atRatio:cumulative[bestIndex]/geometryMeters,road:step.name||'la siguiente vía',
        instruction:turnText(kind,man.modifier||'')});
    }
  }
  return {coordinates:coords,distance:chosen.distance,duration:chosen.duration,turns,provider:'OSRM'};
}
