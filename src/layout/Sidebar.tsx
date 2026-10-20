import {useEffect,useRef,useState} from 'react';
import {NavLink} from 'react-router-dom';
import {ChevronDown,LogOut,Search,X} from 'lucide-react';
import {allowed} from '../core/permissions';
import {useStore} from '../core/store';
import {NAV_GROUPS} from './navigation';

type SidebarProps={open:boolean;onClose:()=>void};
export default function Sidebar({open,onClose}:SidebarProps){
  const {user,logout,settings}=useStore();
  const [query,setQuery]=useState('');
  const [collapsed,setCollapsed]=useState<string[]>([]);
  const searchRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    const handle=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();searchRef.current?.focus();
      }
      if(event.key==='Escape'){searchRef.current?.blur();onClose();}
    };
    window.addEventListener('keydown',handle);
    return ()=>window.removeEventListener('keydown',handle);
  },[onClose]);
  if(!user)return null;
  const normalized=query.trim().toLocaleLowerCase('es-PE');
  const visibleGroups=NAV_GROUPS.map(group=>({...group,items:group.items.filter(
    item=>allowed(user.role,item.path)&&item.label.toLocaleLowerCase('es-PE').includes(normalized)
  )})).filter(group=>group.items.length>0);
  return <aside className={'sidebar erp-sidebar'+(open?' open':'')}aria-label="Navegación principal">
    <div className="brand erp-brand"><img src="/brand/erp-logo.png"width="45"height="45"alt=""className="brand-logo"/>
      <span className="brand-copy"><strong>ERP Comercial Perú</strong><small>GESTIÓN EMPRESARIAL INTEGRADA</small></span>
      <button type="button"className="mobile-close"onClick={onClose}aria-label="Cerrar menú"><X size={19}/></button>
    </div>
    <div className="workspace shadow-sm"><span className="ws-avatar">PE</span><span><b>{settings.tradeName}</b><small>Espacio de demostración · PEN</small></span><span className="workspace-status"title="Modo local"/></div>
    <div className="erp-sidebar-search"><Search size={16}/><input ref={searchRef}type="search"aria-label="Buscar un módulo"placeholder="Buscar un módulo..."value={query}onChange={e=>setQuery(e.target.value)}/>{query?<button type="button"onClick={()=>setQuery('')}aria-label="Borrar búsqueda"><X size={15}/></button>:<kbd>Ctrl K</kbd>}</div>
    <nav className="erp-nav-scroll"aria-label="Módulos del ERP">
      {visibleGroups.map(group=>{
        const hidden=collapsed.includes(group.label)&&!normalized;
        return <section className="nav-group"key={group.label}>
          <button type="button"className="nav-heading nav-section-toggle"aria-expanded={!hidden}
            onClick={()=>setCollapsed(current=>current.includes(group.label)?current.filter(v=>v!==group.label):[...current,group.label])}>
            <span>{group.label}</span><ChevronDown size={13}className={hidden?'chevron-closed':''}/>
          </button>{!hidden&&<div className="nav flex-column nav-pills">{group.items.map(({path,label,icon:Icon})=><NavLink
            to={'/'+path}key={path}onClick={onClose}className={({isActive})=>'nav-item nav-link'+(isActive?' active':'')}>
            <Icon size={17}strokeWidth={1.8}/><span>{label}</span>
          </NavLink>)}</div>}
        </section>;
      })}
      {!visibleGroups.length&&<p className="sidebar-empty">No hay módulos con ese nombre.</p>}
    </nav>
    <div className="sidebar-footer"><div className="user-chip"><span className="avatar-mini">{user.name[0]}</span><span><strong>{user.name}</strong><small>{user.role==='admin'?'ADMINISTRADOR':user.role.toUpperCase()} · LOCAL</small></span></div>
      <button className="logout btn"type="button"onClick={()=>{logout();onClose();}}><LogOut size={17}/> Cerrar sesión</button>
    </div>
  </aside>;
}
