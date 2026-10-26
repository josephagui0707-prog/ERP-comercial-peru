import {useState} from 'react';
import { allowed } from '../core/permissions';
import {
  AlertTriangle,
  ArrowUpRight,
  Box,
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  HandCoins,
  PackageSearch,
  ShoppingCart,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart,
  BarChart,
  Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useStore } from '../core/store';
import { money } from '../core/types';
import { dueOn, stockOf, totals } from '../core/operations';
import { Panel, Stat, Badge } from '../components/ui';

export default function Dashboard() {
  const { state: s, user } = useStore();
  const [period,setPeriod]=useState(1);
  const years=[...new Set(s.sales.map(v=>v.date.slice(0,4)))].sort().reverse();
  const [year,setYear]=useState(years[0]||String(new Date().getFullYear()));
  const [from,setFrom]=useState('');const [to,setTo]=useState('');
  const [activityType,setActivityType]=useState('Todas');
  const t = totals(s);
  const validSales = s.sales.filter(v => v.status === 'vigente');
  const approvedPayments = s.payments.filter(p => p.status === 'aprobado');
  const quoteDraft = s.quotes.filter(q => q.status === 'borrador').length;
  const quoteApproved = s.quotes.filter(q => q.status === 'aprobada').length;
  const orderPending = s.orders.filter(o => o.status === 'pendiente').length;
  const orderInProcess = s.orders.filter(o => ['confirmado', 'preparando'].includes(o.status)).length;
  const lowStock = s.products
    .map(p => ({
      ...p,
      stock: stockOf(s, p.id),
      gap: Math.max(0, p.min - stockOf(s, p.id)),
    }))
    .filter(p => p.stock <= p.min)
    .sort((a, b) => b.gap - a.gap || a.stock - b.stock);
  const pendingCollections = validSales.filter(v => dueOn(s, v) > 0.01);
  const collectionRate = validSales.length
    ? Math.round((approvedPayments.reduce((acc, p) => acc + p.amount, 0) / validSales.reduce((acc, v) => acc + v.total, 0)) * 100)
    : 0;

  const monthly = Array.from({length:12/period},(_,i)=>({
    mes:period===1?['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i]:`${period===3?'T':'S'}${i+1}`,
    ventas:validSales.filter(v=>v.date.slice(0,4)===year&&Math.floor((Number(v.date.slice(5,7))-1)/period)===i).reduce((sum,v)=>sum+v.total,0)
  }));
  const allCategories = [...new Set(s.products.map(p=>p.category))].map(name=>({name,
    value:validSales.flatMap(v=>v.items).filter(i=>s.products.find(p=>p.id===i.productId)?.category===name)
      .reduce((sum,i)=>sum+i.qty*i.price*(1-i.discount/100),0)
  })).filter(c=>c.value>0);
  const sortedCategories=[...allCategories].sort((a,b)=>b.value-a.value);
  const categories=sortedCategories.slice(0,3);
  if(sortedCategories.length>3)categories.push({name:'Otras categorías',value:sortedCategories.slice(3).reduce((sum,c)=>sum+c.value,0)});
  const categoryTotal=categories.reduce((sum,c)=>sum+c.value,0);
  const colors=['#528ba6','#78b7b2','#9aabd0','#c7a879','#8f9aa6','#739e81'];

  const topProducts = s.products
    .map(p => ({
      name: p.name.length > 26 ? p.name.slice(0, 25) + '…' : p.name,
      unidades: validSales
        .flatMap(v => v.items)
        .filter(i => i.productId === p.id)
        .reduce((acc, item) => acc + item.qty, 0),
    }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 6);

  const topClients = s.clients
    .map(c => ({
      id: c.id,
      name: c.name,
      total: validSales.filter(v => v.clientId === c.id).reduce((acc, v) => acc + v.total, 0),
      pending: validSales.filter(v => v.clientId === c.id).reduce((acc, v) => acc + dueOn(s, v), 0),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const recentActivity = [
    ...s.sales.map(v => ({
      id: v.id,
      date: v.date,
      type: 'Venta',
      subject: s.clients.find(c => c.id === v.clientId)?.name || v.clientId,
      status: v.status,
      amount: money(v.total),
    })),
    ...s.orders.map(o => ({
      id: o.id,
      date: o.date,
      type: 'Pedido',
      subject: s.clients.find(c => c.id === o.clientId)?.name || o.clientId,
      status: o.status,
      amount: money(o.items.reduce((acc, item) => acc + item.qty * item.price * (1 - item.discount / 100), 0)),
    })),
    ...s.quotes.map(q => ({
      id: q.id,
      date: q.date,
      type: 'Cotización',
      subject: s.clients.find(c => c.id === q.clientId)?.name || q.clientId,
      status: q.status,
      amount: money(q.items.reduce((acc, item) => acc + item.qty * item.price * (1 - item.discount / 100), 0)),
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter(item=>(!from||item.date.slice(0,10)>=from)&&(!to||item.date.slice(0,10)<=to)&&(activityType==='Todas'||item.type===activityType));

  return (
    <div className="stack dashboard-page">
      <div className="heading">
        <div>
          <span className="eyebrow">VISTA GENERAL · DEMOSTRACIÓN</span>
          <h1>Dashboard ejecutivo</h1>
          <p>Resumen comercial, cobranza e inventario en tiempo real sobre los datos del entorno de demostración.</p>
        </div>
        <span className="count">● Ambiente de demostración</span>
      </div>

      <div className="stats">
        <Stat label="Ventas netas" icon={ChartNoAxesCombined} value={money(t.sales)} hint="Operaciones vigentes" />
        <Stat label="Cobrado" icon={WalletCards} value={money(t.income)} hint="Pagos aprobados + otros ingresos" />
        <Stat label="Por cobrar" icon={HandCoins} value={money(t.receivables)} hint="Saldo comercial pendiente" />
        <Stat label="Utilidad estimada" icon={TrendingUp} value={money(t.profit)} hint="Sin impuestos ni gastos no modelados" />
      </div>

      <div className="dashboard-glance-grid">
        <div className="dashboard-glance-card">
          <div className="dashboard-glance-head"><ShoppingCart size={17} /><span>Pedidos en curso</span></div>
          <strong>{orderPending + orderInProcess}</strong>
          <small>{orderPending} pendientes · {orderInProcess} en atención</small>
        </div>
        <div className="dashboard-glance-card">
          <div className="dashboard-glance-head"><AlertTriangle size={17} /><span>Alertas de stock</span></div>
          <strong>{lowStock.length}</strong>
          <small>{lowStock.length ? 'Productos que requieren reposición' : 'Sin alertas críticas'}</small>
        </div>
      </div>

      <div className="two-col">
        <Panel title="Evolución de ventas">
          <div className="dashboard-filters"><label>Agrupar por<select value={period} onChange={e=>setPeriod(Number(e.target.value))}><option value={1}>Mensual</option><option value={3}>Trimestral</option><option value={6}>Semestral</option></select></label><label>Año<select value={year} onChange={e=>setYear(e.target.value)}>{(years.length?years:[year]).map(y=><option key={y}>{y}</option>)}</select></label></div>
          <p className="admin-description">Ventas vigentes del año seleccionado · Importes en soles · Períodos sin ventas: 0.</p>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="salesTint" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#528ba6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#528ba6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" />
                <YAxis width={72} />
                <Tooltip formatter={v => money(Number(v))} />
                <Area type="monotone" dataKey="ventas" stroke="#528ba6" strokeWidth={3} fill="url(#salesTint)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Productos más vendidos">
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 15 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'rgba(99,169,255,.12)' }} />
                <Bar dataKey="unidades" fill="#578ba5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="dashboard-grid-3">
        <Panel title="Ventas por categoría">
          <p className="admin-description">Las 3 categorías principales y el resto agrupado. Participación en ventas vigentes.</p>
          {categories.length?<><div style={{height:190}}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2}>{categories.map((c,i)=><Cell key={c.name} fill={colors[i]}/>)}</Pie><Tooltip formatter={v=>`${(Number(v)/categoryTotal*100).toLocaleString('es-PE',{maximumFractionDigits:1})}%`}/></PieChart></ResponsiveContainer></div><div className="category-legend">{categories.map((c,i)=><div key={c.name}><i style={{background:colors[i]}}/><span>{c.name}</span><b>{(c.value/categoryTotal*100).toLocaleString('es-PE',{maximumFractionDigits:1})}%</b></div>)}</div></>:<p className="dashboard-empty-note">Aún no hay ventas por categoría.</p>}
        </Panel>

        <Panel title="Cobranza y liquidez">
          <div className="dashboard-kv-list">
            <div><span>Pagos aprobados</span><strong>{approvedPayments.length}</strong></div>
            <div><span>Saldo por cobrar</span><strong>{money(t.receivables)}</strong></div>
            <div><span>Tasa de cobranza</span><strong>{collectionRate}%</strong></div>
            <div><span>Clientes con saldo</span><strong>{new Set(pendingCollections.map(v => v.clientId)).size}</strong></div>
          </div>
          <div className="dashboard-progress-block">
            <div className="dashboard-progress-label"><span>Progreso de cobro comercial</span><b>{collectionRate}%</b></div>
            <div className="dashboard-progress"><span style={{ width: `${Math.max(0, Math.min(100, collectionRate))}%` }} /></div>
            <small>Relación entre ventas vigentes y pagos aprobados registrados.</small>
          </div>
        </Panel>

        <Panel title="Inventario en observación">
          <div className="dashboard-alert-list">
            {lowStock.slice(0, 5).map(p => (
              <div key={p.id} className="dashboard-alert-item">
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.category}</small>
                </div>
                <div className="dashboard-alert-metrics">
                  <span>Stock: {p.stock}</span>
                  <b>Mín.: {p.min}</b>
                </div>
              </div>
            ))}
            {!lowStock.length && <p className="dashboard-empty-note">No hay productos por debajo del stock mínimo.</p>}
          </div>
          {user && allowed(user.role, 'stock') && <Link className="text-link" to="/stock">Consultar existencias →</Link>}
        </Panel>
      </div>

      <div className="two-col">
        <Panel title="Clientes con mayor facturación">
          <p className="admin-description">Comparación relativa frente al cliente con mayor compra. Sin importes ni saldos individuales.</p>
          <div className="client-ranking">{topClients.map((client,i)=><div key={client.id}><div className="dashboard-progress-label"><span>{i+1}. {client.name}</span></div><div className="dashboard-progress" role="img" aria-label={`${client.name}: posición ${i+1} en compras`}><span style={{width:`${client.total/topClients[0].total*100}%`}}/></div></div>)}</div>
          {!topClients.length && <p className="dashboard-empty-note">Aún no hay clientes con ventas registradas.</p>}
        </Panel>

        <Panel title="Actividad reciente">
          <div className="dashboard-filters"><label>Desde<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label><label>Tipo<select value={activityType} onChange={e=>setActivityType(e.target.value)}>{['Todas','Venta','Pedido','Cotización'].map(x=><option key={x}>{x}</option>)}</select></label><button className="btn btn-sm btn-outline-secondary" onClick={()=>{setFrom('');setTo('');setActivityType('Todas')}}>Limpiar</button></div>
          <p className="admin-description">{recentActivity.length} registros · Fecha del documento</p>
          <div className="dashboard-activity-list activity-scroll" tabIndex={0} aria-label="Historial comercial desplazable">
            {!recentActivity.length&&<p className="dashboard-empty-note">No hay actividad para estos filtros.</p>}
            {recentActivity.map(item => (
              <div key={`${item.type}-${item.id}`} className="dashboard-activity-item">
                <div className="dashboard-activity-icon">
                  {item.type === 'Venta' ? <WalletCards size={16} /> : item.type === 'Pedido' ? <Box size={16} /> : <Users size={16} />}
                </div>
                <div className="dashboard-activity-copy">
                  <div>
                    <strong>{item.id}</strong>
                    <span>{item.type}</span>
                  </div>
                  <p>{item.subject}</p>
                  <small>{item.date} · {item.amount}</small>
                </div>
                <Badge value={item.status} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
