import type {Role} from '../../core/types';

export type AdminSettings = {
  companyName:string;
  tradeName:string;
  ruc:string;
  contactEmail:string;
  phone:string;
  city:string;
  currency:'PEN';
  timeZone:'America/Lima';
};
export type CloudServiceId = 'compute'|'database'|'storage'|'identity';
export type CloudService = {
  id: CloudServiceId;
  name:string;
  provider:string;
  summary:string;
  status:'activo'|'detenido';
};
export type EventCategory = 'sesion'|'configuracion'|'infraestructura'|'datos';
export type SystemEvent = {
  id:string;
  date:string;
  actor:string;
  role:Role;
  category:EventCategory;
  action:string;
  description:string;
};
export const DEFAULT_SETTINGS:AdminSettings = {
  companyName:'Comercializadora Tecnológica Perú S.A.C. (ficticia)',
  tradeName:'ERP Comercial Perú',
  ruc:'20123456789',
  contactEmail:'contacto@comercialperu.demo',
  phone:'01 555 0101',
  city:'Lima, Perú',
  currency:'PEN',timeZone:'America/Lima',
};
export const DEFAULT_SERVICES:CloudService[] = [
  {id:'compute',name:'Aplicación web',provider:'AWS EC2 (conceptual)',summary:'Interfaz y servicios empresariales',status:'activo'},
  {id:'database',name:'Base de datos',provider:'AWS RDS (conceptual)',summary:'Persistencia centralizada futura',status:'activo'},
  {id:'storage',name:'Archivos',provider:'AWS S3 (conceptual)',summary:'Comprobantes y documentos',status:'activo'},
  {id:'identity',name:'Identidades',provider:'AWS IAM (conceptual)',summary:'Gestión de permisos futuros',status:'activo'},
];
