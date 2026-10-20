import {createContext,useContext,useState} from 'react';
import type {ReactNode} from 'react';
import type {State,Role} from './types';
import {makeSeed} from './seed';
import {allowed} from './permissions';
import type {AdminSettings,CloudService,CloudServiceId,EventCategory,SystemEvent} from '../features/administration/model';
import {loadEvents,loadServices,loadSettings,saveJSON} from '../features/administration/storage';

const KEY='enterprisecloud_erp_v2';
const AUTH='enterprisecloud_auth_demo';
const accounts:{email:string;password:string;role:Role;name:string}[]=[
  {email:'admin@enterprisecloud.demo',password:'Admin123!',role:'admin',name:'Administrador Demo'},
  {email:'ventas@enterprisecloud.demo',password:'Ventas123!',role:'ventas',name:'Asesor Comercial'},
  {email:'almacen@enterprisecloud.demo',password:'Almacen123!',role:'almacen',name:'Encargado de Almacén'},
  {email:'finanzas@enterprisecloud.demo',password:'Finanzas123!',role:'finanzas',name:'Analista Financiero'}
];
export type Account=Omit<(typeof accounts)[number],'password'>;
function readState():State {
  try{const raw=localStorage.getItem(KEY);if(raw){const p=JSON.parse(raw) as State;
    if(p.version===2&&Array.isArray(p.sales)&&Array.isArray(p.movements))return p;}}
  catch {/* Datos locales ilegibles: usar semilla. */}
  return makeSeed();
}
function readAuth():Account|null {
  try{const email=sessionStorage.getItem(AUTH)||localStorage.getItem(AUTH);
    const a=accounts.find(a=>a.email===email);return a?{email:a.email,name:a.name,role:a.role}:null;}
  catch{return null;}
}
type Ctx = {
  state:State;
  update:(fn:(s:State)=>State)=>void;
  reset:()=>void;
  user:Account|null;
  login:(email:string,password:string,remember:boolean)=>boolean;
  logout:()=>void;
  settings:AdminSettings;
  saveSettings:(next:AdminSettings)=>void;
  cloudServices:CloudService[];
  toggleCloudService:(id:CloudServiceId)=>void;
  resetCloud:()=>void;
  events:SystemEvent[];
};
const Context=createContext<Ctx|null>(null);
export function StoreProvider({children}:{children:ReactNode}){
  const [state,setState]=useState<State>(readState);
  const [user,setUser]=useState<Account|null>(readAuth);
  const [settings,setSettings]=useState<AdminSettings>(loadSettings);
  const [cloudServices,setCloudServices]=useState<CloudService[]>(loadServices);
  const [events,setEvents]=useState<SystemEvent[]>(loadEvents);

  const addEvent=(actor:Account|null,category:EventCategory,action:string,description:string)=>{
    if(!actor)return;
    const entry:SystemEvent={id:crypto.randomUUID(),date:new Date().toISOString(),actor:actor.email,
      role:actor.role,category,action,description};
    setEvents(old=>{const next=[entry,...old].slice(0,300);saveJSON('events',next);return next;});
  };
  const update=(fn:(s:State)=>State)=>{
    setState(current=>{const next=fn(current);localStorage.setItem(KEY,JSON.stringify(next));return next;});
  };
  const reset=()=>{
    const next=makeSeed();localStorage.setItem(KEY,JSON.stringify(next));setState(next);
    addEvent(user,'datos','Restablecimiento','Se restableció el conjunto de datos empresariales de ejemplo.');
  };
  const login=(email:string,password:string,remember:boolean)=>{
    const a=accounts.find(x=>x.email===email.trim().toLowerCase()&&x.password===password);
    if(!a)return false;
    const next:Account={email:a.email,role:a.role,name:a.name};
    sessionStorage.removeItem(AUTH);localStorage.removeItem(AUTH);
    (remember?localStorage:sessionStorage).setItem(AUTH,a.email);
    setUser(next);
    addEvent(next,'sesion','Inicio de sesión',`Acceso de demostración · ${remember?'sesión recordada':'sesión temporal'}`);
    return true;
  };
  const logout=()=>{
    addEvent(user,'sesion','Cierre de sesión','El usuario finalizó su sesión de demostración.');
    localStorage.removeItem(AUTH);sessionStorage.removeItem(AUTH);setUser(null);
  };
  const saveSettings=(next:AdminSettings)=>{
    setSettings(next);saveJSON('settings',next);
    addEvent(user,'configuracion','Configuración actualizada',`Se guardaron los datos visibles de ${next.tradeName}.`);
  };
  const toggleCloudService=(id:CloudServiceId)=>{
    const service=cloudServices.find(s=>s.id===id);
    if(!service)return;
    const updated=cloudServices.map(s=>s.id===id?{...s,status:s.status==='activo'?'detenido' as const:'activo' as const}:s);
    setCloudServices(updated);saveJSON('cloud',updated);
    addEvent(user,'infraestructura','Estado de servicio simulado',`${service.name}: ${service.status==='activo'?'detenido':'activado'} en el simulador.`);
  };
  const resetCloud=()=>{
    const updated=cloudServices.map(s=>({...s,status:'activo' as const}));
    setCloudServices(updated);saveJSON('cloud',updated);
    addEvent(user,'infraestructura','Restauración del escenario','Servicios de demostración reactivados.');
  };
  return <Context.Provider value={{state,update,reset,user,login,logout,settings,saveSettings,cloudServices,
    toggleCloudService,resetCloud,events}}>{children}</Context.Provider>;
}
export const useStore=()=>{const ctx=useContext(Context);if(!ctx)throw Error('StoreProvider requerido');return ctx;};
export const demoAccounts=accounts.map(({password:_,...a})=>a);
export {allowed};
