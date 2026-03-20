import { useEffect, useMemo, useState } from 'react';
import { Search, Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
      const matchSearch =
        movimiento.descripcion.toLowerCase().includes(search) ||
        (movimiento.referencia || '').toLowerCase().includes(search);
      const matchTipo = filtroTipo === 'todos' || tipoNormalizado === filtroTipo;

      return matchSearch && matchTipo;
    });
  }, [filtroTipo, movimientos, searchTerm]);

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

  const saldoCaja = movimientos.reduce((sum, movimiento) => {
    return movimiento.tipo === 'INGRESO' ? sum + movimiento.monto : sum - movimiento.monto;
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
        <p className="text-sm text-gray-600 mt-1">Control de ingresos y salidas</p>
      </div>

      <Card className="border-none" style={{ backgroundImage: 'linear-gradient(135deg, var(--brand-600), var(--brand-700))' }}>
        <CardContent className="p-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <p className="mb-1 text-sm text-white/80">Saldo en caja</p>
              <p className="text-4xl font-bold text-white">{formatCurrency(saldoCaja)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Balance del día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Ingresos</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(ingresosDia)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Gastos</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(salidasDia)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div
                className={`w-12 h-12 ${
                  balanceDia >= 0 ? 'bg-[var(--brand-100)]' : 'bg-red-100'
                } rounded-lg flex items-center justify-center flex-shrink-0`}
              >
                <DollarSign
                  className={`w-6 h-6 ${balanceDia >= 0 ? 'text-[var(--brand-600)]' : 'text-red-600'}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Balance neto</p>
                <p
                  className={`text-2xl font-bold ${
                    balanceDia >= 0 ? 'text-[var(--brand-600)]' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(balanceDia)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Ingresos semanales</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(ingresosSemana)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Gastos semanales</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(salidasSemana)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Balance semanal</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                balanceSemana >= 0 ? 'text-[var(--brand-600)]' : 'text-red-600'
              }`}
            >
              {formatCurrency(balanceSemana)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar movimientos..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)] focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltroTipo('todos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroTipo === 'todos'
                    ? 'bg-[var(--brand-600)] text-[var(--brand-contrast)]'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroTipo('ingreso')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroTipo === 'ingreso'
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setFiltroTipo('salida')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroTipo === 'salida'
                    ? 'bg-red-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMovimientos.map((movimiento) => (
                  <tr key={movimiento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(movimiento.fecha)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={movimiento.tipo === 'INGRESO' ? 'success' : 'danger'}>
                        {movimiento.tipo === 'INGRESO' ? 'Ingreso' : 'Salida'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{movimiento.descripcion}</td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                        movimiento.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {movimiento.tipo === 'INGRESO' ? '+' : '-'}
                      {formatCurrency(movimiento.monto)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {movimiento.referencia || '-'}
                    </td>
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
