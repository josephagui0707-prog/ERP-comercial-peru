import {useEffect,useState} from 'react';
import {NavLink,useLocation} from 'react-router-dom';
import {ChevronDown,ChevronRight,LogOut,X} from 'lucide-react';
import {allowed} from '../core/permissions';
import {useStore} from '../core/store';
import {NAV_GROUPS} from './navigation';

type SidebarProps={open:boolean;onClose:()=>void};
export default function Sidebar({open,onClose}:SidebarProps){
  const {user,logout}=useStore();
  const location=useLocation();
  const current=location.pathname.split('/')[1]||'inicio';
  const [expanded,setExpanded]=useState<string[]>(['INICIO','FLUJO COMERCIAL']);
  useEffect(()=>{const group=NAV_GROUPS.find(g=>g.items.some(i=>i.path===current));if(group)setExpanded(previous=>previous.includes(group.label)?previous:[...previous,group.label]);},[current]);
  useEffect(()=>{const handle=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);},[onClose]);
  if(!user)return null;
  const groups=NAV_GROUPS.map(g=>({...g,items:g.items.filter(i=>allowed(user.role,i.path))})).filter(g=>g.items.length);
  return <aside className={'sidebar erp-sidebar'+(open?' open':'')} aria-label="Navegación principal">
    <div className="brand erp-brand"><img src="/brand/erp-logo.png"width="42"height="42"alt=""className="brand-logo"/><span className="brand-copy"><strong>ERP Comercial Perú</strong><small>PLATAFORMA DE GESTIÓN</small></span><button type="button"className="mobile-close"onClick={onClose}aria-label="Cerrar menú"><X size={19}/></button></div>
    <nav className="erp-nav-scroll" aria-label="Módulos del ERP">{groups.map(group=>{const active=group.items.some(i=>i.path===current);const show=expanded.includes(group.label);return <section key={group.label} className={'nav-group'+(active?' nav-group-current':'')}><button type="button" className="nav-heading nav-section-toggle" aria-expanded={show} onClick={()=>setExpanded(list=>list.includes(group.label)?list.filter(v=>v!==group.label):[...list,group.label])}><span className="nav-group-title">{group.label}</span>{show?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</button>{show&&<div className="nav flex-column nav-pills">{group.items.map(({path,label,icon:Icon})=><NavLink key={path} to={'/'+path} onClick={onClose} className={({isActive})=>'nav-item nav-link'+(isActive?' active':'')}><Icon size={16} strokeWidth={1.8}/><span>{label}</span></NavLink>)}</div>}</section>;})}{!groups.length&&<p className="sidebar-empty">No hay módulos con ese nombre.</p>}</nav>
    <div className="sidebar-footer"><div className="user-chip"><span className="avatar-mini">{user.name[0]}</span><span><strong>{user.name}</strong><small>{user.role==='admin'?'ADMINISTRADOR':user.role.toUpperCase()} · DEMO LOCAL</small></span></div><button className="logout btn"type="button"onClick={()=>{logout();onClose();}}><LogOut size={16}/> Cerrar sesión</button></div>
  </aside>;
}
