import UsersManagement from './UsersManagement';
import {PaginatedTable} from '../components/PaginatedTable';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {FormEvent} from 'react';
import {
  Activity,ArrowDownToLine,Check,CheckCircle2,ChevronRight,Cloud,Database,
  Globe2,HardDrive,Info,KeyRound,LockKeyhole,Mail,MapPin,Monitor,
  RotateCcw,Save,Server,Settings2,ShieldCheck,UserRound,X,LoaderCircle
} from 'lucide-react';
import {Panel,Field,Badge,Empty} from '../components/ui';
import {useStore} from '../core/store';
import {ROLE_NAMES} from '../core/permissions';
import {DEFAULT_SETTINGS} from '../features/administration/model';
import type {AdminSettings,CloudServiceId,EventCategory,SystemEvent} from '../features/administration/model';
import type {Audit} from '../core/types';

const SECTIONS:Record<string,{title:string;eyebrow:string;subtitle:string}>={
  usuarios:{title:'Usuarios y roles',eyebrow:'ADMINISTRACIÓN',subtitle:'Gestiona las cuentas que pueden acceder a esta demostración local.'},
  perfil:{title:'Mi perfil',eyebrow:'MI CUENTA',subtitle:'Información de la sesión y los permisos disponibles.'},
  configuracion:{title:'Configuración del sistema',eyebrow:'ADMINISTRACIÓN',subtitle:'Personaliza los datos de muestra y gestiona el entorno local.'},
  auditoria:{title:'Registro de actividad',eyebrow:'CONTROL Y TRAZABILIDAD',subtitle:'Historial de acciones en este navegador. No es una auditoría de seguridad real.'},
  cloud:{title:'Centro de infraestructura',eyebrow:'SIMULACIÓN CLOUD',subtitle:'Explora la arquitectura conceptual y prueba estados de servicios sin recursos externos.'},
};
const ICONS:Record<CloudServiceId,typeof Server>={compute:Server,database:Database,storage:HardDrive,identity:KeyRound};
const LABELS:Record<EventCategory,string>={sesion:'Sesión',configuracion:'Configuración',infraestructura:'Infraestructura',datos:'Datos'};

