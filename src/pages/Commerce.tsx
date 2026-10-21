import { useMemo, useState } from 'react';
import { ClipboardList, Eye, X } from 'lucide-react';
import { RecordPicker } from '../components/RecordPicker';
import { PaginatedTable } from '../components/PaginatedTable';
import { WorkflowGuide } from '../components/WorkflowGuide';
import { useStore } from '../core/store';
import type { Item } from '../core/types';
import { money, sumItems, uid } from '../core/types';
import { cancelSale, createOrder, createQuote, createSale, dueOn, recordPayment, returnItem } from '../core/operations';
import { Badge, Empty, Field, Panel, MethodPicker, MethodChip } from '../components/ui';
import { receiptPDF } from '../core/export';

export default function Commerce({ section }: { section: string }) {
  const { state: s, update } = useStore();
  const [detail, setDetail] = useState<{ title: string; fields: [string,string][]; items?: Item[] } | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [search, setSearch] = useState('');
  const [client, setClient] = useState('');
  const [product, setProduct] = useState('');
  const [qty, setQty] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [warehouse, setWarehouse] = useState('ALM-01');
  const [segment, setSegment] = useState('Empresa');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [editing, setEditing] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('Yape demo');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Producto devuelto');
  const [returnProduct, setReturnProduct] = useState('');
  const [id, setId] = useState('');
  const [paymentPending, setPaymentPending] = useState<{
    saleId: string;
    amount: number;
    method: string;
    status: 'aprobado' | 'rechazado' | 'cancelado';
  } | null>(null);

  const run = (fn: () => void) => {
    setError('');
    setOk('');
    try {
      fn();
      setOk('Operación realizada correctamente.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error.');
    }
  };

  const clientName = (x: string) => s.clients.find(c => c.id === x)?.name || x;
  const productName = (x: string) => s.products.find(p => p.id === x)?.name || x;
  const detailOf = (kind:string, record:{id:string;date?:string;status?:string;clientId?:string;items?:Item[];quoteId?:string;orderId?:string;saleId?:string;warehouseId?:string;amount?:number;method?:string;reference?:string;productId?:string;qty?:number;reason?:string;paymentMethod?:string}) => {
    const fields:[string,string][] = [['Identificador', record.id]];
    if(record.date) fields.push(['Fecha',record.date]);
    if(record.clientId) {const c=s.clients.find(x=>x.id===record.clientId);fields.push(['Cliente',clientName(record.clientId)]);if(c) fields.push(['Documento',c.document],['Correo',c.email],['Teléfono',c.phone||'—']);}
    if(record.status) fields.push(['Estado',record.status]);
    if(record.quoteId) fields.push(['Cotización origen',record.quoteId]);
    if(record.orderId) fields.push(['Pedido origen',record.orderId]);
    if(record.saleId) fields.push(['Venta relacionada',record.saleId]);
    if(record.warehouseId) fields.push(['Almacén',s.warehouses.find(w=>w.id===record.warehouseId)?.name||record.warehouseId]);
    if(record.productId) fields.push(['Producto',productName(record.productId)]);
    if(record.qty!==undefined) fields.push(['Cantidad',String(record.qty)]);
    if(record.items) fields.push(['Artículos',String(record.items.reduce((a,i)=>a+i.qty,0))],['Total',money(sumItems(record.items))]);
    if(record.amount!==undefined) fields.push(['Importe',money(record.amount)]);
    if(record.method) fields.push(['Método',record.method]);
    if(record.paymentMethod) fields.push(['Método de pago',record.paymentMethod]);
    if(record.reference) fields.push(['Referencia',record.reference]);
    if(record.reason) fields.push(['Motivo',record.reason]);
    setDetail({title:`${kind} · ${record.id}`,fields,items:record.items});
  };
  const detailButton=(kind:string,record:Parameters<typeof detailOf>[1])=><button type="button" className="btn btn-sm btn-outline-primary erp-action-view" onClick={()=>detailOf(kind,record)}><Eye size={14}/> Ver detalle</button>;


  const addItem = () =>
    run(() => {
      const p = s.products.find(x => x.id === product && x.active);
      if (!p || !Number.isInteger(qty) || qty <= 0 || discount < 0 || discount > 100) {
        throw Error('Selecciona un producto, cantidad y descuento válidos.');
      }
      setItems(old => [...old, { productId: p.id, qty, price: p.price, discount }]);
    });

  const clear = () => {
    setItems([]);
    setQty(1);
    setDiscount(0);
  };

  const activeSales = s.sales.filter(x => x.status === 'vigente');
  const selectedClient = s.clients.find(c => c.id === client);
  const selectedProduct = s.products.find(p => p.id === product);
  const selectedWarehouse = s.warehouses.find(w => w.id === warehouse);

  const focusList = useMemo(
    () =>
      section === 'ventas' || section === 'comprobantes'
        ? s.sales
        : section === 'pedidos'
        ? s.orders
        : section === 'cotizaciones'
        ? s.quotes
        : section === 'cobros'
        ? s.payments
        : s.returns,
    [section, s]
  );

  return (
    <div className="stack">
      <div className="heading">
        <div>
          <span className="eyebrow">GESTIÓN COMERCIAL</span>
          <h1>
            {
              (
                {
                  clientes: 'Clientes',
                  cotizaciones: 'Cotizaciones',
                  pedidos: 'Pedidos',
                  ventas: 'Ventas',
                  comprobantes: 'Comprobantes de demostración',
                  cobros: 'Cobros y pagos',
                  devoluciones: 'Devoluciones',
                } as Record<string, string>
              )[section]
            }
          </h1>
          <p>Procesos conectados con inventario y finanzas · Importes en PEN</p>
        </div>
        <span className="count">
          {section === 'clientes' ? s.clients.length : focusList.length} registros
        </span>
      </div>

      <WorkflowGuide section={section} />
      {error && <div className="error alert alert-danger fade-up d-flex align-items-center">{error}</div>}
      {ok && <div className="success alert alert-success fade-up d-flex align-items-center">{ok}</div>}

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

      {['cotizaciones', 'pedidos', 'ventas'].includes(section) && (
        <Panel title={`Nueva ${section === 'ventas' ? 'venta' : section === 'pedidos' ? 'orden' : 'cotización'}`}>
          <div className="erp-commerce-layout"><div className="form-grid erp-commerce-form">
            <RecordPicker label="Cliente" required rows={s.clients.filter(c=>c.active)} value={client} onChange={setClient} getId={c=>c.id} getLabel={c=>c.name} columns={[{label:'Código',value:c=>c.id},{label:'Razón social',value:c=><b>{c.name}</b>},{label:'RUC / DNI',value:c=>c.document,search:c=>c.document},{label:'Segmento',value:c=>c.segment,search:c=>c.segment}]} details={c=><><span>{c.document}</span><span>{c.email}</span><span>{c.segment}</span></>} />

            {section === 'ventas' && (
              <RecordPicker label="Almacén de salida" required rows={s.warehouses.filter(w=>!w.status||w.status==='Activo')} value={warehouse} onChange={setWarehouse} getId={w=>w.id} getLabel={w=>w.name} columns={[{label:'Código',value:w=>w.id},{label:'Almacén',value:w=>w.name},{label:'Ciudad',value:w=>w.city,search:w=>w.city},{label:'Estado',value:w=>w.status??'Activo'}]} details={w=><><span>{w.id}</span><span>{w.city}</span></>} />
            )}

            <RecordPicker label="Producto" required rows={s.products.filter(p=>p.active&&!p.archivedAt)} value={product} onChange={setProduct} getId={p=>p.id} getLabel={p=>p.name} columns={[{label:'SKU',value:p=>p.sku,search:p=>p.sku},{label:'Producto',value:p=><b>{p.name}</b>},{label:'Categoría',value:p=>p.category,search:p=>p.category},{label:'Precio',value:p=>money(p.price)},{label:'Estado',value:p=>p.active?'Activo':'Inactivo'}]} details={p=><><span>SKU: {p.sku}</span><span>{p.category}</span><b>{money(p.price)}</b></>} />

            <Field label="Cantidad">
              <input
                className="form-control"
                type="number"
                min="1"
                step="1"
                value={qty}
                onChange={e => setQty(Number(e.target.value))}
              />
            </Field>

            <Field label="Descuento (%)">
              <input
                className="form-control"
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={e => setDiscount(Number(e.target.value))}
              />
            </Field>

            <button className="secondary btn btn-outline-primary erp-add-line" onClick={addItem}>
              + Añadir línea
            </button>
          </div>
          <aside className="erp-selection-summary" aria-label="Resumen del documento en preparación">
            <div className="erp-summary-head"><ClipboardList size={19}/><div><strong>Resumen de operación</strong><small>Documento en preparación</small></div></div>
            <div className="erp-summary-section"><span>Cliente seleccionado</span>{selectedClient ? <><strong>{selectedClient.name}</strong><small>{selectedClient.document} · {selectedClient.segment}</small><small>{selectedClient.email}</small></>:<em>Selecciona un cliente para continuar</em>}</div>
            {section==='ventas'&&<div className="erp-summary-section"><span>Almacén de salida</span><strong>{selectedWarehouse?.name||'Sin seleccionar'}</strong><small>{selectedWarehouse?.city||''}</small></div>}
            <div className="erp-summary-section"><span>Producto en selección</span>{selectedProduct?<><strong>{selectedProduct.name}</strong><small>SKU: {selectedProduct.sku} · {selectedProduct.category}</small><small>Precio unitario: {money(selectedProduct.price)} · Cantidad: {qty}</small><small>Descuento: {discount}%</small></>:<em>Busca un producto en el catálogo</em>}</div>
            <div className="erp-summary-total"><span>{items.length} línea(s) agregada(s)</span><strong>{money(sumItems(items))}</strong></div>
          </aside></div>

          {items.length > 0 && (
            <div className="line-items">
              {items.map((i, j) => (
                <div key={j}>
                  <span>
                    {productName(i.productId)} · {i.qty} × {money(i.price)} ({i.discount}% desc.)
                  </span>
                  <button className="mini btn btn-sm btn-light" onClick={() => setItems(a => a.filter((_, k) => j !== k))}>
                    Quitar
                  </button>
                </div>
              ))}
              <strong>Total: {money(sumItems(items))}</strong>
            </div>
          )}

          <div className="align-end">
            <button
              className="primary btn btn-primary"
              onClick={() =>
                run(() => {
                  update(old =>
                    section === 'ventas'
                      ? createSale(old, client, items, warehouse)
                      : section === 'pedidos'
                      ? createOrder(old, client, items)
                      : createQuote(old, client, items)
                  );
                  clear();
                })
              }
            >
              Registrar {section === 'ventas' ? 'venta' : section === 'pedidos' ? 'pedido' : 'cotización'}
            </button>
          </div>
        </Panel>
      )}

      {section === 'cotizaciones' && (
        <Panel title="Cotizaciones y seguimiento">
          <PaginatedTable><table className="table table-hover align-middle erp-table">
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Operaciones</th>
                </tr>
              </thead>
              <tbody>
                {s.quotes.map(q => (
                  <tr key={q.id}>
                    <td>{q.id}</td>
                    <td>{clientName(q.clientId)}</td>
                    <td>{q.date}</td>
                    <td>{money(sumItems(q.items))}</td>
                    <td>
                      <Badge value={q.status} />
                    </td>
                    <td>
                      {detailButton('Cotización',q)}
                      {q.status === 'borrador' && (
                        <button
                          className="mini btn btn-sm btn-outline-success"
                          onClick={() =>
                            run(() =>
                              update(old => ({
                                ...old,
                                quotes: old.quotes.map(x => (x.id === q.id ? { ...x, status: 'aprobada' } : x)),
                              }))
                            )
                          }
                        >
                          Aprobar
                        </button>
                      )}
                      {q.status === 'aprobada' && (
                        <button
                          className="mini btn btn-sm btn-outline-primary"
                          onClick={() => run(() => update(old => createOrder(old, q.clientId, q.items, q.id)))}
                        >
                          Convertir a pedido
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></PaginatedTable>
        </Panel>
      )}

      {section === 'pedidos' && (
        <Panel title="Órdenes comerciales">
          <PaginatedTable><table className="table table-hover align-middle erp-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Operación</th>
                </tr>
              </thead>
              <tbody>
                {s.orders.map(o => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{clientName(o.clientId)}</td>
                    <td>{money(sumItems(o.items))}</td>
                    <td>
                      <Badge value={o.status} />
                    </td>
                    <td>
                      {detailButton('Pedido',o)}
                      {o.status !== 'completado' && o.status !== 'cancelado' && (
                        <>
                          <button
                            className="mini btn btn-sm btn-primary"
                            onClick={() => run(() => update(old => createSale(old, o.clientId, o.items, 'ALM-01', o.id)))}
                          >
                            Facturar como venta
                          </button>
                          <button
                            className="mini btn btn-sm btn-outline-danger"
                            onClick={() =>
                              run(() =>
                                update(old => ({
                                  ...old,
                                  orders: old.orders.map(x => (x.id === o.id ? { ...x, status: 'cancelado' } : x)),
                                }))
                              )
                            }
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></PaginatedTable>
        </Panel>
      )}

      {(section === 'ventas' || section === 'comprobantes') && (
        <Panel
          title="Historial de ventas"
          actions={
            <input
              className="form-control"
              placeholder="Filtrar por código o cliente"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          }
        >
          <PaginatedTable><table className="table table-hover align-middle erp-table">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Por cobrar</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {s.sales
                  .filter(v => (v.id + clientName(v.clientId)).toLowerCase().includes(search.toLowerCase()))
                  .map(v => (
                    <tr key={v.id}>
                      <td>
                        <b>{v.id}</b>
                      </td>
                      <td>{clientName(v.clientId)}</td>
                      <td>{v.date}</td>
                      <td>{money(sumItems(v.items))}</td>
                      <td>{money(dueOn(s, v))}</td>
                      <td>
                        <Badge value={v.status} />
                      </td>
                      <td>
                        {detailButton('Venta',v)}
                        <button
                        className="mini btn btn-sm btn-light"
                        onClick={() =>
                            receiptPDF({
                            id: v.id,
                            tipoComprobante: 'boleta',
                            serie: 'B001',
                            correlativo: 1,
                            date: v.date,
                            compradorNombre: clientName(v.clientId),
                            compradorDoc: '00000000',
                            compradorTipoDoc: 'DNI',
                            items: v.items.map(i => ({
                                name: productName(i.productId),
                                qty: i.qty,
                                price: i.price,
                                amount: i.qty * i.price * (1 - i.discount / 100),
                            })),
                            total: sumItems(v.items),
                            paymentMethod: v.paymentMethod,
                            } as any)
                        }
                        >
                        PDF demo
                        </button>
                        {v.status === 'vigente' && (
                          <button
                            className="mini btn btn-sm btn-outline-danger"
                            onClick={() => {
                              if (confirm(`¿Anular ${v.id}?`)) run(() => update(old => cancelSale(old, v.id)));
                            }}
                          >
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table></PaginatedTable>
        </Panel>
      )}

      {section === 'cobros' && (
        <>
          <Panel title="Pasarela académica de pagos">
            <div className="banner-warn alert alert-warning">
              SIMULACIÓN · No conectada a Yape, Plin, bancos ni redes de tarjetas. No ingreses datos bancarios reales.
            </div>
            <div className="form-grid">
              <RecordPicker label="Venta con saldo" rows={activeSales.filter(v=>dueOn(s,v)>0)} value={id} onChange={value=>{setId(value);setAmount('');}} getId={v=>v.id} getLabel={v=>`${v.id} — ${clientName(v.clientId)}`} columns={[{label:'Venta',value:v=>v.id},{label:'Cliente',value:v=>clientName(v.clientId),search:v=>clientName(v.clientId)},{label:'Fecha',value:v=>v.date},{label:'Saldo',value:v=>money(dueOn(s,v))}]} details={v=><><span>{v.date}</span><b>Saldo: {money(dueOn(s,v))}</b></>} />
              <div className="pay-full">
                <span className="pay-title">
                  Método de pago <small>(demostración)</small>
                </span>
                <MethodPicker value={method} onChange={setMethod} />
                <span className="text-secondary small">
                  Ninguna marca está conectada: es una simulación, no se ingresan cuentas ni tarjetas reales.
                </span>
              </div>
              <Field label="Importe PEN">
                <input
                  className="form-control"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={id ? String(dueOn(s, s.sales.find(v => v.id === id)!)) : ''}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </Field>
              <Field label="Resultado de prueba">
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="">Elegir resultado</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="rechazado">Rechazado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </Field>
            </div>
            <button
              className="primary btn btn-primary"
              onClick={() => {
                setError('');
                setOk('');
                try {
                  if (!id || !['aprobado', 'rechazado', 'cancelado'].includes(status)) {
                    throw Error('Elige una venta y el resultado de prueba.');
                  }
                  const sale = s.sales.find(v => v.id === id)!;
                  const n = Number(amount || dueOn(s, sale));
                  if (!Number.isFinite(n) || n <= 0 || n > dueOn(s, sale)) {
                    throw Error('El importe debe ser positivo y no superar el saldo pendiente.');
                  }
                  setPaymentPending({
                    saleId: id,
                    amount: n,
                    method,
                    status: status as 'aprobado' | 'rechazado' | 'cancelado',
                  });
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Error al preparar el pago.');
                }
              }}
            >
              Procesar pago simulado
            </button>
          </Panel>

          <Panel title="Historial de transacciones">
            <PaginatedTable>
              <table className="table table-hover align-middle erp-table">
                <thead>
                  <tr>
                    <th>Operación</th>
                    <th>Venta</th>
                    <th>Importe</th>
                    <th>Método</th>
                    <th>Estado</th>
                    <th>Referencia</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {s.payments.map(p => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.saleId}</td>
                      <td>{money(p.amount)}</td>
                      <td>
                        <MethodChip name={p.method} />
                      </td>
                      <td>
                        <Badge value={p.status} />
                      </td>
                      <td>{p.reference}</td><td>{detailButton('Pago',p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PaginatedTable>
          </Panel>
        </>
      )}

      {section === 'devoluciones' && (
        <>
          <Panel title="Registrar devolución vinculada a venta">
            <div className="form-grid">
              <RecordPicker label="Venta" rows={activeSales} value={id} onChange={value=>{setId(value);setReturnProduct('');}} getId={v=>v.id} getLabel={v=>`${v.id} — ${clientName(v.clientId)}`} columns={[{label:'Venta',value:v=>v.id},{label:'Cliente',value:v=>clientName(v.clientId),search:v=>clientName(v.clientId)},{label:'Fecha',value:v=>v.date},{label:'Total',value:v=>money(sumItems(v.items))}]} details={v=><span>Registrada: {v.date}</span>} />
              <RecordPicker label="Producto vendido" rows={s.products.filter(p=>s.sales.find(v=>v.id===id)?.items.some(i=>i.productId===p.id))} value={returnProduct} onChange={setReturnProduct} getId={p=>p.id} getLabel={p=>p.name} columns={[{label:'Producto',value:p=>p.name},{label:'SKU',value:p=>p.sku,search:p=>p.sku},{label:'Categoría',value:p=>p.category,search:p=>p.category}]} />
              <Field label="Cantidad">
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  step="1"
                  value={qty}
                  onChange={e => setQty(Number(e.target.value))}
                />
              </Field>
              <Field label="Motivo">
                <input className="form-control" value={reason} onChange={e => setReason(e.target.value)} />
              </Field>
            </div>
            <button
              className="primary btn btn-primary"
              onClick={() => run(() => update(old => returnItem(old, id, returnProduct, qty, reason)))}
            >
              Registrar devolución
            </button>
          </Panel>

          <Panel title="Devoluciones registradas">
            <PaginatedTable>
              <table className="table table-hover align-middle erp-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Venta</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Importe</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {s.returns.map(r => (
                    <tr key={r.id}>
                      <td>{detailButton('Devolución',r)} {r.id}</td>
                      <td>{r.saleId}</td>
                      <td>{productName(r.productId)}</td>
                      <td>{r.qty}</td>
                      <td>{money(r.amount)}</td>
                      <td>{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PaginatedTable>
            {!s.returns.length && <Empty />}
          </Panel>
        </>
      )}

      {detail && (
        <div
          className="erp-detail-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setDetail(null);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="erp-detail-heading" className="erp-detail-modal">
            <header>
              <div>
                <span className="eyebrow">CONSULTA DE REGISTRO</span>
                <h2 id="erp-detail-heading">{detail.title}</h2>
                <p className="erp-detail-lead">Resumen detallado del registro seleccionado dentro del flujo comercial.</p>
              </div>
              <button type="button" aria-label="Cerrar detalle" className="btn btn-light" onClick={() => setDetail(null)}>
                <X size={19} />
              </button>
            </header>
            <div className="erp-detail-content">
              <div className="erp-detail-grid">
                {detail.fields.map(([name, value]) => (
                  <div key={name}>
                    <span>{name}</span>
                    <strong>{value || '—'}</strong>
                  </div>
                ))}
              </div>
              {detail.items?.length ? (
                <>
                  <h3>Detalle de productos</h3>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio</th>
                          <th>Descuento</th>
                          <th>Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.items.map((it, index) => (
                          <tr key={index}>
                            <td>{productName(it.productId)}</td>
                            <td>{it.qty}</td>
                            <td>{money(it.price)}</td>
                            <td>{it.discount}%</td>
                            <td>{money(sumItems([it]))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="erp-detail-empty">Este registro no contiene líneas de producto adicionales para mostrar.</div>
              )}
            </div>
            <footer>
              <button type="button" className="btn btn-primary" onClick={() => setDetail(null)}>
                Cerrar detalle
              </button>
            </footer>
          </section>
        </div>
      )}
      {paymentPending && (
        <div
          className="erp-modal-backdrop"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setPaymentPending(null);
          }}
        >
          <section
            className="erp-payment-modal card shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="erp-payment-title"
          >
            <div className="erp-payment-banner">
              <span className="payment-symbol">S/</span>
              <div>
                <span className="eyebrow">ENTORNO DE DEMOSTRACIÓN</span>
                <h2 id="erp-payment-title">Confirmar transacción</h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                className="btn-close btn-close-white"
                onClick={() => setPaymentPending(null)}
              />
            </div>
            <div className="erp-payment-body">
              <div className="checkout-steps d-flex align-items-center gap-2 mb-4">
                <span className="badge text-bg-primary rounded-pill">1. Revisión</span>
                <span className="text-secondary">→</span>
                <span className="badge text-bg-secondary rounded-pill">2. Simular</span>
                <span className="text-secondary">→</span>
                <span className="badge text-bg-secondary rounded-pill">3. Resultado</span>
              </div>
              <span className="payment-amount-label">Importe a procesar</span>
              <div className="payment-amount">{money(paymentPending.amount)}</div>
              <div className="payment-detail">
                <span>Venta</span>
                <strong>{paymentPending.saleId}</strong>
              </div>
              <div className="payment-detail">
                <span>Método de pago</span>
                <span className="d-inline-flex align-items-center gap-2">
                  <MethodChip name={paymentPending.method} />
                </span>
              </div>
              <div className="payment-detail">
                <span>Resultado simulado</span>
                <span
                  className={
                    'badge rounded-pill ' +
                    (paymentPending.status === 'aprobado'
                      ? 'text-bg-success'
                      : paymentPending.status === 'rechazado'
                      ? 'text-bg-danger'
                      : 'text-bg-secondary')
                  }
                >
                  {paymentPending.status}
                </span>
              </div>
              <div className="alert alert-info mt-3 mb-0 small">
                No se realizará ningún cobro real. Esta operación solo modifica los datos de demostración del ERP.
              </div>
            </div>
            <div className="erp-payment-actions">
              <button className="btn btn-outline-secondary" onClick={() => setPaymentPending(null)}>
                Volver
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const p = paymentPending;
                  setPaymentPending(null);
                  run(() => {
                    update(old => recordPayment(old, p.saleId, p.amount, p.method, p.status));
                    setAmount('');
                    setId('');
                  });
                }}
              >
                Confirmar simulación
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}