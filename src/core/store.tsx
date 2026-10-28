import {initialAccounts,loadUsers,reviseUser,USERS_KEY} from './users';
import type {LocalUser} from './users';
import {createContext,useContext,useState,useRef,useEffect} from 'react';
import type {ReactNode} from 'react';
import type {State,Role} from './types';
import {normalizeInventory,finalizeInventory} from '../features/inventory/model';
import {makeEmpty} from './empty';
import {allowed} from './permissions';
import type {AdminSettings,CloudService,CloudServiceId,EventCategory,SystemEvent} from '../features/administration/model';
import {loadEvents,loadServices,loadSettings,saveJSON} from '../features/administration/storage';

const KEY='enterprisecloud_erp_v2';
const AUTH='enterprisecloud_auth_demo';
export type Account=Omit<LocalUser,'password'>;
function readState():State {
  try{const raw=localStorage.getItem(KEY);if(raw){const p=JSON.parse(raw) as State;
    if(p.version===2&&Array.isArray(p.sales)&&Array.isArray(p.movements))return normalizeInventory(p);}}
  catch {/* Datos locales ilegibles: usar semilla. */}
  return normalizeInventory(makeEmpty());
}
function readAuth():Account|null {
  try{const email=sessionStorage.getItem(AUTH)||localStorage.getItem(AUTH);
    const a=loadUsers().find(a=>a.email===email&&a.active);if(!a)return null;const {password:_,...safe}=a;return safe;}
  catch{return null;}
}
type Ctx = {
  users:Account[];
  saveUser:(draft:Omit<LocalUser,'password'> & {password?:string})=>void;
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
  const [users,setUsers]=useState<LocalUser[]>(loadUsers);
  const [state,setState]=useState<State>(readState);
  const stateRef=useRef(state);
  const [user,setUser]=useState<Account|null>(readAuth);
  const [settings,setSettings]=useState<AdminSettings>(loadSettings);
  const [cloudServices,setCloudServices]=useState<CloudService[]>(loadServices);
  const [events,setEvents]=useState<SystemEvent[]>(loadEvents);

  useEffect(()=>{
    const sync=()=>{try{setUsers(loadUsers());setUser(readAuth());}catch{setUser(null);}};
    const changed=(event:StorageEvent)=>{if(event.key===USERS_KEY||event.key===AUTH||event.key===null)sync();};
    window.addEventListener('storage',changed);window.addEventListener('focus',sync);
    return ()=>{window.removeEventListener('storage',changed);window.removeEventListener('focus',sync);};
  },[]);
  const addEvent=(actor:Account|null,category:EventCategory,action:string,description:string)=>{
    if(!actor)return;
    const entry:SystemEvent={id:crypto.randomUUID(),date:new Date().toISOString(),actor:actor.email,
      role:actor.role,category,action,description};
    setEvents(old=>{const next=[entry,...old].slice(0,300);saveJSON('events',next);return next;});
  };
  const update=(fn:(s:State)=>State)=>{
    // Commit synchronously: validation/storage errors reach the calling form.
    const next=finalizeInventory(stateRef.current,fn(structuredClone(stateRef.current)),user?.name??'Usuario local');
    try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw Error('No se pudo guardar: el almacenamiento local está lleno o bloqueado. Reduce el tamaño de los adjuntos y reintenta.');}
    stateRef.current=next;setState(next);
  };
  const reset=()=>{
    if(user?.role!=='admin')throw Error('Solo el administrador puede vaciar los datos.');
    const next=normalizeInventory(makeEmpty());localStorage.setItem(KEY,JSON.stringify(next));stateRef.current=next;setState(next);
    addEvent(user,'datos','Restablecimiento','Se vaciaron los registros empresariales para una nueva carga.');
  };
  const login=(email:string,password:string,remember:boolean)=>{
    const a=loadUsers().find(x=>x.active&&x.email===email.trim().toLowerCase()&&x.password===password);
    if(!a)return false;
    const {password:_,...next}=a;
    sessionStorage.removeItem(AUTH);localStorage.removeItem(AUTH);
    (remember?localStorage:sessionStorage).setItem(AUTH,a.email);
    setUser(next);
    addEvent(next,'sesion','Inicio de sesión',`Acceso de demostración · ${remember?'sesión recordada':'sesión temporal'}`);
    return true;
  };
  const saveUser=(draft:Omit<LocalUser,'password'> & {password?:string})=>{
    if(user?.role!=='admin')throw Error('Solo el administrador puede gestionar usuarios.');
    const current=loadUsers();
    const previous=current.find(u=>u.id===draft.id);
    const next=reviseUser(current,{...draft,password:draft.password||previous?.password||''},user.id);
    try{localStorage.setItem(USERS_KEY,JSON.stringify(next));}catch{throw Error('No se pudo guardar el usuario en este navegador.');}
    setUsers(next);
    if(draft.id===user.id){const {password:_,...safe}=next.find(u=>u.id===draft.id)!;setUser(safe);if(sessionStorage.getItem(AUTH))sessionStorage.setItem(AUTH,safe.email);if(localStorage.getItem(AUTH))localStorage.setItem(AUTH,safe.email);}
    addEvent(user,'configuracion',previous?'Usuario actualizado':'Usuario creado',`${draft.email} · ${draft.role} · ${draft.active?'Activo':'Inactivo'}`);
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
  return <Context.Provider value={{users:users.map(({password:_,...safe})=>safe),saveUser,state,update,reset,user,login,logout,settings,saveSettings,cloudServices,
    toggleCloudService,resetCloud,events}}>{children}</Context.Provider>;
}
export const useStore=()=>{const ctx=useContext(Context);if(!ctx)throw Error('StoreProvider requerido');return ctx;};
export const demoAccounts=initialAccounts.map(({password:_,...a})=>a);
export {allowed};
