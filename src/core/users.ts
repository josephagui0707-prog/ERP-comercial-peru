import type {Role} from './types';
export type LocalUser={id:string;email:string;password:string;role:Role;name:string;phone:string;active:boolean};
export const USERS_KEY='erp_pe_users_v1';
export const initialAccounts:LocalUser[]=[
  {email:'admin@enterprisecloud.demo',password:'Admin123!',role:'admin',active:true,phone:'',id:'demo-admin',name:'Administrador Demo'},
  {email:'ventas@enterprisecloud.demo',password:'Ventas123!',role:'ventas',active:true,phone:'',id:'demo-ventas',name:'Asesor Comercial'},
  {email:'almacen@enterprisecloud.demo',password:'Almacen123!',role:'almacen',active:true,phone:'',id:'demo-almacen',name:'Encargado de Almacén'},
  {email:'finanzas@enterprisecloud.demo',password:'Finanzas123!',role:'finanzas',active:true,phone:'',id:'demo-finanzas',name:'Analista Financiero'}
];

export function loadUsers():LocalUser[]{
  const raw=localStorage.getItem(USERS_KEY);
  if(!raw)return initialAccounts;
  const users:unknown=JSON.parse(raw);
  if(!Array.isArray(users)||!users.length||!users.every(u=>typeof u.id==='string'&&typeof u.name==='string'&&typeof u.email==='string'&&typeof u.password==='string'&&typeof u.active==='boolean'&&['admin','ventas','almacen','finanzas'].includes(u.role)))throw Error('Los usuarios locales no son válidos.');
  return users;
}
export function reviseUser(users:LocalUser[],draft:LocalUser,actorId:string):LocalUser[]{
  const next={...draft,name:draft.name.trim(),email:draft.email.trim().toLowerCase(),phone:draft.phone.trim()};
  if(!next.name||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email))throw Error('Completa el nombre y un correo válido.');
  if(!['admin','ventas','almacen','finanzas'].includes(next.role))throw Error('Selecciona un rol válido.');
  if(next.password.length<8)throw Error('La contraseña debe tener al menos 8 caracteres.');
  if(users.some(u=>u.id!==next.id&&u.email.toLowerCase()===next.email))throw Error('El correo ya pertenece a otro usuario.');
  if(next.id===actorId&&(!next.active||next.role!=='admin'))throw Error('No puedes desactivar ni quitar el rol de tu propia cuenta administradora.');
  const result=users.some(u=>u.id===next.id)?users.map(u=>u.id===next.id?next:u):[...users,next];
  if(!result.some(u=>u.active&&u.role==='admin'))throw Error('Debe quedar un administrador activo.');
  return result;
}
