import {DEFAULT_SERVICES,DEFAULT_SETTINGS} from './model';
import type {AdminSettings,CloudService,CloudServiceId,SystemEvent} from './model';

const SETTINGS_KEY='erp_pe_admin_settings_v1';
const CLOUD_KEY='erp_pe_cloud_demo_v1';
const EVENTS_KEY='erp_pe_events_demo_v1';

const scoped=(key:string,tenant:string)=>tenant==='AULA'?key:key+'_'+tenant;
function load(key:string):unknown {
  try {const value=localStorage.getItem(key);return value?JSON.parse(value) as unknown:null;}
  catch {return null;}
}
export function saveJSON(key:'settings'|'cloud'|'events',value:unknown,tenant='AULA'):void {
  const keys={settings:SETTINGS_KEY,cloud:CLOUD_KEY,events:EVENTS_KEY};
  try{localStorage.setItem(scoped(keys[key],tenant),JSON.stringify(value));}
  catch { /* Sin almacenamiento disponible: el estado en memoria sigue operativo. */ }
}
export function loadSettings(tenant='AULA'):AdminSettings {
  const raw=load(scoped(SETTINGS_KEY,tenant));
  if (!raw||typeof raw!=='object'||Array.isArray(raw))return {...DEFAULT_SETTINGS};
  const r=raw as Partial<AdminSettings>;
  return {
    companyName:typeof r.companyName==='string'?r.companyName:DEFAULT_SETTINGS.companyName,
    tradeName:typeof r.tradeName==='string'?r.tradeName:DEFAULT_SETTINGS.tradeName,
    ruc:typeof r.ruc==='string'?r.ruc:DEFAULT_SETTINGS.ruc,
    contactEmail:typeof r.contactEmail==='string'?r.contactEmail:DEFAULT_SETTINGS.contactEmail,
    phone:typeof r.phone==='string'?r.phone:DEFAULT_SETTINGS.phone,
    city:typeof r.city==='string'?r.city:DEFAULT_SETTINGS.city,
    currency:'PEN',timeZone:'America/Lima',
  };
}
export function loadServices(tenant='AULA'):CloudService[] {
  const raw=load(scoped(CLOUD_KEY,tenant));
  if(!Array.isArray(raw))return DEFAULT_SERVICES.map(s=>({...s}));
  return DEFAULT_SERVICES.map(s=>{
    const saved=raw.find((entry:unknown)=>entry!=null&&typeof entry==='object'&&
      (entry as {id?:CloudServiceId}).id===s.id) as Partial<CloudService>|undefined;
    return {...s,status:saved?.status==='detenido'?'detenido':'activo'};
  });
}
export function loadEvents(tenant='AULA'):SystemEvent[] {
  const raw=load(scoped(EVENTS_KEY,tenant));
  if(!Array.isArray(raw))return [];
  return raw.filter((entry:unknown):entry is SystemEvent=>{
    if(!entry||typeof entry!=='object')return false;
    const e=entry as Partial<SystemEvent>;
    return typeof e.id==='string'&&typeof e.date==='string'&&typeof e.actor==='string'&&
      typeof e.action==='string'&&typeof e.description==='string'&&
      ['sesion','configuracion','infraestructura','datos'].includes(e.category??'');
  }).slice(0,300);
}