export default function Administration({section}:{section:string}){
  const meta=SECTIONS[section]??SECTIONS.perfil;
  return <div className="stack admin-page"><div className="heading"><div>
    <span className="eyebrow">{meta.eyebrow}</span><h1>{meta.title}</h1><p>{meta.subtitle}</p>
  </div><span className="env-pill"><span className="env-pulse"/> Entorno de demostración</span></div>
    {section==='usuarios'&&<UsersManagement/>}
    {section==='perfil'&&<Profile/>}
    {section==='configuracion'&&<Configuration/>}
    {section==='auditoria'&&<AuditTrail/>}
    {section==='cloud'&&<CloudConsole/>}
  </div>;
}
function Profile(){
  const {user,settings}=useStore();
  if(!user)return null;
  return <>
    <Panel title="Información de la cuenta"><div className="account-overview"><div className="account-symbol"><UserRound size={28}/></div>
      <div><h2>{user.name}</h2><p>{user.email}</p><span className="admin-tag"><ShieldCheck size={13}/> {ROLE_NAMES[user.role]}</span></div>
    </div><div className="admin-facts"><div><span><Mail size={15}/> Identificador</span><strong>{user.email}</strong></div>
      <div><span><LockKeyhole size={15}/> Tipo de acceso</span><strong>Cuenta de demostración</strong></div>
      <div><span><Globe2 size={15}/> Zona horaria</span><strong>{settings.timeZone}</strong></div>
      <div><span><Monitor size={15}/> Persistencia</span><strong>Almacenamiento del navegador</strong></div>
    </div></Panel>
    <Panel title="Alcance de la cuenta"><p className="admin-description">Este perfil permite explorar los siguientes espacios dentro de la demostración.</p>
      <div className="role-permissions">{[
        {label:'Gestión comercial',role:['admin','ventas'],text:'Clientes, cotizaciones, pedidos y cobros'},
        {label:'Gestión de inventario',role:['admin','almacen'],text:'Productos, almacenes y movimientos'},
        {label:'Gestión financiera',role:['admin','finanzas'],text:'Cuentas, indicadores y reportes'},
        {label:'Administración del ERP',role:['admin'],text:'Usuarios, configuración y registro de actividad'},
      ].map(p=><div key={p.label}className="permission-row"><span className="permission-check">{p.role.includes(user.role)?<Check size={16}/>:<X size={16}/>}</span>
        <span><b>{p.label}</b><small>{p.text}</small></span><span className="ms-auto"><Badge value={p.role.includes(user.role)?'Habilitado':'Sin acceso'}/></span></div>)}</div>
    </Panel><div className="admin-hint"><Info size={18}/> <span>Los perfiles y contraseñas son ficticios. Las restricciones de interfaz no sustituyen un servidor de autenticación y autorización.</span></div>
  </>;
}
function Configuration(){
  const {settings,saveSettings,state,reset}=useStore();
  const [draft,setDraft]=useState<AdminSettings>(settings);
  const [success,setSuccess]=useState(false);
  const [error,setError]=useState('');
  const [confirmReset,setConfirmReset]=useState(false);
  useEffect(()=>setDraft(settings),[settings]);
  const update=(key:keyof AdminSettings,value:string)=>setDraft(prev=>({...prev,[key]:value}));
  const submit=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setSuccess(false);setError('');
    if(!draft.tradeName.trim()||!draft.companyName.trim()||!draft.city.trim()){
      setError('Completa los campos obligatorios de la empresa.');return;
    }
    if(!/^\d{11}$/.test(draft.ruc)){
      setError('El RUC de ejemplo debe tener exactamente 11 números.');return;
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail)){
      setError('Ingresa un correo electrónico válido.');return;
    }
    saveSettings({...draft,companyName:draft.companyName.trim(),tradeName:draft.tradeName.trim(),
      city:draft.city.trim(),contactEmail:draft.contactEmail.trim(),phone:draft.phone.trim()});
    setSuccess(true);
  };
  return <>
    <Panel title="Datos de la empresa (ficticios)"><form onSubmit={submit}className="admin-form">
      <div className="form-grid"><Field label="Nombre comercial *"><input className="form-control"value={draft.tradeName}maxLength={60}onChange={e=>update('tradeName',e.target.value)}/></Field>
      <Field label="Razón social *"><input className="form-control"value={draft.companyName}maxLength={100}onChange={e=>update('companyName',e.target.value)}/></Field>
      <Field label="RUC de ejemplo *"><input className="form-control"inputMode="numeric"maxLength={11}value={draft.ruc}onChange={e=>update('ruc',e.target.value.replace(/\D/g,''))}/></Field>
      <Field label="Correo de contacto *"><input className="form-control"type="email"value={draft.contactEmail}onChange={e=>update('contactEmail',e.target.value)}/></Field>
      <Field label="Teléfono"><input className="form-control"maxLength={32}value={draft.phone}onChange={e=>update('phone',e.target.value)}/></Field>
      <Field label="Ciudad *"><input className="form-control"maxLength={60}value={draft.city}onChange={e=>update('city',e.target.value)}/></Field>
      <Field label="Moneda"><input className="form-control"value="Sol peruano (PEN)"disabled/></Field>
      <Field label="Zona horaria"><input className="form-control"value="America/Lima (UTC−05:00)"disabled/></Field></div>
      {error&&<p className="alert alert-danger mt-3"role="alert">{error}</p>}
      {success&&<p className="alert alert-success mt-3"role="status"><CheckCircle2 size={15}className="me-2"/>Configuración guardada en este navegador.</p>}
      <div className="admin-actions"><button type="button"className="btn btn-outline-secondary"onClick={()=>{setDraft(DEFAULT_SETTINGS);setSuccess(false);setError('');}}>Recuperar valores originales</button>
      <button type="submit"className="btn btn-primary primary"><Save size={16}/> Guardar cambios</button></div>
    </form></Panel>
    <Panel title="Datos de demostración"><div className="admin-metrics">
      <div><b>{state.clients.length}</b><span>Clientes</span></div><div><b>{state.products.length}</b><span>Productos</span></div>
      <div><b>{state.sales.length}</b><span>Ventas</span></div><div><b>{state.warehouses.length}</b><span>Almacenes</span></div>
    </div><div className="admin-danger-zone"><div><strong>Restaurar datos empresariales</strong><p>Reemplaza ventas, compras y demás registros con los originales de muestra. No modifica el perfil ni los ajustes de infraestructura.</p></div>
      <button type="button"className="btn btn-outline-danger"onClick={()=>setConfirmReset(true)}><RotateCcw size={16}/> Restablecer registros</button></div>
    </Panel>
    {confirmReset&&<div className="erp-modal-backdrop"role="presentation"onMouseDown={e=>{if(e.target===e.currentTarget)setConfirmReset(false)}}><div className="admin-dialog"role="alertdialog"aria-modal="true"aria-labelledby="reset-title"aria-describedby="reset-description">
      <button type="button"className="admin-dialog-close"aria-label="Cerrar diálogo"onClick={()=>setConfirmReset(false)}><X size={18}/></button>
      <span className="admin-dialog-icon"><RotateCcw size={24}/></span><h2 id="reset-title">¿Restablecer los datos?</h2><p id="reset-description">Se descartarán los cambios de operaciones almacenados en este navegador. Esta acción no se puede deshacer.</p>
      <div className="admin-dialog-actions"><button type="button"className="btn btn-outline-secondary"onClick={()=>setConfirmReset(false)}>Cancelar</button>
        <button type="button"className="btn btn-danger"onClick={()=>{reset();setConfirmReset(false);}}>Sí, restablecer</button></div>
    </div></div>}
  </>;
}
type AuditRow={id:string;date:string;action:string;description:string;category:string;actor:string};
function businessEntry(a:Audit):AuditRow{return {id:a.id,date:a.date,action:a.action,description:a.description,category:'Operación',actor:'Registro empresarial'};}
function systemEntry(a:SystemEvent):AuditRow{return {...a,category:LABELS[a.category]};}
function formatDate(input:string):string{
  const date=new Date(input.length===10?input+'T12:00:00':input);
  return Number.isNaN(date.getTime())?input:new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:input.length>10?'short':undefined,timeZone:'America/Lima'}).format(date);
}
function exportAuditCSV(rows:AuditRow[]):void{
  const safe=(value:string)=>{
    const text=/^[=+@\-\t\r]/.test(value)?"'"+value:value;
    return '"'+text.replace(/"/g,'""')+'"';
  };
  const lines=[['Fecha','Actor','Categoría','Acción','Descripción'].map(safe).join(';'),
    ...rows.map(r=>[r.date,r.actor,r.category,r.action,r.description].map(safe).join(';'))];
  const data='\uFEFF'+lines.join('\r\n');
  const url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='erp-peru-actividad-demo.csv';a.click();
  URL.revokeObjectURL(url);
}
function AuditTrail(){
  const {events,state}=useStore();
  const [query,setQuery]=useState('');const [filter,setFilter]=useState('todas');
  const [from,setFrom]=useState('');const [to,setTo]=useState('');
  const rows=useMemo<AuditRow[]>(()=>[
    ...events.map(systemEntry),...state.audit.map(businessEntry)
  ].sort((a,b)=>b.date.localeCompare(a.date)),[events,state.audit]);
  const visible=useMemo(()=>rows.filter(r=>(!from||r.date.slice(0,10)>=from)&&(!to||r.date.slice(0,10)<=to)&&(filter==='todas'||r.category===filter)&&
    [r.actor,r.action,r.description,r.category].join(' ').toLowerCase().includes(query.trim().toLowerCase())),[rows,query,filter,from,to]);
  return <>
    <div className="admin-hint"><ShieldCheck size={18}/><span>Este historial combina eventos locales de sesión y ajustes con las acciones de negocio registradas. Se puede editar desde las herramientas del navegador.</span></div>
    <Panel title="Movimientos registrados"actions={<button className="btn btn-sm btn-outline-primary"type="button"disabled={!visible.length}onClick={()=>exportAuditCSV(visible)}><ArrowDownToLine size={15}/> Descargar CSV</button>}>
      <div className="admin-filters"><label><span>Buscar actividad</span><input className="form-control"placeholder="Usuario, acción o descripción"value={query}onChange={e=>setQuery(e.target.value)}/></label>
        <label><span>Tipo de evento</span><select className="form-select"value={filter}onChange={e=>setFilter(e.target.value)}>
          <option value="todas">Todos los eventos</option><option value="Operación">Operaciones</option>
          {Object.entries(LABELS).map(([id,label])=><option value={label}key={id}>{label}</option>)}
        </select></label></div>
      <div className="dashboard-filters"><label>Desde<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label><button className="btn btn-outline-secondary" onClick={()=>{setFrom('');setTo('');setQuery('');setFilter('todas')}}>Limpiar filtros</button></div>
      <p className="admin-result-count">{visible.length} de {rows.length} registros · Paginación disponible</p>
      <PaginatedTable><table className="table table-hover align-middle erp-table"><thead><tr>
        <th>Fecha</th><th>Tipo</th><th>Evento</th><th>Usuario / origen</th><th>Detalle</th>
      </tr></thead><tbody>{visible.map(r=><tr key={r.id}><td>{formatDate(r.date)}</td><td><span className="admin-category">{r.category}</span></td>
        <td><b>{r.action}</b></td><td>{r.actor}</td><td className="admin-description-cell">{r.description}</td></tr>)}</tbody></table></PaginatedTable>{!visible.length&&<Empty message="No se encontraron eventos con los filtros seleccionados."/>}
      
    </Panel>
  </>;
}
export function CloudConsole(){
  const {cloudServices,toggleCloudService,resetCloud,events}=useStore();
  const [pending,setPending]=useState<CloudServiceId|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const change=(id:CloudServiceId)=>{
    if(pending)return;
    setPending(id);
    timer.current=setTimeout(()=>{toggleCloudService(id);setPending(null);},500);
  };
  const active=cloudServices.filter(s=>s.status==='activo').length;
  const cloudEvents=events.filter(x=>x.category==='infraestructura').slice(0,4);
  return <>
    <div className="admin-hint"><Info size={18}/><span>Arquitectura ilustrativa inspirada en AWS. Los interruptores solo cambian el estado visual de la demo; no aprovisionan, detienen ni consultan servicios reales.</span></div>
    <div className="cloud-hero"><div><span className="cloud-hero-overline"><Activity size={15}/> LABORATORIO DE INFRAESTRUCTURA</span>
      <h2>Arquitectura de servicios</h2><p>Explora las dependencias de una plataforma empresarial en una representación conceptual.</p>
      <div className="cloud-hero-meta"><span><MapPin size={15}/> Región de referencia: Sudamérica</span><span><Globe2 size={15}/> Solo navegador</span></div>
    </div><div className="cloud-gauge"><strong>{active}<span>/4</span></strong><small>Servicios habilitados</small><div className="cloud-gauge-bars">{cloudServices.map(x=><i key={x.id}className={x.status==='activo'?'on':''}/>)}</div></div></div>
    <Panel title="Mapa de componentes"><div className="cloud-diagram"><div className="cloud-client"><Monitor size={22}/><div><b>ERP Comercial Perú</b><small>Interfaz del navegador</small></div></div>
      <div className="cloud-connector"/><div className="cloud-service-grid">{cloudServices.map(service=>{
        const Icon=ICONS[service.id];const running=service.status==='activo';return <div className={'cloud-service-card'+(running?' service-active':'')}key={service.id}>
          <div className="cloud-service-top"><span className="cloud-service-icon"><Icon size={22}/></span><span className={'service-indicator'+(running?' on':'')}>{running?'Activo':'Detenido'}</span></div>
          <h3>{service.name}</h3><p>{service.summary}</p><small>{service.provider}</small>
          <button type="button"className="cloud-service-toggle"disabled={pending!==null}onClick={()=>change(service.id)}aria-label={`${running?'Detener':'Activar'} ${service.name} en el simulador`}>
            {pending===service.id?<LoaderCircle className="admin-spin"size={14}/>:running?<Settings2 size={14}/>:<Check size={14}/>} {pending===service.id?'Aplicando escenario…':running?'Detener simulación':'Activar simulación'}
            <ChevronRight size={14}/>
          </button>
        </div>})}</div></div><div className="admin-actions"><span className="admin-description">La configuración del escenario se conserva localmente.</span><button type="button"className="btn btn-outline-secondary btn-sm"disabled={pending!==null}onClick={resetCloud}><RotateCcw size={15}/> Reactivar todos</button></div></Panel>
    <Panel title="Actividad del laboratorio"><div className="cloud-event-list">{cloudEvents.length?cloudEvents.map(e=><div className="cloud-event"key={e.id}><span className="cloud-event-icon"><Activity size={16}/></span><div><b>{e.action}</b><p>{e.description}</p></div><time>{formatDate(e.date)}</time></div>):
      <div className="empty"><Cloud size={22}className="mb-2"/><p className="mb-0">Interactúa con un servicio para ver aquí los cambios del escenario.</p></div>}</div></Panel>
  </>;
}
