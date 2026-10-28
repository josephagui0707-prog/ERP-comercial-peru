import {useEffect,useRef,useState} from 'react';
import type {InventoryDocument} from '../../core/types';
import {useStore} from '../../core/store';
import {Modal} from './Modal';
import {PdfPreview} from './PdfPreview';
import {readAttachments,DOCUMENT_TYPES} from './documents';

/** Blob URLs are scoped to this preview and released when it closes or changes file. */
export function DocumentPreview({document:d}:{document:InventoryDocument}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{
    const bytes=atob(d.dataUrl.split(',')[1]);
    const next=URL.createObjectURL(new Blob([Uint8Array.from(bytes,c=>c.charCodeAt(0))],{type:d.mime}));
    setUrl(next);return ()=>URL.revokeObjectURL(next);
  },[d.dataUrl,d.mime]);
  return <div className="inv-document-preview">{url&&(d.mime==='application/pdf'?<PdfPreview key={d.id} dataUrl={d.dataUrl}/>:<img src={url} alt={`Vista previa de ${d.name}`}/>)}<p>{d.name} · {(d.size/1024).toFixed(0)} KB</p></div>;
}
export function AttachmentFields({files,setFiles,kind,setKind,onPendingChange}:{onPendingChange:(pending:boolean)=>void;files:File[];setFiles:(f:File[])=>void;kind:string;setKind:(k:string)=>void}) {
  const {user}=useStore(),input=useRef<HTMLInputElement>(null),version=useRef(0);
  const [pending,setPending]=useState<{files:File[];documents:InventoryDocument[]}|null>(null);
  const [index,setIndex]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>()=>{version.current++;},[]);
  useEffect(()=>{onPendingChange(busy||!!pending);},[busy,pending,onPendingChange]);
  const discard=()=>{setPending(null);if(input.current)input.current.value='';};
  const inspect=async(selected:File[])=>{
    if(!selected.length)return;
    const ticket=++version.current;onPendingChange(true);setBusy(true);setError('');
    try{const documents=await readAttachments(selected,kind,user?.name??'Usuario local');if(ticket!==version.current)return;setIndex(0);setPending({files:selected,documents});}
    catch(e){if(ticket===version.current){setError(e instanceof Error?e.message:'No se pudo abrir el archivo.');if(input.current)input.current.value='';}}
    finally{if(ticket===version.current)setBusy(false);}
  };
  return <div className="inv-attachment"><label className="field">Tipo de documento<select className="form-select" value={kind} onChange={e=>setKind(e.target.value)}>{DOCUMENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
    <input ref={input} hidden type="file" accept=".pdf,.png,.jpg,.jpeg" multiple onChange={e=>void inspect(Array.from(e.target.files??[]))}/>
    <button type="button" className="btn mini" disabled={busy} onClick={()=>input.current?.click()}>{busy?'Preparando vista previa…':'＋ Subir guía u orden'}</button>
    {error&&<div className="alert alert-danger" role="alert">{error}</div>}
    <ul>{files.map((f,i)=><li key={`${f.name}-${i}`}>{f.name} ({(f.size/1024).toFixed(0)} KB) <button type="button" className="btn mini" onClick={()=>void inspect(files)}>Vista previa</button> <button type="button" className="btn mini" aria-label={`Quitar ${f.name}`} onClick={()=>{setFiles(files.filter((_,j)=>j!==i));if(input.current)input.current.value='';}}>Quitar</button></li>)}</ul>
    <p className="inv-note">PDF, PNG o JPG. Máximo 1 MB por archivo y 3 MB en total. Revisa la vista previa y acepta los archivos; se guardarán al confirmar la operación.</p>
    {pending&&<Modal title="Vista previa antes de adjuntar" onClose={discard}><div className="inv-form"><p>Revisa los documentos antes de aceptarlos.</p>{pending.documents.length>1&&<label className="field">Archivo<select className="form-select" aria-label="Archivo de la vista previa" value={index} onChange={e=>setIndex(Number(e.target.value))}>{pending.documents.map((d,i)=><option key={d.id} value={i}>{d.name}</option>)}</select></label>}
      <DocumentPreview document={pending.documents[index]}/><div className="inv-actions"><button type="button" className="btn mini" onClick={discard}>Cancelar selección</button><button type="button" className="btn inv-primary" onClick={()=>{setFiles(pending.files);discard();}}>Aceptar {pending.files.length===1?'archivo':`${pending.files.length} archivos`}</button></div></div></Modal>}
  </div>;
}
