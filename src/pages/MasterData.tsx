import {useMemo,useRef,useState} from 'react';
import {NavLink} from 'react-router-dom';
import {ArrowRight,Database,Download,FileSpreadsheet,Upload,CheckCircle2,AlertTriangle,X} from 'lucide-react';
import {useStore} from '../core/store';
import {allowed} from '../core/permissions';
import {MASTER_MODULES} from '../layout/navigation';
import {importSchema,planImport,readImport} from '../core/importXlsx';
import type {ImportData,SheetName} from '../core/importXlsx';
import '../styles/master-data.css';

export default function MasterData(){
  const {state,update,user}=useStore();
  const [data,setData]=useState<ImportData|null>(null),[filename,setFilename]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[tab,setTab]=useState<SheetName>('Clientes'),[page,setPage]=useState(0);
  const request=useRef(0),fileInput=useRef<HTMLInputElement>(null);
  const plan=useMemo(()=>data?planImport(data,state):null,[data,state]);
  const count:Record<string,number>={clientes:state.clients.length,productos:state.products.filter(p=>!p.archivedAt).length,categorias:new Set([...(state.categories??[]),...state.products.map(p=>p.category)]).size,proveedores:state.suppliers.length,almacenes:state.warehouses.length};
  const descriptions:Record<string,string>={clientes:'Contactos, documentos y segmentos comerciales.',productos:'Precios, costos y referencias del catálogo.',categorias:'Organización del catálogo de productos.',proveedores:'Socios de abastecimiento y sus documentos.',almacenes:'Ubicaciones para controlar tus existencias.'};
  const modules=MASTER_MODULES.filter(m=>user&&allowed(user.role,m.path));
  const read=async(file?:File)=>{
    const token=++request.current;setData(null);setError('');setSuccess('');setFilename(file?.name??'');if(!file)return;
    if(!/\.xlsx$/i.test(file.name)){setError('Selecciona un archivo .xlsx.');return;}
    if(file.size>5*1024*1024){setError('El archivo supera 5 MB. Divide la carga.');return;}
    setBusy(true);
    try{const parsed=readImport(await file.arrayBuffer());if(token!==request.current)return;setData(parsed);setTab((Object.keys(parsed.counts).find(k=>parsed.counts[k]>0)??'Clientes') as SheetName);setPage(0);}catch(e){if(token===request.current)setError(`No se pudo leer el XLSX. ${(e as Error).message}`);}finally{if(token===request.current)setBusy(false);}
  };
  const commit=()=>{
    if(!data||user?.role!=='admin')return;setError('');setSuccess('');setBusy(true);
    try{let total=0;update(current=>{const checked=planImport(data,current);if(checked.errors.length)throw Error(checked.errors[0]);total=checked.rows.length;return checked.next;});setSuccess(`Importación completada: ${total} filas guardadas correctamente. Los módulos y reportes ya muestran los nuevos registros.`);setData(null);setFilename('');if(fileInput.current)fileInput.current.value='';}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  const preview=data?.rows.filter(r=>r.sheet===tab)??[];
  return <div className="stack master-page">
    <header className="heading"><div><span className="eyebrow">MANTENIMIENTO</span><h1>Datos maestros</h1><p>Organiza tus catálogos y carga la información de tu negocio desde un solo lugar.</p></div><span className="master-local"><Database size={16}/> Guardado en este navegador</span></header>
    <section className="master-import" aria-labelledby="import-title"><div className="master-import-copy"><span className="master-icon"><FileSpreadsheet size={26}/></span><div><h2 id="import-title">Importar datos desde Excel</h2><p>Catálogos, stock inicial, compras, cotizaciones, pedidos, ventas, cobros, devoluciones y caja. Revisa la vista previa antes de confirmar.</p><small>La carga agrega registros. No reemplaza datos existentes. Máximo 5 MB y 10 000 filas.</small></div></div>
      <div className="master-actions"><a className="btn btn-outline-secondary" href="/plantillas/ERP_Datos_Importacion.xlsx" download><Download size={16}/> Descargar XLSX de ejemplo</a>{user?.role==='admin'&&<label role="button" tabIndex={busy?-1:0} aria-disabled={busy} onKeyDown={e=>{if(!busy&&(e.key==='Enter'||e.key===' ')){e.preventDefault();fileInput.current?.click();}}} className={'btn btn-primary '+(busy?'disabled':'')}><Upload size={16}/> {busy?'Validando archivo…':'Importar datos XLSX'}<input ref={fileInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Seleccionar archivo XLSX" disabled={busy} onChange={e=>void read(e.target.files?.[0])} hidden/></label>}</div>
      {user?.role!=='admin'&&<p className="muted">La importación masiva está disponible para el administrador.</p>}
    </section>
    {busy&&<p role="status">Procesando el archivo. Espera un momento…</p>}
    {error&&<div className="alert alert-danger" role="alert">{error}</div>}
    {success&&<div className="alert alert-success" role="status"><CheckCircle2 size={18}/> {success}</div>}
    {data&&plan&&<section className="master-preview" aria-labelledby="preview-title"><div className="master-preview-heading"><div><span className="eyebrow">VISTA PREVIA · SIN GUARDAR</span><h2 id="preview-title">{filename}</h2><p>{data.rows.length} filas · {Object.values(data.counts).filter(Boolean).length} hojas con datos · {plan.newMovements} movimientos previstos</p></div><button className="btn btn-outline-secondary" aria-label="Cancelar importación" onClick={()=>{setData(null);setFilename('');if(fileInput.current)fileInput.current.value='';}}><X size={16}/> Cancelar</button></div>
      {plan.errors.length>0?<div className="alert alert-danger" role="alert"><strong><AlertTriangle size={17}/> Corrige {plan.errors.length} errores para continuar. No se ha guardado ningún dato.</strong><ul>{plan.errors.slice(0,60).map((e,i)=><li key={i}>{e}</li>)}</ul>{plan.errors.length>60&&<p>Se muestran los primeros 60 errores. Corrige el archivo y vuelve a seleccionarlo.</p>}</div>:<div className="alert alert-success"><CheckCircle2 size={17}/> Validación correcta. Revisa los registros y confirma la carga.</div>}
      <div className="master-sheet-tabs" role="tablist" aria-label="Hojas del archivo">{Object.entries(data.counts).filter(([,n])=>n>0).map(([name,n])=><button key={name} role="tab" aria-selected={tab===name} className={'btn '+(tab===name?'btn-primary':'btn-outline-secondary')} onClick={()=>{setTab(name as SheetName);setPage(0);}}>{name} <b>{n}</b></button>)}</div>
      <div className="master-table-scroll"><table className="table table-hover"><thead><tr><th>Fila</th>{importSchema[tab].map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{preview.slice(page*10,page*10+10).map(r=><tr key={r.line}><td>{r.line}</td>{importSchema[tab].map(c=><td key={c}>{String(r.data[c]??'')}</td>)}</tr>)}</tbody></table></div>
      <div className="master-preview-footer"><div className="master-actions"><button className="btn btn-outline-secondary" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>{preview.length?`${page*10+1}–${Math.min((page+1)*10,preview.length)} de ${preview.length}`:'Sin filas'}</span><button className="btn btn-outline-secondary" disabled={(page+1)*10>=preview.length} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div><button className="btn btn-primary" disabled={busy||!!plan.errors.length} onClick={commit}><CheckCircle2 size={17}/> Confirmar importación de {data.rows.length} filas</button></div>
      <p className="muted">La confirmación guarda toda la carga en una sola operación. Los IDs, documentos, SKU y existencias iniciales duplicados bloquean la importación completa.</p>
    </section>}
    <div className="master-section-heading"><div><h2>Catálogos del negocio</h2><p>Selecciona un catálogo para consultar, crear o editar sus registros.</p></div><span>{modules.length} catálogos disponibles</span></div>
    <div className="master-grid">{modules.map(({path,label,icon:Icon})=><NavLink to={'/'+path} className={'master-card master-'+path} key={path}><div className="master-card-top"><span className="master-icon"><Icon size={24}/></span><span className="master-count">{count[path].toLocaleString('es-PE')}</span></div><h3>{label}</h3><p>{descriptions[path]}</p><span className="master-card-link">Administrar {label.toLowerCase()} <ArrowRight size={17}/></span></NavLink>)}</div>
    {!modules.length&&<p className="alert alert-info">Tu rol no tiene catálogos de mantenimiento asignados.</p>}
    <section className="master-summary"><div><h2>Estado de la información</h2><p>{state.products.length?'Distribución de productos por categoría':'Comienza importando el archivo XLSX o creando tus primeros registros.'}</p></div><div className="master-bars">{Array.from(new Set(state.products.map(p=>p.category))).map(category=>{const n=state.products.filter(p=>p.category===category).length;return <div key={category}><span>{category}</span><meter min={0} max={Math.max(1,state.products.length)} value={n}>{n}</meter><b>{n}</b></div>;})}</div><p className="muted">{state.inventory.reduce((sum,x)=>sum+x.quantity,0).toLocaleString('es-PE')} unidades en inventario · {state.sales.length} ventas · {state.purchases.length} compras</p></section>
  </div>;
}
