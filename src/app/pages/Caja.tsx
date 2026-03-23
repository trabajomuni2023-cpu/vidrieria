import { useEffect, useMemo, useState } from 'react';
import { Search, Wallet, TrendingUp, TrendingDown, DollarSign, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { formatCurrency, formatDate } from '../lib/utils';
import { getMovimientosCaja, type MovimientoCaja } from '../lib/caja-api';
import { toast } from 'sonner';

function getStartOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getStartOfWeek(date = new Date()) {
  const start = getStartOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  return start;
}

export default function Caja() {
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMovimientos() {
      try {
        const data = await getMovimientosCaja();
        if (isMounted) {
          setMovimientos(data);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar la caja.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadMovimientos();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredMovimientos = useMemo(() => {
    return movimientos.filter((movimiento) => {
      const search = searchTerm.toLowerCase();
      const tipoNormalizado = movimiento.tipo.toLowerCase();
      const fechaMovimiento = new Date(movimiento.fecha);
      const matchSearch =
        movimiento.descripcion.toLowerCase().includes(search) ||
        (movimiento.referencia || '').toLowerCase().includes(search);
      const matchTipo = filtroTipo === 'todos' || tipoNormalizado === filtroTipo;
      const matchDesde = !fechaDesde || fechaMovimiento >= new Date(`${fechaDesde}T00:00:00`);
      const matchHasta = !fechaHasta || fechaMovimiento <= new Date(`${fechaHasta}T23:59:59`);

      return matchSearch && matchTipo && matchDesde && matchHasta;
    });
  }, [fechaDesde, fechaHasta, filtroTipo, movimientos, searchTerm]);

  const startDay = getStartOfDay();
  const startWeek = getStartOfWeek();

  const ingresosDia = movimientos
    .filter((movimiento) => movimiento.tipo === 'INGRESO' && new Date(movimiento.fecha) >= startDay)
    .reduce((sum, movimiento) => sum + movimiento.monto, 0);
  const salidasDia = movimientos
    .filter((movimiento) => movimiento.tipo === 'SALIDA' && new Date(movimiento.fecha) >= startDay)
    .reduce((sum, movimiento) => sum + movimiento.monto, 0);
  const balanceDia = ingresosDia - salidasDia;

  const ingresosSemana = movimientos
    .filter((movimiento) => movimiento.tipo === 'INGRESO' && new Date(movimiento.fecha) >= startWeek)
    .reduce((sum, movimiento) => sum + movimiento.monto, 0);
  const salidasSemana = movimientos
    .filter((movimiento) => movimiento.tipo === 'SALIDA' && new Date(movimiento.fecha) >= startWeek)
    .reduce((sum, movimiento) => sum + movimiento.monto, 0);
  const balanceSemana = ingresosSemana - salidasSemana;

  const ingresosRango = filteredMovimientos
    .filter((movimiento) => movimiento.tipo === 'INGRESO')
    .reduce((sum, movimiento) => sum + movimiento.monto, 0);
  const salidasRango = filteredMovimientos
    .filter((movimiento) => movimiento.tipo === 'SALIDA')
    .reduce((sum, movimiento) => sum + movimiento.monto, 0);
  const balanceRango = ingresosRango - salidasRango;

  const saldoCaja = movimientos.reduce((sum, movimiento) => {
    return movimiento.tipo === 'INGRESO' ? sum + movimiento.monto : sum - movimiento.monto;
  }, 0);

  function handleClearFilters() {
    setSearchTerm('');
    setFiltroTipo('todos');
    setFechaDesde('');
    setFechaHasta('');
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
        <p className="mt-1 text-sm text-gray-600">Control de ingresos y salidas</p>
      </div>

      <Card className="border-none" style={{ backgroundImage: 'linear-gradient(135deg, var(--brand-600), var(--brand-700))' }}>
        <CardContent className="p-5 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <p className="mb-1 text-sm text-white/80">Saldo en caja</p>
              <p className="text-3xl font-bold text-white sm:text-4xl">{formatCurrency(saldoCaja)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Balance del día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-600">Ingresos</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(ingresosDia)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-600">Gastos</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(salidasDia)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${balanceDia >= 0 ? 'bg-[var(--brand-100)]' : 'bg-red-100'}`}>
                <DollarSign className={`h-6 w-6 ${balanceDia >= 0 ? 'text-[var(--brand-600)]' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-600">Balance neto</p>
                <p className={`text-2xl font-bold ${balanceDia >= 0 ? 'text-[var(--brand-600)]' : 'text-red-600'}`}>
                  {formatCurrency(balanceDia)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Ingresos semanales</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(ingresosSemana)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Gastos semanales</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(salidasSemana)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Balance semanal</p>
            <p className={`mt-1 text-2xl font-bold ${balanceSemana >= 0 ? 'text-[var(--brand-600)]' : 'text-red-600'}`}>
              {formatCurrency(balanceSemana)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Ingresos del rango</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(ingresosRango)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Gastos del rango</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(salidasRango)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Balance del rango</p>
            <p className={`mt-1 text-2xl font-bold ${balanceRango >= 0 ? 'text-[var(--brand-600)]' : 'text-red-600'}`}>
              {formatCurrency(balanceRango)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="relative w-full flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar movimientos..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)]"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Input type="date" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} className="w-full" />
              <Input type="date" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} className="w-full" />
              <button
                onClick={handleClearFilters}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 xl:w-auto"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFiltroTipo('todos')}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filtroTipo === 'todos' ? 'bg-[var(--brand-600)] text-[var(--brand-contrast)]' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroTipo('ingreso')}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filtroTipo === 'ingreso' ? 'bg-green-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setFiltroTipo('salida')}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filtroTipo === 'salida' ? 'bg-red-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Salidas
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200 md:hidden">
            {filteredMovimientos.map((movimiento) => (
              <div key={movimiento.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{movimiento.descripcion}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(movimiento.fecha)}</p>
                  </div>
                  <Badge variant={movimiento.tipo === 'INGRESO' ? 'success' : 'danger'}>
                    {movimiento.tipo === 'INGRESO' ? 'Ingreso' : 'Salida'}
                  </Badge>
                </div>
                <div className="rounded-2xl bg-gray-50 p-3 text-sm">
                  <p className={`font-bold ${movimiento.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                    {movimiento.tipo === 'INGRESO' ? '+' : '-'}
                    {formatCurrency(movimiento.monto)}
                  </p>
                  <p className="mt-2 text-gray-600">{movimiento.referencia || 'Sin referencia'}</p>
                </div>
              </div>
            ))}
            {!isLoading && filteredMovimientos.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                No hay movimientos en caja todavía.
              </div>
            ) : null}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Descripción</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMovimientos.map((movimiento) => (
                  <tr key={movimiento.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{formatDate(movimiento.fecha)}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={movimiento.tipo === 'INGRESO' ? 'success' : 'danger'}>
                        {movimiento.tipo === 'INGRESO' ? 'Ingreso' : 'Salida'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{movimiento.descripcion}</td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-bold ${movimiento.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                      {movimiento.tipo === 'INGRESO' ? '+' : '-'}
                      {formatCurrency(movimiento.monto)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{movimiento.referencia || '-'}</td>
                  </tr>
                ))}
                {!isLoading && filteredMovimientos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                      No hay movimientos en caja todavía.
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
