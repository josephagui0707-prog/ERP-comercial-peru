import type {InventoryDocument,State} from '../../core/types';
import {uid} from '../../core/types';
export const DOCUMENT_TYPES=['Guía de productos','Orden de devolución','Orden del encargado general','Otro documento'];
export const MAX_FILE=1024*1024,MAX_TOTAL=3*1024*1024;
/** Small local demo attachments only. Persist bytes and metadata in the same commit as stock. */
export async function readAttachments(files:File[],kind:string,actor:string):Promise<InventoryDocument[]> {
  if(files.length>5)throw Error('Adjunta como máximo 5 archivos por operación.');
  return Promise.all(files.map(async file=>{
    if(file.size>MAX_FILE)throw Error(`${file.name}: máximo 1 MB por archivo.`);
    const header=new Uint8Array(await file.slice(0,8).arrayBuffer());
    const pdf=String.fromCharCode(...header.slice(0,5))==='%PDF-';
    const png=header.slice(0,8).join(',')==='137,80,78,71,13,10,26,10';
    const jpg=header[0]===255&&header[1]===216&&header[2]===255;
    if(!pdf&&!png&&!jpg)throw Error(`${file.name}: solo PDF, PNG o JPG válidos.`);
    const mime=pdf?'application/pdf':png?'image/png':'image/jpeg';
    const dataUrl=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).replace(/^data:[^;]+;/,`data:${mime};`));r.onerror=()=>reject(Error('No se pudo leer el archivo.'));r.readAsDataURL(file);});
    return {id:uid('DOC'),name:file.name,kind,mime,size:file.size,dataUrl,createdAt:new Date().toISOString(),actor,reference:'',movementIds:[]};
  }));
}
export function appendDocuments(s:State,documents:InventoryDocument[]) {
  const all=[...(s.inventoryDocuments??[]),...documents];
  if(new Set(all.map(d=>d.id)).size!==all.length)throw Error('Documento duplicado.');
  if(all.reduce((sum,d)=>sum+d.size,0)>MAX_TOTAL)throw Error('Límite local de documentos: 3 MB. Usa archivos más pequeños.');
  s.inventoryDocuments=all;
}
export function downloadDocument(d:InventoryDocument) {
  const bytes=atob(d.dataUrl.split(',')[1]);const blob=new Blob([Uint8Array.from(bytes,c=>c.charCodeAt(0))],{type:d.mime});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=d.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/** Remove the attachment and its links, retaining the stock ledger and an audit entry. */
export function deleteInventoryDocument(state:State,id:string,actor:string):State {
  const s=structuredClone(state),document=s.inventoryDocuments?.find(d=>d.id===id);
  if(!document)throw Error('El documento ya no existe. Actualiza la lista.');
  s.inventoryDocuments=s.inventoryDocuments!.filter(d=>d.id!==id);
  s.movements.forEach(m=>{if(m.documentIds?.includes(id))m.documentIds=m.documentIds.filter(documentId=>documentId!==id);});
  s.audit.unshift({id:uid('AUD'),date:new Date().toISOString(),action:'Documento de inventario eliminado',description:`${actor}: ${document.name} (${id}), referencia ${document.reference}. Movimientos conservados.`});
  return s;
}
