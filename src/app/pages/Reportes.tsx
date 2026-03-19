import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Briefcase, DollarSign, Download, FileText, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { formatCurrency } from '../lib/utils';
import { getReportes, type ReportesResumen } from '../lib/reportes-api';
import { toast } from 'sonner';
import { exportRowsToCsv, printHtmlAsPdf } from '../lib/export';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const estadoColors: Record<string, string> = {
  ENTREGADO: '#10b981',
  EN_PROCESO: '#3b82f6',
  PENDIENTE: '#f59e0b',
  TERMINADO: '#6366f1',
  CANCELADO: '#ef4444',
};

const emptyReport: ReportesResumen = {
  totalIngresos: 0,
  totalGastos: 0,
  utilidadNeta: 0,
  trabajosRealizados: 0,
  ingresosVsGastos: [],
  trabajosPorEstado: [],
  clientesConSaldo: [],
  productosUsados: [],
};

function formatEstadoLabel(estado: string) {
  return estado
    .toLowerCase()
    .split('_')
    .map((fragment) => fragment.charAt(0).toUpperCase() + fragment.slice(1))
    .join(' ');
}

export default function Reportes() {
  const [periodo, setPeriodo] = useState('mes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [data, setData] = useState<ReportesResumen>(emptyReport);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadReportes() {
      try {
        setIsLoading(true);
        const reportes = await getReportes(periodo, periodo === 'personalizado' ? desde : undefined, periodo === 'personalizado' ? hasta : undefined);

        if (isMounted) {
          setData(reportes);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los reportes.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReportes();

    return () => {
      isMounted = false;
    };
  }, [periodo, desde, hasta]);

  const trabajosPorEstado = useMemo(() => {
    return data.trabajosPorEstado.map((item) => ({
      ...item,
      label: formatEstadoLabel(item.estado),
      color: estadoColors[item.estado] || '#64748b',
    }));
  }, [data.trabajosPorEstado]);

  function handleClearFilters() {
    setPeriodo('mes');
    setDesde('');
    setHasta('');
  }

  function handleExportExcel() {
    exportRowsToCsv(
      'reporte-resumen.csv',
      ['Concepto', 'Valor'],
      [
        ['Total ingresos', data.totalIngresos],
        ['Total gastos', data.totalGastos],
        ['Utilidad neta', data.utilidadNeta],
        ['Trabajos realizados', data.trabajosRealizados],
      ],
    );
    toast.success('Resumen exportado a Excel.');
  }

  function handleExportPdf() {
    const periodLabel = periodo === 'personalizado'
      ? `Desde ${desde || '-'} hasta ${hasta || '-'}`
      : periodo;

    const html = `
      <h1>Reporte de Vidrieria</h1>
      <p class="muted">Periodo: ${periodLabel}</p>
      <div class="grid">
        <div class="card"><strong>Total ingresos</strong><p>${formatCurrency(data.totalIngresos)}</p></div>
        <div class="card"><strong>Total gastos</strong><p>${formatCurrency(data.totalGastos)}</p></div>
        <div class="card"><strong>Utilidad neta</strong><p>${formatCurrency(data.utilidadNeta)}</p></div>
        <div class="card"><strong>Trabajos realizados</strong><p>${data.trabajosRealizados}</p></div>
      </div>
      <h2>Trabajos por estado</h2>
      <table>
        <thead><tr><th>Estado</th><th>Cantidad</th></tr></thead>
        <tbody>
          ${trabajosPorEstado.map((item) => `<tr><td>${item.label}</td><td>${item.cantidad}</td></tr>`).join('')}
        </tbody>
      </table>
      <h2>Clientes con saldo</h2>
      <table>
        <thead><tr><th>Cliente</th><th>Saldo</th></tr></thead>
        <tbody>
          ${data.clientesConSaldo.map((item) => `<tr><td>${item.cliente}</td><td>${formatCurrency(item.saldo)}</td></tr>`).join('')}
        </tbody>
      </table>
      <h2>Productos mas usados</h2>
      <table>
        <thead><tr><th>Producto</th><th>Cantidad</th></tr></thead>
        <tbody>
          ${data.productosUsados.map((item) => `<tr><td>${item.producto}</td><td>${item.cantidad}</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    printHtmlAsPdf('reporte-vidrieria', html);
    toast.success('Vista lista para guardar como PDF.');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-600 mt-1">Analisis y estadisticas del negocio</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value)}
            options={[
              { value: 'dia', label: 'Hoy' },
              { value: 'semana', label: 'Esta semana' },
              { value: 'mes', label: 'Este mes' },
              { value: 'anio', label: 'Este ano' },
              { value: 'personalizado', label: 'Rango personalizado' },
            ]}
          />
          {periodo === 'personalizado' ? (
            <>
              <Input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
              <Input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
            </>
          ) : null}
          <Button variant="outline" onClick={handleClearFilters}>
            <RotateCcw className="w-4 h-4" />
            Limpiar
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <FileText className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total ingresos</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(data.totalIngresos)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total gastos</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(data.totalGastos)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Trabajos realizados</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{data.trabajosRealizados}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Utilidad neta</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {formatCurrency(data.utilidadNeta)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos en el periodo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.ingresosVsGastos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} name="Ingresos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos en el periodo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.ingresosVsGastos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trabajos por estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={trabajosPorEstado}
                  dataKey="cantidad"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {trabajosPorEstado.map((entry) => (
                    <Cell key={entry.estado} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos mas utilizados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.productosUsados} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="producto" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#3b82f6" name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Clientes con saldo pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.clientesConSaldo.map((cliente) => (
                    <tr key={cliente.cliente} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{cliente.cliente}</td>
                      <td className="px-4 py-3 text-sm text-red-600 text-right font-medium">
                        {formatCurrency(cliente.saldo)}
                      </td>
                    </tr>
                  ))}
                  {!isLoading && data.clientesConSaldo.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-10 text-center text-sm text-gray-500">
                        No hay saldos pendientes en este periodo.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de trabajos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trabajosPorEstado.map((item) => (
                <div key={item.estado} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.cantidad}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-sm font-bold text-gray-900">{data.trabajosRealizados}</span>
              </div>
              {!isLoading && trabajosPorEstado.length === 0 ? (
                <p className="text-sm text-gray-500">No hay trabajos registrados en este periodo.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
