import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Briefcase, DollarSign, Download, FileText, RotateCcw, Sparkles, Scale, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { formatCurrency } from '../lib/utils';
import { getReportes, type ReportesResumen } from '../lib/reportes-api';
import { toast } from 'sonner';
import { exportSheetsToExcel, printHtmlAsPdf } from '../lib/export';
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
  comparativo: {
    ingresos: { actual: 0, anterior: 0, diferencia: 0, porcentaje: null },
    gastos: { actual: 0, anterior: 0, diferencia: 0, porcentaje: null },
    utilidad: { actual: 0, anterior: 0, diferencia: 0, porcentaje: null },
    trabajos: { actual: 0, anterior: 0, diferencia: 0, porcentaje: null },
  },
  trabajosRentables: [],
  clientesConMasCompras: [],
};

function formatEstadoLabel(estado: string) {
  return estado
    .toLowerCase()
    .split('_')
    .map((fragment) => fragment.charAt(0).toUpperCase() + fragment.slice(1))
    .join(' ');
}

function formatComparativoValue(value: number, suffix = '') {
  const signal = value > 0 ? '+' : '';
  return `${signal}${value.toFixed(1)}${suffix}`;
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

  const periodLabel = useMemo(() => {
    if (periodo === 'personalizado') {
      return `Desde ${desde || '-'} hasta ${hasta || '-'}`;
    }

    const labels: Record<string, string> = {
      dia: 'Hoy',
      semana: 'Esta semana',
      mes: 'Este mes',
      anio: 'Este ano',
    };

    return labels[periodo] || 'Periodo actual';
  }, [periodo, desde, hasta]);

  function handleClearFilters() {
    setPeriodo('mes');
    setDesde('');
    setHasta('');
  }

  function handleExportExcel() {
    exportSheetsToExcel('reporte-vidrieria', [
      {
        sheetName: 'Resumen',
        headers: ['Concepto', 'Valor'],
        rows: [
          ['Periodo', periodLabel],
          ['Total ingresos', data.totalIngresos],
          ['Total gastos', data.totalGastos],
          ['Utilidad neta', data.utilidadNeta],
          ['Trabajos realizados', data.trabajosRealizados],
        ],
      },
      {
        sheetName: 'Comparativo',
        headers: ['Indicador', 'Actual', 'Anterior', 'Diferencia', 'Porcentaje'],
        rows: [
          ['Ingresos', data.comparativo.ingresos.actual, data.comparativo.ingresos.anterior, data.comparativo.ingresos.diferencia, data.comparativo.ingresos.porcentaje == null ? 'N/A' : `${data.comparativo.ingresos.porcentaje.toFixed(1)}%`],
          ['Gastos', data.comparativo.gastos.actual, data.comparativo.gastos.anterior, data.comparativo.gastos.diferencia, data.comparativo.gastos.porcentaje == null ? 'N/A' : `${data.comparativo.gastos.porcentaje.toFixed(1)}%`],
          ['Utilidad', data.comparativo.utilidad.actual, data.comparativo.utilidad.anterior, data.comparativo.utilidad.diferencia, data.comparativo.utilidad.porcentaje == null ? 'N/A' : `${data.comparativo.utilidad.porcentaje.toFixed(1)}%`],
          ['Trabajos', data.comparativo.trabajos.actual, data.comparativo.trabajos.anterior, data.comparativo.trabajos.diferencia, data.comparativo.trabajos.porcentaje == null ? 'N/A' : `${data.comparativo.trabajos.porcentaje.toFixed(1)}%`],
        ],
      },
      {
        sheetName: 'Rentabilidad',
        headers: ['Numero', 'Cliente', 'Descripcion', 'Estado', 'Total', 'Costo materiales', 'Utilidad estimada', 'Margen'],
        rows: data.trabajosRentables.map((trabajo) => [
          trabajo.numero,
          trabajo.cliente,
          trabajo.descripcion,
          trabajo.estado,
          trabajo.total,
          trabajo.costoMateriales,
          trabajo.utilidadEstimada,
          `${trabajo.margenPorcentaje.toFixed(1)}%`,
        ]),
      },
      {
        sheetName: 'Clientes deuda',
        headers: ['Cliente', 'Saldo pendiente'],
        rows: data.clientesConSaldo.map((cliente) => [cliente.cliente, cliente.saldo]),
      },
      {
        sheetName: 'Clientes compras',
        headers: ['Cliente', 'Total compras', 'Trabajos'],
        rows: data.clientesConMasCompras.map((cliente) => [cliente.cliente, cliente.totalCompras, cliente.trabajos]),
      },
      {
        sheetName: 'Productos',
        headers: ['Producto', 'Cantidad'],
        rows: data.productosUsados.map((producto) => [producto.producto, producto.cantidad]),
      },
    ]);
    toast.success('Reporte completo exportado en Excel.');
  }

  function handleExportPdf() {
    const html = `
      <h1>Reporte de Vidrieria</h1>
      <p class="muted">Periodo: ${periodLabel}</p>
      <div class="grid">
        <div class="card"><strong>Total ingresos</strong><p>${formatCurrency(data.totalIngresos)}</p></div>
        <div class="card"><strong>Total gastos</strong><p>${formatCurrency(data.totalGastos)}</p></div>
        <div class="card"><strong>Utilidad neta</strong><p>${formatCurrency(data.utilidadNeta)}</p></div>
        <div class="card"><strong>Trabajos realizados</strong><p>${data.trabajosRealizados}</p></div>
      </div>
      <h2>Comparativo con periodo anterior</h2>
      <table>
        <thead><tr><th>Indicador</th><th>Actual</th><th>Anterior</th><th>Diferencia</th><th>Variacion</th></tr></thead>
        <tbody>
          <tr><td>Ingresos</td><td>${formatCurrency(data.comparativo.ingresos.actual)}</td><td>${formatCurrency(data.comparativo.ingresos.anterior)}</td><td>${formatCurrency(data.comparativo.ingresos.diferencia)}</td><td>${data.comparativo.ingresos.porcentaje == null ? 'N/A' : `${data.comparativo.ingresos.porcentaje.toFixed(1)}%`}</td></tr>
          <tr><td>Gastos</td><td>${formatCurrency(data.comparativo.gastos.actual)}</td><td>${formatCurrency(data.comparativo.gastos.anterior)}</td><td>${formatCurrency(data.comparativo.gastos.diferencia)}</td><td>${data.comparativo.gastos.porcentaje == null ? 'N/A' : `${data.comparativo.gastos.porcentaje.toFixed(1)}%`}</td></tr>
          <tr><td>Utilidad</td><td>${formatCurrency(data.comparativo.utilidad.actual)}</td><td>${formatCurrency(data.comparativo.utilidad.anterior)}</td><td>${formatCurrency(data.comparativo.utilidad.diferencia)}</td><td>${data.comparativo.utilidad.porcentaje == null ? 'N/A' : `${data.comparativo.utilidad.porcentaje.toFixed(1)}%`}</td></tr>
          <tr><td>Trabajos</td><td>${data.comparativo.trabajos.actual}</td><td>${data.comparativo.trabajos.anterior}</td><td>${data.comparativo.trabajos.diferencia}</td><td>${data.comparativo.trabajos.porcentaje == null ? 'N/A' : `${data.comparativo.trabajos.porcentaje.toFixed(1)}%`}</td></tr>
        </tbody>
      </table>
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
      <h2>Trabajos con mayor rentabilidad estimada</h2>
      <table>
        <thead><tr><th>Trabajo</th><th>Cliente</th><th>Total</th><th>Costo materiales</th><th>Utilidad</th><th>Margen</th></tr></thead>
        <tbody>
          ${data.trabajosRentables.map((item) => `<tr><td>${item.numero}</td><td>${item.cliente}</td><td>${formatCurrency(item.total)}</td><td>${formatCurrency(item.costoMateriales)}</td><td>${formatCurrency(item.utilidadEstimada)}</td><td>${item.margenPorcentaje.toFixed(1)}%</td></tr>`).join('')}
        </tbody>
      </table>
      <h2>Clientes con más compras</h2>
      <table>
        <thead><tr><th>Cliente</th><th>Total compras</th><th>Trabajos</th></tr></thead>
        <tbody>
          ${data.clientesConMasCompras.map((item) => `<tr><td>${item.cliente}</td><td>${formatCurrency(item.totalCompras)}</td><td>${item.trabajos}</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    printHtmlAsPdf('reporte-vidrieria', html);
    toast.success('Vista lista para guardar como PDF.');
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section
        className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm"
        style={{
          backgroundImage: 'linear-gradient(90deg, #ffffff 0%, var(--brand-50) 65%, color-mix(in srgb, var(--brand-100) 65%, white) 100%)',
        }}
      >
        <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="space-y-4">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]"
              style={{
                border: '1px solid color-mix(in srgb, var(--brand-600) 20%, white)',
                background: 'color-mix(in srgb, var(--brand-100) 65%, white)',
                color: 'var(--brand-700)',
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Centro de analisis
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Reportes del negocio</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Consulta ingresos, gastos y productividad por rango de fechas para presentar resultados o tomar decisiones operativas.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Periodo activo</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{periodLabel}</p>
            <p className="mt-1 text-sm text-slate-600">Puedes exportar este mismo corte en Excel o PDF.</p>
          </div>
        </div>
      </section>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Filtros y exportacion</CardTitle>
            <CardDescription>Ajusta el rango y genera una salida lista para revisar o compartir.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
                <Input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} className="w-full sm:w-auto" />
                <Input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} className="w-full sm:w-auto" />
              </>
            ) : null}
            <Button variant="outline" onClick={handleClearFilters} className="w-full sm:w-auto">
              <RotateCcw className="w-4 h-4" />
              Limpiar
            </Button>
            <Button variant="outline" onClick={handleExportExcel} className="w-full sm:w-auto">
              <Download className="w-4 h-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={handleExportPdf} className="w-full sm:w-auto">
              <FileText className="w-4 h-4" />
              PDF
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div>
        <h2 className="text-xl font-semibold text-slate-900">Resumen ejecutivo</h2>
        <p className="mt-1 text-sm text-slate-600">Lectura rapida del rendimiento financiero y operativo en el periodo elegido.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-white to-emerald-50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total ingresos</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {formatCurrency(data.totalIngresos)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  vs anterior: {formatCurrency(data.comparativo.ingresos.anterior)} {data.comparativo.ingresos.porcentaje != null ? `(${formatComparativoValue(data.comparativo.ingresos.porcentaje, '%')})` : ''}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 ring-1 ring-emerald-200">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-rose-200 bg-gradient-to-br from-white to-rose-50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total gastos</p>
                <p className="mt-1 text-2xl font-bold text-rose-700">
                  {formatCurrency(data.totalGastos)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  vs anterior: {formatCurrency(data.comparativo.gastos.anterior)} {data.comparativo.gastos.porcentaje != null ? `(${formatComparativoValue(data.comparativo.gastos.porcentaje, '%')})` : ''}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 ring-1 ring-rose-200">
                <TrendingDown className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-sky-200 bg-gradient-to-br from-white to-sky-50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Trabajos realizados</p>
                <p className="mt-1 text-2xl font-bold text-sky-700">{data.trabajosRealizados}</p>
                <p className="mt-2 text-xs text-slate-500">
                  vs anterior: {data.comparativo.trabajos.anterior} {data.comparativo.trabajos.porcentaje != null ? `(${formatComparativoValue(data.comparativo.trabajos.porcentaje, '%')})` : ''}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 ring-1 ring-sky-200">
                <Briefcase className="w-6 h-6 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-violet-200 bg-gradient-to-br from-white to-violet-50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Utilidad neta</p>
                <p className="mt-1 text-2xl font-bold text-violet-700">
                  {formatCurrency(data.utilidadNeta)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  vs anterior: {formatCurrency(data.comparativo.utilidad.anterior)} {data.comparativo.utilidad.porcentaje != null ? `(${formatComparativoValue(data.comparativo.utilidad.porcentaje, '%')})` : ''}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 ring-1 ring-violet-200">
                <DollarSign className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Tendencia del periodo</CardTitle>
            <CardDescription>Comparativo visual de ingresos y gastos dentro del rango seleccionado.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.ingresosVsGastos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} name="Ingresos" />
                <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} name="Gastos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Lectura rapida</CardTitle>
            <CardDescription>Indicadores utiles para explicar el rendimiento en una reunion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Comparativo del periodo</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {data.comparativo.ingresos.diferencia >= 0 ? 'Ingresos al alza' : 'Ingresos por debajo del periodo anterior'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Diferencia de {formatCurrency(data.comparativo.ingresos.diferencia)} frente al corte anterior equivalente.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Margen estimado</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {data.totalIngresos > 0 ? `${((data.utilidadNeta / data.totalIngresos) * 100).toFixed(1)}%` : '0.0%'}
              </p>
              <p className="mt-1 text-sm text-slate-600">Relacion entre utilidad neta e ingresos del periodo.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Clientes con saldo</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{data.clientesConSaldo.length}</p>
              <p className="mt-1 text-sm text-slate-600">Clientes que todavia mantienen deuda pendiente.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Producto mas usado</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{data.productosUsados[0]?.producto || 'Sin registros'}</p>
              <p className="mt-1 text-sm text-slate-600">Ayuda a identificar materiales de mayor rotacion.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-violet-600" />
              <div>
                <CardTitle>Rentabilidad por trabajo</CardTitle>
                <CardDescription>Estimacion basada en total facturado menos costo de materiales registrados.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {data.trabajosRentables.map((trabajo) => (
                <div key={trabajo.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-900">{trabajo.numero}</p>
                  <p className="mt-1 text-sm text-slate-600">{trabajo.cliente}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-medium text-emerald-600">{formatCurrency(trabajo.utilidadEstimada)}</span>
                    <span className="text-slate-700">{trabajo.margenPorcentaje.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
              {!isLoading && data.trabajosRentables.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">No hay trabajos con materiales registrados en este periodo.</div>
              ) : null}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Trabajo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Cliente</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Utilidad</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.trabajosRentables.map((trabajo) => (
                    <tr key={trabajo.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div className="font-medium">{trabajo.numero}</div>
                        <div className="text-xs text-slate-500">{trabajo.descripcion}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{trabajo.cliente}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-emerald-600">{formatCurrency(trabajo.utilidadEstimada)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{trabajo.margenPorcentaje.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {!isLoading && data.trabajosRentables.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                        No hay trabajos con materiales registrados en este periodo.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-sky-600" />
              <div>
                <CardTitle>Clientes con más compras</CardTitle>
                <CardDescription>Ranking por monto trabajado dentro del periodo seleccionado.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {data.clientesConMasCompras.map((cliente) => (
                <div key={cliente.cliente} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-900">{cliente.cliente}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-medium text-sky-700">{formatCurrency(cliente.totalCompras)}</span>
                    <span className="text-slate-700">{cliente.trabajos} trabajos</span>
                  </div>
                </div>
              ))}
              {!isLoading && data.clientesConMasCompras.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">No hay compras registradas en este periodo.</div>
              ) : null}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Cliente</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Compras</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Trabajos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.clientesConMasCompras.map((cliente) => (
                    <tr key={cliente.cliente} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-sm text-slate-900">{cliente.cliente}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-sky-700">{formatCurrency(cliente.totalCompras)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{cliente.trabajos}</td>
                    </tr>
                  ))}
                  {!isLoading && data.clientesConMasCompras.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">
                        No hay compras registradas en este periodo.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Trabajos por estado</CardTitle>
            <CardDescription>Distribucion actual del flujo operativo.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={260}>
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

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Productos mas utilizados</CardTitle>
            <CardDescription>Materiales con mayor salida dentro del periodo.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.productosUsados} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis dataKey="producto" type="category" width={150} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#3b82f6" name="Cantidad" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Clientes con saldo pendiente</CardTitle>
            <CardDescription>Ayuda a priorizar seguimiento de cobros.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {data.clientesConSaldo.map((cliente) => (
                <div key={cliente.cliente} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-900">{cliente.cliente}</p>
                  <p className="mt-2 text-sm font-semibold text-rose-600">{formatCurrency(cliente.saldo)}</p>
                </div>
              ))}
              {!isLoading && data.clientesConSaldo.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">No hay saldos pendientes en este periodo.</div>
              ) : null}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Cliente</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.clientesConSaldo.map((cliente) => (
                    <tr key={cliente.cliente} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-sm text-slate-900">{cliente.cliente}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-rose-600">
                        {formatCurrency(cliente.saldo)}
                      </td>
                    </tr>
                  ))}
                  {!isLoading && data.clientesConSaldo.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-10 text-center text-sm text-slate-500">
                        No hay saldos pendientes en este periodo.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Resumen de trabajos</CardTitle>
            <CardDescription>Lectura compacta del estado actual de ejecucion.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trabajosPorEstado.map((item) => (
                <div key={item.estado} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{item.cantidad}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="text-sm font-semibold text-slate-900">Total</span>
                <span className="text-sm font-bold text-slate-900">{data.trabajosRealizados}</span>
              </div>
              {!isLoading && trabajosPorEstado.length === 0 ? (
                <p className="text-sm text-slate-500">No hay trabajos registrados en este periodo.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

