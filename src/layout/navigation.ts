import {
  LayoutDashboard,Users,ShoppingCart,Package,Boxes,Wallet,BarChart3,
  Settings,Shield,Cloud,FileText,Truck,ArrowLeftRight,ClipboardList,
  Receipt,Database,Building2,UserRound,RefreshCw,Folder,Globe,Coins
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

export type NavEntry={path:string;label:string;icon:LucideIcon};
export type NavGroup={label:string;items:NavEntry[]};
/** Organización profesional; la asignación académica de tareas queda solo en docs/. */
export const NAV_GROUPS:NavGroup[]=[
  {label:'PANEL GENERAL',items:[
    {path:'inicio',label:'Resumen ejecutivo',icon:LayoutDashboard},
    {path:'integraciones',label:'Integraciones públicas',icon:Globe}
  ]},
  {label:'COMERCIAL',items:[
    {path:'clientes',label:'Clientes',icon:Users},
    {path:'cotizaciones',label:'Cotizaciones',icon:ClipboardList},
    {path:'pedidos',label:'Pedidos',icon:ShoppingCart},
    {path:'ventas',label:'Ventas',icon:Receipt},
    {path:'comprobantes',label:'Comprobantes',icon:FileText},
    {path:'cobros',label:'Pasarela y cobros',icon:Coins},
    {path:'devoluciones',label:'Devoluciones',icon:RefreshCw}
  ]},
  {label:'INVENTARIO',items:[
    {path:'productos',label:'Productos',icon:Package},
    {path:'almacenes',label:'Almacenes',icon:Building2},
    {path:'stock',label:'Existencias',icon:Boxes},
    {path:'kardex',label:'Kardex',icon:Database},
    {path:'transferencias',label:'Transferencias',icon:ArrowLeftRight},
    {path:'ajustes',label:'Ajustes de stock',icon:Settings}
  ]},
  {label:'FINANZAS Y REPORTES',items:[
    {path:'finanzas',label:'Finanzas',icon:Wallet},
    {path:'cxc',label:'Cuentas por cobrar',icon:Receipt},
    {path:'cxp',label:'Cuentas por pagar',icon:FileText},
    {path:'caja',label:'Caja',icon:Wallet},
    {path:'bancos',label:'Bancos',icon:Building2},
    {path:'ingresos',label:'Ingresos',icon:Coins},
    {path:'egresos',label:'Egresos',icon:Coins},
    {path:'reportes',label:'Reportes',icon:BarChart3}
  ]},
  {label:'COMPRAS Y PROVEEDORES',items:[
    {path:'proveedores',label:'Proveedores',icon:Truck},
    {path:'compras',label:'Compras',icon:ShoppingCart},
    {path:'documentos',label:'Documentos',icon:Folder}
  ]},
  {label:'ADMINISTRACIÓN',items:[
    {path:'cloud',label:'Infraestructura',icon:Cloud},
    {path:'auditoria',label:'Registro de actividad',icon:Shield},
    {path:'configuracion',label:'Configuración',icon:Settings},
    {path:'perfil',label:'Mi perfil',icon:UserRound}
  ]}
];
export const ALL_MODULES=NAV_GROUPS.flatMap(group=>group.items);
export const COMMERCE_SECTIONS=['clientes','cotizaciones','pedidos','ventas','comprobantes','cobros','devoluciones'];
export const INVENTORY_SECTIONS=['productos','almacenes','stock','kardex','transferencias','ajustes'];
export const FINANCE_SECTIONS=['finanzas','cxc','cxp','caja','bancos','ingresos','egresos'];
export const ADMIN_SECTIONS=['cloud','auditoria','configuracion','perfil'];
