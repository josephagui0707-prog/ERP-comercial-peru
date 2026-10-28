import {lazy,Suspense,useCallback,useEffect,useState} from 'react';
import {Navigate,NavLink,useLocation} from 'react-router-dom';
import {Menu,Moon,Sun} from 'lucide-react';
import {useStore} from './core/store';
import {allowed,ROLE_NAMES} from './core/permissions';
import {ALL_MODULES,ADMIN_SECTIONS,COMMERCE_SECTIONS,FINANCE_SECTIONS,INVENTORY_SECTIONS} from './layout/navigation';
import Sidebar from './layout/Sidebar';
import ERPAssistant from './components/ERPAssistant';
import Login from './pages/Login';

const Purchases=lazy(()=>import('./pages/Purchases'));
const Dashboard=lazy(()=>import('./pages/Dashboard'));
const Commerce=lazy(()=>import('./pages/Commerce'));
const Inventory=lazy(()=>import('./pages/Inventory'));
const Finance=lazy(()=>import('./pages/Finance'));
const Reports=lazy(()=>import('./pages/Reports'));
const Extensions=lazy(()=>import('./pages/Extensions'));
const Administration=lazy(()=>import('./pages/Administration'));

type Theme='light'|'dark';
function getTheme():Theme{try{return localStorage.getItem('erp-theme')==='light'?'light':'dark';}catch{return 'dark';}}
function PageLoader(){return <div className="route-loader"role="status"aria-live="polite"><span className="visually-hidden">Cargando módulo...</span>
  <div className="route-loader-head"><i/><i/></div><div className="route-loader-cards"><i/><i/><i/><i/></div><div className="route-loader-wide"/>
</div>;}
function Content({section}:{section:string}){
  if(section==='compras'||section==='documentos')return <Purchases documents={section==='documentos'}/>;
  if(section==='inicio')return <Dashboard/>;
  if(section==='reportes')return <Reports/>;
  if(ADMIN_SECTIONS.includes(section))return <Administration section={section}/>;
  if(COMMERCE_SECTIONS.includes(section))return <Commerce section={section}/>;
  if(INVENTORY_SECTIONS.includes(section))return <Inventory section={section}/>;
  if(FINANCE_SECTIONS.includes(section))return <Finance section={section}/>;
  return <Extensions section={section}/>;
}
export default function App(){
  const {user,settings}=useStore();
  const location=useLocation();
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const closeSidebar=useCallback(()=>setSidebarOpen(false),[]);
  const [theme,setTheme]=useState<Theme>(getTheme);
  useEffect(()=>{
    document.documentElement.setAttribute('data-bs-theme',theme);
    try{localStorage.setItem('erp-theme',theme);}catch{/* tema usable en memoria */}
  },[theme]);
  useEffect(()=>{closeSidebar();},[location.pathname,closeSidebar]);
  useEffect(()=>{
    if(!sidebarOpen)return;
    const old=document.body.style.overflow;document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=old;};
  },[sidebarOpen]);
  const section=location.pathname.split('/')[1]||'inicio';
  if(!user)return <Login/>;
  if(section==='cloud')return <Navigate to={user.role==='admin'?'/integraciones?tab=cloud':'/integraciones'} replace/>;
  if(!allowed(user.role,section)||!ALL_MODULES.some(item=>item.path===section))return <Navigate to="/inicio"replace/>;
  const page=ALL_MODULES.find(item=>item.path===section);
  return <div className="shell bootstrap-erp">
    <Sidebar open={sidebarOpen}onClose={closeSidebar}/>
    <div className="main-area">
      <header className="topbar border-bottom"><div className="topbar-start">
        <button type="button"className="mobile-menu btn"onClick={()=>setSidebarOpen(true)}aria-label="Abrir menú"><Menu size={21}/></button>
        <div className="breadcrumb"><span className="breadcrumb-company">{settings.tradeName}</span><span>/</span><b>{page?.label}</b></div>
      </div><div className="top-right"><span className="environment-label"><span className="status-dot">Demo local</span></span>
        <button type="button"className="btn btn-sm btn-outline-secondary theme-switch"title={theme==='dark'?'Activar tema claro':'Activar tema oscuro'}
          aria-label={theme==='dark'?'Activar tema claro':'Activar tema oscuro'}onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>
          {theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button>
        <span className="top-role">{ROLE_NAMES[user.role]}</span>
        <NavLink to="/perfil"className="avatar-mini"aria-label="Ver mi perfil">{user.name[0]}</NavLink>
      </div></header>
      <main className="content container-fluid"id="main-content">
        <Suspense fallback={<PageLoader/>}><div key={section}className="route-transition"><Content section={section}/></div></Suspense>
      </main>
      <ERPAssistant section={section}/>
      <footer className="footer">ERP Comercial Perú © 2026 · Proyecto académico · Operaciones simuladas · Sin validez tributaria</footer>
    </div>
    {sidebarOpen&&<button type="button"className="mobile-backdrop"aria-label="Cerrar menú"onClick={closeSidebar}/>}
  </div>;
}
