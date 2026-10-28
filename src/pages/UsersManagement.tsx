import Dialog from '../components/Dialog';
import {useState} from 'react';
import type {FormEvent} from 'react';
import {useStore} from '../core/store';
import type {Account} from '../core/store';
import type {Role} from '../core/types';
import {ROLE_NAMES,allowed} from '../core/permissions';
import {ALL_MODULES} from '../layout/navigation';
import {Panel,Field} from '../components/ui';
import {PaginatedTable} from '../components/PaginatedTable';

type Draft=Account & {password:string};
const blank=():Draft=>({id:crypto.randomUUID(),name:'',email:'',phone:'',role:'ventas',active:true,password:''});
export default function UsersManagement(){
  const {users,saveUser,user}=useStore();
  const [draft,setDraft]=useState<Draft|null>(null);
  const [confirming,setConfirming]=useState(false);
  const [query,setQuery]=useState('');const [role,setRole]=useState('');const [status,setStatus]=useState('');
  const [error,setError]=useState('');const [message,setMessage]=useState('');
  const editing=users.some(u=>u.id===draft?.id);
  const visible=users.filter(u=>(!role||u.role===role)&&(!status||String(u.active)===status)&&`${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()));
  const persist=()=>{if(!draft)return;try{saveUser(draft);setMessage(editing?'Usuario actualizado.':'Usuario creado. Ya puede iniciar sesión en este navegador.');setDraft(null);setConfirming(false);setError('');}catch(e){setConfirming(false);setError((e as Error).message);}};
  const submit=(e:FormEvent)=>{e.preventDefault();if(!draft)return;setError('');if(editing)setConfirming(true);else persist();};
  const original=users.find(u=>u.id===draft?.id);
  const changes=draft&&original?[
    {label:'Nombre',before:original.name,after:draft.name},
    {label:'Correo',before:original.email,after:draft.email},
    {label:'Teléfono',before:original.phone||'—',after:draft.phone||'—'},
    {label:'Rol',before:ROLE_NAMES[original.role],after:ROLE_NAMES[draft.role]},
    {label:'Estado',before:original.active?'Activo':'Inactivo',after:draft.active?'Activo':'Inactivo'},
  ].filter(c=>c.before!==c.after):[];
  return <>
    <p className="admin-hint">Cuentas de demostración guardadas en este navegador. Utiliza datos y contraseñas ficticios; no se sincronizan entre dispositivos.</p>
    {message&&<p className="alert alert-success" role="status">{message}</p>}
    <Panel title="Directorio de usuarios" actions={<button className="btn btn-primary" onClick={()=>{setDraft(blank());setError('');setMessage('')}}>Nuevo usuario</button>}>
      <div className="dashboard-filters"><label>Buscar<input value={query} placeholder="Nombre o correo" onChange={e=>setQuery(e.target.value)}/></label><label>Rol<select value={role} onChange={e=>setRole(e.target.value)}><option value="">Todos</option>{Object.entries(ROLE_NAMES).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label><label>Estado<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option><option value="true">Activo</option><option value="false">Inactivo</option></select></label></div>
      <p className="admin-description">{visible.length} usuarios · {users.filter(u=>u.active).length} activos en total</p>
      <PaginatedTable><table className="table erp-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{visible.map(u=><tr key={u.id}><td>{u.name}{u.id===user?.id?' (Tú)':''}</td><td>{u.email}</td><td>{u.phone||'—'}</td><td>{ROLE_NAMES[u.role]}</td><td>{u.active?'Activo':'Inactivo'}</td><td><button className="btn btn-sm btn-outline-primary" onClick={()=>{setDraft({...u,password:''});setError('');setMessage('')}}>Editar</button></td></tr>)}</tbody></table></PaginatedTable>
      {!visible.length&&<p>No hay usuarios con estos filtros.</p>}
    </Panel>
    {draft&&<Dialog title={confirming?'Confirmar cambios':editing?'Editar usuario':'Crear usuario'} confirm={confirming} onClose={()=>{if(confirming)setConfirming(false);else setDraft(null)}}>
      {confirming?<><p>Revisa los cambios de <strong>{original?.name}</strong> antes de guardarlos.</p>
        <div className="user-change-list">{changes.map(c=><div key={c.label}><strong>{c.label}</strong><span>{c.before} → <b>{c.after}</b></span></div>)}{draft.password&&<div><strong>Contraseña</strong><span>Se reemplazará la contraseña actual.</span></div>}{!changes.length&&!draft.password&&<p>No hay cambios que guardar.</p>}</div>
        <div className="admin-actions"><button autoFocus type="button" className="btn btn-outline-secondary" onClick={()=>setConfirming(false)}>Volver a editar</button><button type="button" className="btn btn-primary" disabled={!changes.length&&!draft.password} onClick={persist}>Confirmar y guardar</button></div>
      </>:<form onSubmit={submit}>
      <div className="form-grid"><Field label="Nombre completo *"><input autoFocus required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></Field>
      <Field label="Correo de acceso *"><input required type="email" maxLength={150} value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></Field>
      <Field label="Teléfono"><input type="tel" maxLength={25} value={draft.phone} onChange={e=>setDraft({...draft,phone:e.target.value})}/></Field>
      <Field label="Rol *"><select disabled={draft.id===user?.id} value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value as Role})}>{Object.entries(ROLE_NAMES).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></Field>
      <Field label={editing?'Nueva contraseña (vacío = conservar)':'Contraseña ficticia *'}><input type="password" autoComplete="new-password" required={!editing} minLength={8} maxLength={100} value={draft.password} onChange={e=>setDraft({...draft,password:e.target.value})}/></Field>
      <Field label="Estado"><select disabled={draft.id===user?.id} value={String(draft.active)} onChange={e=>setDraft({...draft,active:e.target.value==='true'})}><option value="true">Activo</option><option value="false">Inactivo</option></select></Field></div>
      <p className="admin-description">Mínimo 8 caracteres. Una cuenta inactiva no puede iniciar sesión. Tu propia cuenta conserva el rol de administrador y su estado activo.</p>
      <details><summary>Módulos habilitados para {ROLE_NAMES[draft.role]}</summary><p>{ALL_MODULES.filter(m=>allowed(draft.role,m.path)).map(m=>m.label).join(' · ')}</p></details>
      {error&&<p className="alert alert-danger" role="alert">{error}</p>}
      <div className="admin-actions"><button type="button" className="btn btn-outline-secondary" onClick={()=>setDraft(null)}>Cancelar</button><button className="btn btn-primary" type="submit">Guardar usuario</button></div>
    </form>}</Dialog>}
  </>;
}
