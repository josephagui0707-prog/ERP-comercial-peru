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
  Bar,
} from 'recharts';
import { useStore } from '../core/store';
import { money } from '../core/types';
import { dueOn, stockOf, totals } from '../core/operations';
import { Panel, Stat, Badge } from '../components/ui';

export default function Dashboard() {
  const { state: s, user } = useStore();
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

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const month = String(5 + i).padStart(2, '0');
    return {
      mes: ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'][i],
      ventas: Math.round(
        validSales
          .filter(v => v.date.slice(5, 7) === month)
          .reduce((acc, v) => acc + v.total, 0)
      ),
    };
  });

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
    ...s.sales.slice(0, 4).map(v => ({
      id: v.id,
      date: v.date,
      type: 'Venta',
      subject: s.clients.find(c => c.id === v.clientId)?.name || v.clientId,
      status: v.status,
      amount: money(v.total),
    })),
    ...s.orders.slice(0, 3).map(o => ({
      id: o.id,
      date: o.date,
      type: 'Pedido',
      subject: s.clients.find(c => c.id === o.clientId)?.name || o.clientId,
      status: o.status,
      amount: money(o.items.reduce((acc, item) => acc + item.qty * item.price * (1 - item.discount / 100), 0)),
    })),
    ...s.quotes.slice(0, 3).map(q => ({
      id: q.id,
      date: q.date,
      type: 'Cotización',
      subject: s.clients.find(c => c.id === q.clientId)?.name || q.clientId,
      status: q.status,
      amount: money(q.items.reduce((acc, item) => acc + item.qty * item.price * (1 - item.discount / 100), 0)),
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  return (
    <div className="stack dashboard-page">
      <div className="heading">
        <div>
          <span className="eyebrow">VISTA GENERAL · 2026</span>
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
          <div className="dashboard-glance-head"><ClipboardList size={17} /><span>Cotizaciones activas</span></div>
          <strong>{s.quotes.length}</strong>
          <small>{quoteApproved} aprobadas · {quoteDraft} en borrador</small>
        </div>
        <div className="dashboard-glance-card">
          <div className="dashboard-glance-head"><ShoppingCart size={17} /><span>Pedidos en curso</span></div>
          <strong>{orderPending + orderInProcess}</strong>
          <small>{orderPending} pendientes · {orderInProcess} en atención</small>
        </div>
        <div className="dashboard-glance-card">
          <div className="dashboard-glance-head"><WalletCards size={17} /><span>Cobranza pendiente</span></div>
          <strong>{pendingCollections.length}</strong>
          <small>{money(t.receivables)} por recaudar</small>
        </div>
        <div className="dashboard-glance-card">
          <div className="dashboard-glance-head"><AlertTriangle size={17} /><span>Alertas de stock</span></div>
          <strong>{lowStock.length}</strong>
          <small>{lowStock.length ? 'Productos que requieren reposición' : 'Sin alertas críticas'}</small>
        </div>
      </div>

      <div className="two-col">
        <Panel title="Evolución de ventas">
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
        <Panel title="Flujo comercial">
          <div className="dashboard-flow-list">
            <div className="dashboard-flow-item">
              <div><span>Cotizaciones</span><strong>{s.quotes.length}</strong></div>
              <small>{quoteApproved} aprobadas para convertir</small>
            </div>
            <div className="dashboard-flow-item">
              <div><span>Pedidos</span><strong>{s.orders.length}</strong></div>
              <small>{orderPending} pendientes · {orderInProcess} confirmados / preparando</small>
            </div>
            <div className="dashboard-flow-item">
              <div><span>Ventas</span><strong>{validSales.length}</strong></div>
              <small>{s.sales.filter(v => v.status === 'anulada').length} anuladas</small>
            </div>
          </div>
          <div className="dashboard-quick-links">
            {user && allowed(user.role, 'cotizaciones') && <Link to="/cotizaciones">Revisar cotizaciones <ArrowUpRight size={14} /></Link>}
            {user && allowed(user.role, 'pedidos') && <Link to="/pedidos">Continuar pedidos <ArrowUpRight size={14} /></Link>}
            {user && allowed(user.role, 'ventas') && <Link to="/ventas">Ir a ventas <ArrowUpRight size={14} /></Link>}
          </div>
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
            <div className="dashboard-progress"><span style={{ width: `${Math.max(6, Math.min(100, collectionRate))}%` }} /></div>
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
          <div className="table-wrap table-responsive">
            <table className="table table-hover align-middle erp-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Ventas</th>
                  <th>Saldo pendiente</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map(client => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{money(client.total)}</td>
                    <td>{money(client.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!topClients.length && <p className="dashboard-empty-note">Aún no hay clientes con ventas registradas.</p>}
        </Panel>

        <Panel title="Actividad reciente">
          <div className="dashboard-activity-list">
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
