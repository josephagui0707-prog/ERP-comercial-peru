import {LayoutDashboard,Users,ShoppingCart,Package,Boxes,Wallet,BarChart3,Settings,Shield,Cloud,FileText,Truck,ArrowLeftRight,ClipboardList,Receipt,Database,Building2,UserRound,RefreshCw,Folder,Globe,Coins,PackageCheck} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
export type NavEntry={path:string;label:string;icon:LucideIcon};
export type NavGroup={label:string;items:NavEntry[];subtitle?:string};
/** Operaciones first. Master CRUDs live under Mantenimiento, separate from transaction flows. */
export const NAV_GROUPS:NavGroup[]=[
  {label:'INICIO',items:[{path:'inicio',label:'Dashboard ejecutivo',icon:LayoutDashboard}]},
  {label:'FLUJO COMERCIAL',subtitle:'De cotización a cobro',items:[
    {path:'cotizaciones',label:'Cotizaciones',icon:ClipboardList},
    {path:'pedidos',label:'Pedidos',icon:PackageCheck},
    {path:'ventas',label:'Ventas',icon:Receipt},
    {path:'comprobantes',label:'Comprobantes',icon:FileText},
    {path:'cobros',label:'Cobros',icon:Coins},
    {path:'devoluciones',label:'Postventa y devoluciones',icon:RefreshCw}
  ]},
  {label:'COMPRAS',items:[{path:'compras',label:'Órdenes de compra',icon:ShoppingCart},{path:'documentos',label:'Documentos de compras',icon:Folder}]},
  {label:'CONTROL DE INVENTARIO',items:[
    {path:'stock',label:'Existencias',icon:Boxes},
    {path:'movimientos',label:'Entradas y salidas',icon:ArrowLeftRight},
    {path:'transferencias',label:'Transferencias',icon:Truck},
    {path:'ajustes',label:'Ajustes de inventario',icon:Settings},
    {path:'kardex',label:'Kardex y trazabilidad',icon:Database},
    {path:'documentos-inventario',label:'Documentos de inventario',icon:FileText}
  ]},
  {label:'FINANZAS Y REPORTES',items:[
    {path:'finanzas',label:'Resumen financiero',icon:Wallet},
    {path:'cxc',label:'Cuentas por cobrar',icon:Receipt},
    {path:'cxp',label:'Cuentas por pagar',icon:FileText},
    {path:'caja',label:'Caja',icon:Wallet},
    {path:'bancos',label:'Bancos',icon:Building2},
    {path:'ingresos',label:'Ingresos',icon:Coins},
    {path:'egresos',label:'Egresos',icon:Coins},
    {path:'reportes',label:'Reportes gerenciales',icon:BarChart3}
  ]},
  {label:'MANTENIMIENTO',subtitle:'Catálogos y datos maestros',items:[
    {path:'clientes',label:'Clientes',icon:Users},
    {path:'productos',label:'Productos',icon:Package},
    {path:'categorias',label:'Categorías',icon:Folder},
    {path:'proveedores',label:'Proveedores',icon:Truck},
    {path:'almacenes',label:'Almacenes',icon:Building2}
  ]},
  {label:'SISTEMA',items:[
    {path:'usuarios',label:'Usuarios y roles',icon:Users},
    {path:'integraciones',label:'Integraciones',icon:Globe},
    {path:'auditoria',label:'Auditoría',icon:Shield},
    {path:'configuracion',label:'Configuración',icon:Settings},
    {path:'perfil',label:'Mi perfil',icon:UserRound}
  ]}
];
export const ALL_MODULES=NAV_GROUPS.flatMap(group=>group.items);
export const COMMERCE_SECTIONS=['clientes','cotizaciones','pedidos','ventas','comprobantes','cobros','devoluciones'];
export const INVENTORY_SECTIONS=['productos','categorias','almacenes','stock','kardex','transferencias','ajustes','movimientos','documentos-inventario'];
export const FINANCE_SECTIONS=['finanzas','cxc','cxp','caja','bancos','ingresos','egresos'];
export const ADMIN_SECTIONS=['usuarios','cloud','auditoria','configuracion','perfil'];
