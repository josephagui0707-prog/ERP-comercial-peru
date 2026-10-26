import {useState} from 'react';
import type {ReactNode} from 'react';
export type Column<T>={key:string;label:string;value:(row:T)=>string|number;render?:(row:T)=>ReactNode;filter?:boolean};
const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
/** Shared client-side grid: single-field search, stable sorting and bounded pagination. */
export function DataTable<T>({rows,columns,rowKey,title}:{rows:T[];columns:Column<T>[];rowKey:(r:T)=>string;title:string}) {
  const [query,setQuery]=useState(''),[field,setField]=useState('all');
  const [page,setPage]=useState(1),[size,setSize]=useState(10),[sort,setSort]=useState({key:'',ascending:true});
  const searchable=columns.filter(c=>c.filter!==false);
  const selected=searchable.find(c=>c.key===field);
  const needle=normalize(query.trim());
  const filtered=rows.filter(r=>!needle||(selected?[selected]:searchable).some(c=>{
    const value=c.value(r);
    return selected&&typeof value==='number'?Number(query.replace(',','.'))===value:normalize(String(value)).includes(needle);
  }));
  const col=columns.find(c=>c.key===sort.key);
  if(col)filtered.sort((a,b)=>{const x=col.value(a),y=col.value(b);return (typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'es',{numeric:true}))*(sort.ascending?1:-1);});
  const pages=Math.max(1,Math.ceil(filtered.length/size)),current=Math.min(page,pages);
  return <section className="inv-grid"><div className="inv-toolbar"><div><h2>{title}</h2><span>{filtered.length} registros</span></div><div className="inv-single-search" role="search" aria-label={`Filtrar ${title}`}><label className="inv-search-field">Filtrar por<select className="form-select" value={field} onChange={e=>{setField(e.target.value);setQuery('');setPage(1);}}><option value="all">Todos los campos</option>{searchable.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></label><label className="inv-search-query">Buscar<input type="search" className="form-control" aria-label={`Buscar en ${selected?.label??title}`} placeholder={selected?`Buscar por ${selected.label.toLowerCase()}…`:'Escribe para buscar…'} value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label>{query&&<button type="button" className="btn mini" onClick={()=>{setQuery('');setPage(1);}}>Limpiar</button>}</div></div>
    <div className="table-responsive"><table className="table align-middle"><thead><tr>{columns.map(c=><th key={c.key} scope="col" aria-sort={sort.key===c.key?(sort.ascending?'ascending':'descending'):'none'}><button className="inv-sort" onClick={()=>setSort({key:c.key,ascending:sort.key===c.key?!sort.ascending:true})}>{c.label} {sort.key===c.key?(sort.ascending?'↑':'↓'):'↕'}</button></th>)}</tr></thead><tbody>{filtered.slice((current-1)*size,current*size).map(r=><tr key={rowKey(r)}>{columns.map(c=><td key={c.key}>{c.render?c.render(r):c.value(r)}</td>)}</tr>)}</tbody></table></div>
    {!filtered.length&&<div className="inv-empty">No se encontraron registros. Prueba con otro campo o búsqueda o crea un registro.</div>}
    <footer className="inv-pagination"><label>Filas <select value={size} onChange={e=>{setSize(+e.target.value);setPage(1);}}>{[10,20,50].map(n=><option key={n}>{n}</option>)}</select></label><span>Página {current} de {pages}</span><button className="btn mini" disabled={current<=1} onClick={()=>setPage(current-1)}>Anterior</button><button className="btn mini" disabled={current>=pages} onClick={()=>setPage(current+1)}>Siguiente</button></footer>
  </section>;
}
