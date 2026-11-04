import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Eye,EyeOff,LockKeyhole,Truck,Radio} from 'lucide-react';
import {useStore} from '../core/store';
import {api} from '../core/api';
import {homeFor} from '../core/permissions';
type Access={email:string;name:string;password:string;role:string};
export default function Login(){
  const {login}=useStore(),navigate=useNavigate();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[tenant,setTenant]=useState('AULA');
  const [show,setShow]=useState(false),[remember,setRemember]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[accounts,setAccounts]=useState<Access[]>([]);
  useEffect(()=>{api<{tenant:string;accounts:Access[]}>('/info').then(info=>{setAccounts(info.accounts);setTenant(info.tenant);}).catch(e=>setError(e.message));},[]);
  const choose=(a:Access)=>{setEmail(a.email);setPassword(a.password);setError('');};
  return <main className="login-screen"><div className="login-promo"><div className="logo-large"><img src="/brand/erp-logo.png" width="54" height="54" alt=""/> ERP COMERCIAL PERÚ</div><h1>Del pedido a la puerta.</h1><p>Coordina la venta, prepara el despacho y acompaña cada entrega hasta su destino.</p><div className="promo-note">OPERACIONES · INVENTARIO · DISTRIBUCIÓN</div></div>
    <div className="login-pane"><form className="login-card" onSubmit={async e=>{e.preventDefault();if(busy)return;setError('');setBusy(true);try{const u=await login(email,password,remember,tenant);navigate(homeFor(u.role),{replace:true});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
      <span className="login-icon"><LockKeyhole/></span><h2>Ingresar al ERP</h2><p>Usa la cuenta asignada por tu administrador.</p>
      <label>Organización<input className="form-control" required maxLength={40} autoComplete="organization" value={tenant} onChange={e=>setTenant(e.target.value.toUpperCase())}/></label>
      <label>Correo electrónico<input className="form-control" required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Contraseña<div className="password"><input className="form-control" required autoComplete="current-password" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" onClick={()=>setShow(!show)} aria-label="Mostrar u ocultar contraseña">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
      <label className="checkline"><input type="checkbox" className="form-check-input" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Mantener sesión en este navegador</label>
      {error&&<p className="alert alert-danger" role="alert">{error}</p>}<button className="btn btn-primary full" disabled={busy}>{busy?'Ingresando…':'Iniciar sesión'}</button>
      {!!accounts.length&&<div className="demo-info"><b>Accesos para la clase</b><small>Elige un perfil y pulsa Iniciar sesión.</small><div className="d-flex gap-2 flex-wrap">{accounts.filter(a=>['repartidor','monitor','admin'].includes(a.role)).map(a=><button key={a.role} type="button" className="btn btn-sm btn-outline-primary" onClick={()=>choose(a)}>{a.role==='repartidor'?<><Truck size={15}/> Repartidor</>:a.role==='monitor'?<><Radio size={15}/> Monitor</>:'Administración'}</button>)}</div><details><summary>Ver todos los accesos</summary>{accounts.map(a=><small key={a.email}>{a.email} · {a.password}</small>)}</details></div>}
    </form></div></main>;
}
