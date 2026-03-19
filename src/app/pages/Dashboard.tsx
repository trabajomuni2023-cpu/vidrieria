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
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Resumen general del negocio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{kpi.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mb-2">{kpi.value}</p>
                    <p className="text-xs text-gray-500">{kpi.change}</p>
                  </div>
                  <div className={`w-12 h-12 ${kpi.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ingresos vs Gastos (ultimos 3 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
                <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas importantes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.alertas.length === 0 && !isLoading ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                No hay alertas activas por ahora.
              </div>
            ) : (
              <div className="space-y-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ultimos trabajos</CardTitle>
            <Link to="/dashboard/trabajos" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 pb-3">Cliente</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-3">Descripcion</th>
                    <th className="text-right text-xs font-medium text-gray-500 pb-3">Total</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.recentTrabajos.map((trabajo) => (
                    <tr key={trabajo.id} className="hover:bg-gray-50">
                      <td className="py-3 text-sm text-gray-900">{trabajo.cliente}</td>
                      <td className="py-3 text-sm text-gray-600">{trabajo.descripcion}</td>
                      <td className="py-3 text-sm text-gray-900 text-right">{formatCurrency(trabajo.total)}</td>
                      <td className="py-3">{getEstadoBadge(trabajo.estado)}</td>
                    </tr>
                  ))}
                  {!isLoading && data.recentTrabajos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                        No hay trabajos recientes.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pagos recientes</CardTitle>
            <Link to="/dashboard/pagos" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 pb-3">Cliente</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-3">Tipo</th>
                    <th className="text-right text-xs font-medium text-gray-500 pb-3">Monto</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-3">Metodo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.recentPagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-gray-50">
                      <td className="py-3 text-sm text-gray-900">{pago.cliente}</td>
                      <td className="py-3 text-sm text-gray-600">{pago.tipo}</td>
                      <td className="py-3 text-sm text-green-600 text-right font-medium">{formatCurrency(pago.monto)}</td>
                      <td className="py-3 text-sm text-gray-600">{pago.metodo}</td>
                    </tr>
                  ))}
                  {!isLoading && data.recentPagos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
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

      <Card>
        <CardHeader>
          <CardTitle>Productos con stock bajo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 pb-3">Producto</th>
                  <th className="text-center text-xs font-medium text-gray-500 pb-3">Stock actual</th>
                  <th className="text-center text-xs font-medium text-gray-500 pb-3">Stock minimo</th>
                  <th className="text-left text-xs font-medium text-gray-500 pb-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.stockBajo.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-3 text-sm text-gray-900">{item.producto}</td>
                    <td className="py-3 text-sm text-gray-900 text-center font-medium">{item.stock}</td>
                    <td className="py-3 text-sm text-gray-600 text-center">{item.minimo}</td>
                    <td className="py-3">
                      <Badge variant="danger">Stock bajo</Badge>
                    </td>
                  </tr>
                ))}
                {!isLoading && data.stockBajo.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
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
