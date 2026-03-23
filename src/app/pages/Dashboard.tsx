import {
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  Receipt,
  PackageSearch,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { formatCurrency } from '../lib/utils';
import { Link } from 'react-router';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';
import { getDashboard, type DashboardData } from '../lib/dashboard-api';

const emptyDashboard: DashboardData = {
  kpis: {
    trabajosHoy: 0,
    trabajosPendientes: 0,
    trabajosTerminadosMes: 0,
    trabajosCanceladosMes: 0,
    ingresosDia: 0,
    gastosDia: 0,
    saldoCaja: 0,
    stockBajo: 0,
  },
  chartData: [],
  recentTrabajos: [],
  recentPagos: [],
  stockBajo: [],
  alertas: [],
};

function getEstadoBadge(estado: string) {
  const estados: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' | 'danger' }> = {
    PENDIENTE: { label: 'Pendiente', variant: 'warning' },
    EN_PROCESO: { label: 'En proceso', variant: 'info' },
    TERMINADO: { label: 'Terminado', variant: 'success' },
    ENTREGADO: { label: 'Entregado', variant: 'success' },
    CANCELADO: { label: 'Cancelado', variant: 'danger' },
  };

  const config = estados[estado] || estados.PENDIENTE;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const dashboard = await getDashboard();

        if (isMounted) {
          setData(dashboard);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el dashboard.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const kpiData = useMemo(() => {
    return [
      {
        title: 'Trabajos de hoy',
        value: String(data.kpis.trabajosHoy),
        icon: Briefcase,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        change: 'registrados hoy',
      },
      {
        title: 'Trabajos pendientes',
        value: String(data.kpis.trabajosPendientes),
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-100',
        change: 'por atender',
      },
      {
        title: 'Trabajos terminados',
        value: String(data.kpis.trabajosTerminadosMes),
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-100',
        change: 'este mes',
      },
      {
        title: 'Trabajos cancelados',
        value: String(data.kpis.trabajosCanceladosMes),
        icon: XCircle,
        color: 'text-red-600',
        bg: 'bg-red-100',
        change: 'este mes',
      },
      {
        title: 'Ingresos del dia',
        value: formatCurrency(data.kpis.ingresosDia),
        icon: TrendingUp,
        color: 'text-green-600',
        bg: 'bg-green-100',
        change: 'movimientos de hoy',
      },
      {
        title: 'Gastos del dia',
        value: formatCurrency(data.kpis.gastosDia),
        icon: TrendingDown,
        color: 'text-red-600',
        bg: 'bg-red-100',
        change: 'movimientos de hoy',
      },
      {
        title: 'Saldo en caja',
        value: formatCurrency(data.kpis.saldoCaja),
        icon: Wallet,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        change: 'saldo actual',
      },
      {
        title: 'Stock bajo',
        value: String(data.kpis.stockBajo),
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-100',
        change: 'productos',
      },
    ];
  }, [data.kpis]);

  const quickActions = [
    {
      title: 'Registrar trabajo',
      description: 'Ingresa un nuevo trabajo y su adelanto inicial.',
      to: '/dashboard/trabajos',
      icon: Briefcase,
    },
    {
      title: 'Registrar pago',
      description: 'Carga un cobro y actualiza la caja al instante.',
      to: '/dashboard/pagos',
      icon: Receipt,
    },
    {
      title: 'Ver calendario',
      description: 'Revisa entregas e instalaciones programadas.',
      to: '/dashboard/calendario',
      icon: CalendarRange,
    },
    {
      title: 'Controlar inventario',
      description: 'Consulta stock bajo y movimientos recientes.',
      to: '/dashboard/inventario',
      icon: PackageSearch,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section
        className="overflow-hidden rounded-3xl border border-slate-200 text-white shadow-xl"
        style={{
          backgroundImage: 'linear-gradient(135deg, var(--hero-from), var(--hero-via), var(--hero-to))',
        }}
      >
        <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-7 lg:grid-cols-[1.5fr_1fr] lg:px-8">
          <div className="space-y-5">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-100">
              Panel general del negocio
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
                Control diario para una vidrieria en una sola vista
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
                Revisa el movimiento del dia, detecta alertas de stock y valida rapido el ritmo de ingresos, gastos y trabajos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Caja actual</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(data.kpis.saldoCaja)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Trabajos pendientes</p>
                <p className="mt-2 text-2xl font-semibold text-white">{data.kpis.trabajosPendientes}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Stock bajo</p>
                <p className="mt-2 text-2xl font-semibold text-white">{data.kpis.stockBajo}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 self-start">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  to={action.to}
                  className="group rounded-2xl border border-white/12 bg-white/8 p-4 transition hover:border-white/25 hover:bg-white/12"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{action.title}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-300">{action.description}</p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3 text-sky-100 transition group-hover:bg-white/15">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-xl font-semibold text-slate-900">Indicadores clave</h2>
        <p className="mt-1 text-sm text-slate-600">Una lectura rapida del estado operativo y financiero.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="overflow-hidden border-slate-200/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="mb-1 text-sm text-slate-500">{kpi.title}</p>
                    <p className="mb-2 text-2xl font-bold text-slate-900">{kpi.value}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{kpi.change}</p>
                  </div>
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${kpi.bg} ring-1 ring-inset ring-white/60`}>
                    <Icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Ingresos vs gastos</CardTitle>
            <CardDescription>Comparativo de los ultimos 3 meses para ver tendencia y margen.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
                <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Alertas importantes</CardTitle>
            <CardDescription>Eventos que vale la pena revisar hoy antes de cerrar caja.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.alertas.length === 0 && !isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No hay alertas activas por ahora.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {data.alertas.map((alerta, index) => (
                  <div
                    key={`${alerta.tipo}-${index}`}
                    className={`p-3 rounded-lg border ${
                      alerta.tipo === 'warning'
                        ? 'bg-amber-50 border-amber-200'
                        : alerta.tipo === 'success'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <p className="text-sm text-gray-700">{alerta.mensaje}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <CardTitle>Ultimos trabajos</CardTitle>
              <CardDescription>Los registros mas recientes para seguimiento rapido.</CardDescription>
            </div>
            <Link to="/dashboard/trabajos" className="flex items-center gap-1 text-sm text-[var(--brand-600)] hover:opacity-80">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {data.recentTrabajos.map((trabajo) => (
                <div key={trabajo.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{trabajo.cliente}</p>
                      <p className="mt-1 text-sm text-slate-600">{trabajo.descripcion}</p>
                    </div>
                    {getEstadoBadge(trabajo.estado)}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{formatCurrency(trabajo.total)}</p>
                </div>
              ))}
              {!isLoading && data.recentTrabajos.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">No hay trabajos recientes.</div>
              ) : null}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Cliente</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Descripcion</th>
                    <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Total</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.recentTrabajos.map((trabajo) => (
                    <tr key={trabajo.id} className="hover:bg-slate-50/80">
                      <td className="py-3 text-sm text-slate-900">{trabajo.cliente}</td>
                      <td className="py-3 text-sm text-slate-600">{trabajo.descripcion}</td>
                      <td className="py-3 text-right text-sm font-medium text-slate-900">{formatCurrency(trabajo.total)}</td>
                      <td className="py-3">{getEstadoBadge(trabajo.estado)}</td>
                    </tr>
                  ))}
                  {!isLoading && data.recentTrabajos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-slate-500">
                        No hay trabajos recientes.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <CardTitle>Pagos recientes</CardTitle>
              <CardDescription>Ultimos ingresos registrados en el sistema.</CardDescription>
            </div>
            <Link to="/dashboard/pagos" className="flex items-center gap-1 text-sm text-[var(--brand-600)] hover:opacity-80">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {data.recentPagos.map((pago) => (
                <div key={pago.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{pago.cliente}</p>
                      <p className="mt-1 text-sm text-slate-600">{pago.tipo}</p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(pago.monto)}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{pago.metodo}</p>
                </div>
              ))}
              {!isLoading && data.recentPagos.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">No hay pagos recientes.</div>
              ) : null}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Cliente</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Tipo</th>
                    <th className="pb-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Monto</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Metodo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.recentPagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-slate-50/80">
                      <td className="py-3 text-sm text-slate-900">{pago.cliente}</td>
                      <td className="py-3 text-sm text-slate-600">{pago.tipo}</td>
                      <td className="py-3 text-right text-sm font-medium text-green-600">{formatCurrency(pago.monto)}</td>
                      <td className="py-3 text-sm text-slate-600">{pago.metodo}</td>
                    </tr>
                  ))}
                  {!isLoading && data.recentPagos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-slate-500">
                        No hay pagos recientes.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle>Productos con stock bajo</CardTitle>
          <CardDescription>Materiales que conviene reponer para no frenar trabajos pendientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {data.stockBajo.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">{item.producto}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                  <span>Stock: {item.stock}</span>
                  <span>Mínimo: {item.minimo}</span>
                </div>
                <div className="mt-3">
                  <Badge variant="danger">Stock bajo</Badge>
                </div>
              </div>
            ))}
            {!isLoading && data.stockBajo.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No hay productos con stock bajo.</div>
            ) : null}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Producto</th>
                  <th className="pb-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Stock actual</th>
                  <th className="pb-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Stock minimo</th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.stockBajo.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3 text-sm text-slate-900">{item.producto}</td>
                    <td className="py-3 text-center text-sm font-medium text-slate-900">{item.stock}</td>
                    <td className="py-3 text-center text-sm text-slate-600">{item.minimo}</td>
                    <td className="py-3">
                      <Badge variant="danger">Stock bajo</Badge>
                    </td>
                  </tr>
                ))}
                {!isLoading && data.stockBajo.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-slate-500">
                      No hay productos con stock bajo.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
