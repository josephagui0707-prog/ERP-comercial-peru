import React,{createContext,useContext,useState} from 'react';
import type {State,Role} from './types';
import {makeSeed} from './seed';
const KEY='enterprisecloud_erp_v2',AUTH='enterprisecloud_auth_demo';
const accounts:{email:string;password:string;role:Role;name:string}[]=[{email:'admin@enterprisecloud.demo',password:'Admin123!',role:'admin',name:'Administrador Demo'},{email:'ventas@enterprisecloud.demo',password:'Ventas123!',role:'ventas',name:'Asesor Comercial'},{email:'almacen@enterprisecloud.demo',password:'Almacen123!',role:'almacen',name:'Encargado de Almacén'},{email:'finanzas@enterprisecloud.demo',password:'Finanzas123!',role:'finanzas',name:'Analista Financiero'}];
export type Account=Omit<(typeof accounts)[number],'password'>;
function readState():State{try{const raw=localStorage.getItem(KEY);if(raw){const p=JSON.parse(raw) as State;if(p.version===2&&Array.isArray(p.sales)&&Array.isArray(p.movements))return p;}}catch{ /* seed on invalid local data */ }return makeSeed();}
function readAuth():Account|null{try{const email=sessionStorage.getItem(AUTH)||localStorage.getItem(AUTH);return accounts.find(a=>a.email===email)??null;}catch{return null;}}
type Ctx={state:State;update:(fn:(s:State)=>State)=>void;reset:()=>void;user:Account|null;login:(email:string,password:string,remember:boolean)=>boolean;logout:()=>void};
const Context=createContext<Ctx|null>(null);
export function StoreProvider({children}:{children:React.ReactNode}){const [state,setState]=useState<State>(readState);const [user,setUser]=useState<Account|null>(readAuth);
 const update=(fn:(s:State)=>State)=>{setState(current=>{const next=fn(current);localStorage.setItem(KEY,JSON.stringify(next));return next;});};
 const reset=()=>{const next=makeSeed();localStorage.setItem(KEY,JSON.stringify(next));setState(next);};
 const login=(email:string,password:string,remember:boolean)=>{const a=accounts.find(x=>x.email===email.trim().toLowerCase()&&x.password===password);if(!a)return false;sessionStorage.removeItem(AUTH);localStorage.removeItem(AUTH);(remember?localStorage:sessionStorage).setItem(AUTH,a.email);setUser(a);return true;};
 const logout=()=>{localStorage.removeItem(AUTH);sessionStorage.removeItem(AUTH);setUser(null);};
 return <Context.Provider value={{state,update,reset,user,login,logout}}>{children}</Context.Provider>;
}
export const useStore=()=>{const ctx=useContext(Context);if(!ctx)throw Error('StoreProvider requerido');return ctx;};
export const demoAccounts=accounts.map(({password:_,...a})=>a);
export const allowed=(role:Role,section:string)=>role==='admin'||section==='inicio'||section==='perfil'||section==='integraciones'||(role==='ventas'&&['clientes','cotizaciones','pedidos','ventas','cobros','devoluciones','comprobantes'].includes(section))||(role==='almacen'&&['productos','almacenes','stock','kardex','transferencias','ajustes'].includes(section))||(role==='finanzas'&&['finanzas','cxc','cxp','caja','bancos','ingresos','egresos','dashboard','reportes','pagos'].includes(section));
