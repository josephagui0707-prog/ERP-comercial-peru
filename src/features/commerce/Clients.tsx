import {useState} from 'react';
import {PaginatedTable} from '../../components/PaginatedTable';
import {Badge,Field,Panel} from '../../components/ui';
import {uid} from '../../core/types';
import {useCommerce} from './Shared';
/** Formulario de Clientes original, reubicado sin modificar sus reglas ni columnas. */
export default function Clients(){
 const {state:s,update,run,error,success:ok}=useCommerce();
 const section='clientes';
 const [editing,setEditing]=useState(''),[name,setName]=useState(''),[email,setEmail]=useState(''),[document,setDocument]=useState(''),[phone,setPhone]=useState(''),[segment,setSegment]=useState('Empresa'),[search,setSearch]=useState('');
 return <div className="stack"><div className="heading"><div><span className="eyebrow">GESTIÓN COMERCIAL</span><h1>Clientes</h1><p>Procesos conectados con inventario y finanzas · Importes en PEN</p></div><span className="count">{s.clients.length} registros</span></div>
 {error&&<div className="error alert alert-danger fade-up">{error}</div>}{ok&&<div className="success alert alert-success fade-up">{ok}</div>}
      {section === 'clientes' && (
        <>
          <Panel title={editing ? 'Editar cliente' : 'Registrar cliente'}>
            <form
              className="form-grid"
              onSubmit={e => {
                e.preventDefault();
                run(() => {
                  if (!name.trim() || !email.includes('@') || !document.trim()) {
                    throw Error('Completa nombre, documento y correo válido.');
                  }
                  update(old => {
                    const next = structuredClone(old);
                    if (editing) {
                      const c = next.clients.find(c => c.id === editing)!;
                      Object.assign(c, { name, email, document, phone, segment });
                    } else {
                      next.clients.unshift({ id: uid('CLI'), name, email, document, phone, segment, active: true });
                    }
                    return next;
                  });
                  setEditing('');
                  setName('');
                  setEmail('');
                  setDocument('');
                  setPhone('');
                });
              }}
            >
              <Field label="Razón social">
                <input className="form-control" required value={name} onChange={e => setName(e.target.value)} />
              </Field>
              <Field label="RUC / documento">
                <input className="form-control" required value={document} onChange={e => setDocument(e.target.value)} />
              </Field>
              <Field label="Correo">
                <input className="form-control" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
              <Field label="Teléfono">
                <input className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />
              </Field>
              <Field label="Segmento">
                <select className="form-select" value={segment} onChange={e => setSegment(e.target.value)}>
                  {['Empresa', 'Mayorista', 'Minorista'].map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <button className="primary btn btn-primary" type="submit">
                {editing ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </form>
          </Panel>

          <Panel
            title="Cartera de clientes"
            actions={
              <input
                className="form-control"
                placeholder="Buscar cliente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            }
          >
            <PaginatedTable>
              <table className="table table-hover align-middle erp-table">
                <thead>
                  <tr>
                    <th>Razón social</th>
                    <th>Documento</th>
                    <th>Segmento</th>
                    <th>Ventas</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {s.clients
                    .filter(c => (c.name + c.document).toLowerCase().includes(search.toLowerCase()))
                    .map(c => (
                      <tr key={c.id}>
                        <td>
                          <b>{c.name}</b>
                          <small>{c.email}</small>
                        </td>
                        <td>{c.document}</td>
                        <td>{c.segment}</td>
                        <td>{s.sales.filter(x => x.clientId === c.id).length}</td>
                        <td>
                          <Badge value={c.active ? 'Activo' : 'Inactivo'} />
                        </td>
                        <td>
                          <button
                            className="mini btn btn-sm btn-light"
                            onClick={() => {
                              setEditing(c.id);
                              setName(c.name);
                              setEmail(c.email);
                              setDocument(c.document);
                              setPhone(c.phone);
                              setSegment(c.segment);
                              window.scrollTo(0, 0);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="mini btn btn-sm btn-light"
                            onClick={() =>
                              run(() =>
                                update(old => ({
                                  ...old,
                                  clients: old.clients.map(x => (x.id === c.id ? { ...x, active: !x.active } : x)),
                                }))
                              )
                            }
                          >
                            {c.active ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </PaginatedTable>
          </Panel>
        </>
      )}


 </div>;
}
