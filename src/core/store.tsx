import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import type {State,Role} from './types';
import {normalizeInventory,finalizeInventory} from '../features/inventory/model';
import {makeEmpty} from './empty';
import {makeSeed} from './seed';
import {allowed} from './permissions';
import {api,HttpError,newId} from './api';
import type {AdminSettings,CloudService,CloudServiceId,EventCategory,SystemEvent} from '../features/administration/model';
import {loadEvents,loadServices,loadSettings,saveJSON} from '../features/administration/storage';

export type Account={id:string;tenant:string;name:string;email:string;phone:string;role:Role;active:boolean};
type UserDraft=Omit<Account,'tenant'> & {password?:string};
type Ctx={
  users:Account[];saveUser:(draft:UserDraft)=>Promise<void>;state:State;update:(fn:(s:State)=>State)=>void;reset:()=>void;loadDemo:()=>void;
  user:Account|null;login:(email:string,password:string,remember:boolean,tenant:string)=>Promise<Account>;logout:()=>Promise<void>;
  settings:AdminSettings;saveSettings:(v:AdminSettings)=>void;cloudServices:CloudService[];toggleCloudService:(id:CloudServiceId)=>void;
  resetCloud:()=>void;events:SystemEvent[];
};
const Context=createContext<Ctx|null>(null);
const originalKey='enterprisecloud_erp_v2';
function readState(raw:string|null) {
  if(!raw) return normalizeInventory(makeEmpty());
  const parsed=JSON.parse(raw) as State;
  if(parsed.version!==2 || !Array.isArray(parsed.sales) || !Array.isArray(parsed.movements)) throw Error('El formato de los datos comerciales locales no es compatible.');
  return normalizeInventory(parsed);
}
export function StoreProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<Account|null>(null),[ready,setReady]=useState(false),[problem,setProblem]=useState('');
  const check=useCallback(async()=>{
    try{const u=await api<Account>('/me');setUser(u);setProblem('');}
    catch(e){if(e instanceof HttpError && e.status===401){setUser(null);setProblem('');}else setProblem((e as Error).message);}
    finally{setReady(true);}
  },[]);
  useEffect(()=>{
    void check();const expire=()=>{setUser(null);setProblem('');};
    window.addEventListener('focus',check);window.addEventListener('erp:sesion-caducada',expire);
    return ()=>{window.removeEventListener('focus',check);window.removeEventListener('erp:sesion-caducada',expire);};
  },[check]);
  const login=async(email:string,password:string,remember:boolean,tenant:string)=>{
    const u=await api<Account>('/login','POST',{email,password,remember,tenant});setUser(u);return u;
  };
  const logout=async()=>{try{await api('/logout','POST',{});setUser(null);}catch(e){setProblem((e as Error).message);}};
  if(!ready || (problem&&!user)) return <main className="p-5"><h1>ERP Comercial Perú</h1><p role="status">{problem||'Conectando con tu espacio de trabajo…'}</p>{problem&&<button className="btn btn-primary" onClick={check}>Reintentar conexión</button>}</main>;
  return <Workspace key={(user?.tenant||'')+'/'+(user?.id||'')+'/'+(user?.role||'')} user={user} login={login} logout={logout} onUser={setUser}>
    {problem&&<div className="alert alert-warning" role="alert">{problem} <button onClick={check}>Reintentar</button></div>}{children}
  </Workspace>;
}
function Workspace({user,login,logout,onUser,children}:{user:Account|null;login:Ctx['login'];logout:Ctx['logout'];onUser:(u:Account|null)=>void;children:ReactNode}) {
  const scope=user?.tenant || '';
  const key=scope==='AULA'?originalKey:originalKey+'_'+scope;
  const commercial=!!user && !['repartidor','monitor'].includes(user.role);
  const demoFlag='erp-demo-initialized-v3_'+scope;
  const readWorkspace=():{value:string|null;state:State}=>{
    let value=commercial?localStorage.getItem(key):null;
    // Sólo inicializar AULA: jamás reemplazar registros existentes ni datos de otras organizaciones.
    if(commercial&&scope==='AULA'&&!localStorage.getItem(demoFlag) && (!value||isPristineState(value))){
      const demo=normalizeInventory(makeSeed());value=JSON.stringify(demo);
      localStorage.setItem(key,value);localStorage.setItem(demoFlag,'1');
      return {value,state:demo};
    }
    return {value,state:readState(value)};
  };
  const [loadError,setLoadError]=useState('');
  const raw=useRef<string|null>(null);
  const [state,setState]=useState<State>(()=>{try{const loaded=readWorkspace();raw.current=loaded.value;return loaded.state;}catch{return makeEmpty();}});
  const current=useRef(state);
  const [users,setUsers]=useState<Account[]>(user?[user]:[]);
  const [settings,setSettings]=useState(()=>loadSettings(scope)),[cloudServices,setServices]=useState(()=>loadServices(scope)),[events,setEvents]=useState(()=>commercial?loadEvents(scope):[]);
  useEffect(()=>{
    let active=true;
    if(user?.role==='admin') api<Account[]>('/users').then(list=>{if(active)setUsers(list);}).catch(e=>{if(active)setLoadError(e.message);});
    return ()=>{active=false;};
  },[user?.id,user?.role]);
  useEffect(()=>{
    if(!commercial)return;
    const reload=()=>{try{const loaded=readWorkspace();current.current=loaded.state;raw.current=loaded.value;setState(loaded.state);setLoadError('');}catch{setLoadError('Los datos comerciales guardados no se pudieron leer. Recupera una copia antes de continuar.');}};
    reload();const onStorage=(e:StorageEvent)=>{if(e.key===key || e.key===null)reload();};
    window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage);
  },[commercial,key]);
  const addEvent=(category:EventCategory,action:string,description:string)=>{
    if(!user)return;const item:SystemEvent={id:newId(),date:new Date().toISOString(),actor:user.email,role:user.role,category,action,description};
    setEvents(old=>{const next=[item,...old].slice(0,300);saveJSON('events',next,scope);return next;});
  };
  const update=(fn:(s:State)=>State)=>{
    if(!commercial)throw Error('Este perfil solo tiene acceso a sus entregas.');
    if(loadError || raw.current!==localStorage.getItem(key))throw Error('Los datos locales cambiaron o no están disponibles. Actualiza la página antes de guardar.');
    const next=finalizeInventory(current.current,fn(structuredClone(current.current)),user.name);
    const value=JSON.stringify(next);
    try{localStorage.setItem(key,value);}catch{throw Error('No se pudo guardar en este navegador. Revisa el espacio de los adjuntos.');}
    current.current=next;raw.current=value;setState(next);
  };
  const reset=()=>{
    if(user?.role!=='admin')throw Error('Solo administración puede vaciar los datos.');
    const next=normalizeInventory(makeEmpty()),value=JSON.stringify(next);
    localStorage.setItem(key,value);localStorage.setItem(demoFlag,'1');raw.current=value;current.current=next;setState(next);setLoadError('');
    addEvent('datos','Restablecimiento','Se vaciaron los datos comerciales de este navegador.');
  };
  const loadDemo=()=>{
    if(user?.role!=='admin'||scope!=='AULA')throw Error('Solo el administrador del aula puede cargar la demostración.');
    if(!window.confirm('¿Restaurar el escenario de práctica? Se reemplazarán los datos comerciales de ESTE navegador. Esta acción no puede deshacerse.'))return;
    const next=normalizeInventory(makeSeed()),value=JSON.stringify(next);
    localStorage.setItem(key,value);localStorage.setItem(demoFlag,'1');raw.current=value;current.current=next;setState(next);setLoadError('');
    addEvent('datos','Restauración de escenario','Se restauraron clientes, productos, stock y transacciones de demostración.');
  };
  const saveUser=async(draft:UserDraft)=>{
    const updated=await api<Account>('/users','PUT',draft);
    const list=await api<Account[]>('/users');setUsers(list);if(updated.id===user?.id)onUser(updated);
  };
  const saveSettings=(next:AdminSettings)=>{setSettings(next);saveJSON('settings',next,scope);addEvent('configuracion','Configuración actualizada',next.tradeName);};
  const toggleCloudService=(id:CloudServiceId)=>{const next=cloudServices.map(s=>s.id===id?{...s,status:s.status==='activo'?'detenido' as const:'activo' as const}:s);setServices(next);saveJSON('cloud',next,scope);addEvent('infraestructura','Simulación actualizada',id);};
  const resetCloud=()=>{const next=cloudServices.map(s=>({...s,status:'activo' as const}));setServices(next);saveJSON('cloud',next,scope);addEvent('infraestructura','Restauración','Servicios del escenario reactivados.');};
  return <Context.Provider value={{users,saveUser,state,update,reset,loadDemo,user,login,logout,settings,saveSettings,cloudServices,toggleCloudService,resetCloud,events}}>
    {loadError&&<div role="alert" className="alert alert-warning">{loadError}</div>}{children}
  </Context.Provider>;
}
export const useStore=()=>{const ctx=useContext(Context);if(!ctx)throw Error('StoreProvider requerido');return ctx;};
export {allowed};

/** Datos vacíos de versiones anteriores: se recuperan una única vez en el aula. */
function isPristineState(raw:string):boolean {
 try {const s=JSON.parse(raw) as State;return s.version===2 && ['clients','products','sales','orders','quotes','inventory','movements','purchases','suppliers'].every(k=>Array.isArray(s[k as keyof State]) && (s[k as keyof State] as unknown[]).length===0);}
 catch{return false;}
}
