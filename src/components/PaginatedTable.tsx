import {Children,cloneElement,isValidElement,useState} from 'react';
import type {ReactElement,ReactNode} from 'react';

/** Pagination without duplicating CRUD business rules: existing table rows remain React-owned. */
export function PaginatedTable({children,pageSize=10}:{children:ReactElement<{children?:ReactNode}>;pageSize?:number}){
  const [page,setPage]=useState(1);
  const [size,setSize]=useState(pageSize);
  const parts=Children.toArray(children.props.children) as ReactNode[];
  const body=parts.find(node=>isValidElement(node)&&node.type==='tbody');
  if(!isValidElement<{children?:ReactNode}>(body))return <div className="table-wrap table-responsive">{children}</div>;
  const records=Children.toArray(body.props.children);
  const pages=Math.max(1,Math.ceil(records.length/size));
  const current=Math.min(page,pages);
  const from=(current-1)*size;
  const newBody=cloneElement(body,{},records.slice(from,from+size));
  const table=cloneElement(children,{},...parts.map(node=>node===body?newBody:node));
  return <div className="erp-paged-grid"><div className="table-wrap table-responsive">{table}</div><div className="erp-page-footer"><span>{records.length?`Mostrando ${from+1}–${Math.min(from+size,records.length)} de ${records.length}`:'Sin registros'}</span><label>Filas <select aria-label="Registros por página" value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1);}}>{[10,20,50].map(n=><option key={n} value={n}>{n}</option>)}</select></label><button type="button" className="btn btn-sm btn-outline-secondary" disabled={current<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button><span aria-live="polite">{current} / {pages}</span><button type="button" className="btn btn-sm btn-outline-secondary" disabled={current>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>Siguiente</button></div></div>;
}
