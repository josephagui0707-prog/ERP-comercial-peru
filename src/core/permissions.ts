import type {Role} from './types';

/** Navegación y permisos visuales de la demo. NO constituye seguridad real. */
const COMMON = ['inicio', 'perfil', 'integraciones', 'datos-maestros'] as const;
const BY_ROLE: Record<Exclude<Role,'admin'>,readonly string[]> = {
  repartidor:['rutas','perfil'], monitor:['rutas','perfil'],
  ventas: ['rutas','clientes','cotizaciones','pedidos','ventas','cobros','devoluciones','comprobantes'],
  almacen: ['clientes','productos','categorias','movimientos','almacenes','stock','kardex','transferencias','ajustes','documentos-inventario'],
  finanzas: ['finanzas','cxc','cxp','caja','bancos','ingresos','egresos','reportes'],
};
export const ROLE_NAMES:Record<Role,string> = {
  repartidor:'Repartidor',monitor:'Monitor de entrega',admin:'Administrador',ventas:'Comercial',almacen:'Inventario',finanzas:'Finanzas'
};
export const allowed = (role:Role,section:string):boolean =>
  role==='admin' || (role!=='repartidor' && role!=='monitor' && COMMON.some(p=>p===section)) || BY_ROLE[role].includes(section);
export const homeFor=(role:Role)=>role==='monitor'||role==='repartidor'?'/rutas':'/inicio';
