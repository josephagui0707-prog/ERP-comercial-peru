import {useNavigate} from 'react-router-dom';
import {useState} from 'react';
import {useStore} from '../../core/store';
import {createThirdParty} from './service';
import {Modal} from './Modal';
import {RecordPicker} from '../../components/RecordPicker';
export function ThirdPartyPicker({kind,value,onChange,onKindChange,onCreateClient}:{onCreateClient?:()=>void;kind:'cliente'|'proveedor';value:string;onChange:(v:string)=>void;onKindChange:(v:'cliente'|'proveedor')=>void}) {
  const {state,update}=useStore(),navigate=useNavigate();
  const [creating,setCreating]=useState(false),[name,setName]=useState(''),[doc,setDoc]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const options=kind==='cliente'?state.clients.filter(c=>c.active).map(c=>({id:c.id,name:c.name,doc:c.document})):state.suppliers.map(c=>({id:c.id,name:c.name,doc:c.ruc}));
  return <div className="inv-party"><label className="field">Tipo de tercero<select className="form-select" value={kind} onChange={e=>{onKindChange(e.target.value as typeof kind);onChange('');}}><option value="cliente">Cliente</option><option value="proveedor">Proveedor</option></select></label>
    <RecordPicker label={kind==='cliente'?'Cliente':'Proveedor'} rows={options} value={value} onChange={onChange} getId={r=>r.id} getLabel={r=>r.name} columns={[{label:'Código',value:r=>r.id},{label:'Nombre o razón social',value:r=>r.name},{label:'RUC / DNI',value:r=>r.doc,search:r=>r.doc}]} details={r=><span>{r.id} · {r.doc}</span>}/>
    <button className="btn mini" type="button" onClick={()=>{if(kind==='cliente'){onCreateClient?.();navigate('/clientes');return;}setName('');setDoc('');setError('');setCreating(true);}}>＋ Nuevo {kind}</button>
    {creating&&<Modal title={`Nuevo ${kind}`} busy={busy} onClose={()=>setCreating(false)}><div className="inv-form"><p>Se seleccionará automáticamente sin perder el movimiento en curso.</p>{error&&<div role="alert" className="alert alert-danger">{error}</div>}<label className="field">Nombre / razón social<input autoFocus className="form-control" value={name} onChange={e=>setName(e.target.value)}/></label><label className="field">RUC<input className="form-control" inputMode="numeric" maxLength={11} value={doc} onChange={e=>setDoc(e.target.value)}/></label><div className="inv-actions"><button type="button" className="btn mini" disabled={busy} onClick={()=>setCreating(false)}>Cancelar</button><button type="button" className="btn inv-primary" disabled={busy} onClick={()=>{setBusy(true);setError('');try{let id='';update(s=>{const result=createThirdParty(s,kind,name,doc);id=result.id;return result.state;});onChange(id);setCreating(false);}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}}}>{busy?'Guardando…':'Guardar y seleccionar'}</button></div></div></Modal>}
  </div>;
}
