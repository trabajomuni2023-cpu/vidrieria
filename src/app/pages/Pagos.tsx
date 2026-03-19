import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, CreditCard, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { createPago, getPagos, type Pago } from '../lib/pagos-api';
import { getTrabajos, type Trabajo } from '../lib/trabajos-api';

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Pagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pagoData, setPagoData] = useState({
    trabajoId: '',
    monto: '',
    metodo: 'EFECTIVO',
    tipo: 'ADELANTO',
  });

  const loadData = async () => {
    try {
      const [pagosData, trabajosData] = await Promise.all([getPagos(), getTrabajos()]);
      setPagos(pagosData);
      setTrabajos(trabajosData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los pagos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredPagos = useMemo(
    () =>
      pagos.filter((pago) => {
        const matchSearch =
          pago.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pago.trabajo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchMetodo = filtroMetodo === 'todos' || pago.metodo === filtroMetodo;
        return matchSearch && matchMetodo;
      }),
    [pagos, searchTerm, filtroMetodo],
  );

  const hoy = new Date().toISOString().split('T')[0];
  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - 7);
  const inicioMes = new Date();
  inicioMes.setDate(1);

  const totalHoy = pagos.filter((pago) => pago.fecha.startsWith(hoy)).reduce((sum, pago) => sum + pago.monto, 0);
  const totalSemana = pagos.filter((pago) => new Date(pago.fecha) >= inicioSemana).reduce((sum, pago) => sum + pago.monto, 0);
  const totalMes = pagos.filter((pago) => new Date(pago.fecha) >= inicioMes).reduce((sum, pago) => sum + pago.monto, 0);

  const trabajoOptions = [
    { value: '', label: 'Seleccionar trabajo' },
    ...trabajos.map((trabajo) => ({
      value: trabajo.id,
      label: `${trabajo.cliente} - ${trabajo.descripcion}`,
    })),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submit = async () => {
      setIsSaving(true);

      try {
        const pago = await createPago(pagoData);
        setPagos((current) => [pago, ...current]);
        setPagoData({ trabajoId: '', monto: '', metodo: 'EFECTIVO', tipo: 'ADELANTO' });
        setIsModalOpen(false);
        toast.success('Pago registrado correctamente');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo registrar el pago');
      } finally {
        setIsSaving(false);
      }
    };

    void submit();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-sm text-gray-600 mt-1">Registro de pagos recibidos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Registrar Pago
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total hoy</p><p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalHoy)}</p></div><div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total semana</p><p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalSemana)}</p></div><div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><CreditCard className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total mes</p><p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalMes)}</p></div><div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><CreditCard className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente o trabajo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {[
                ['todos', 'Todos'],
                ['EFECTIVO', 'Efectivo'],
                ['TRANSFERENCIA', 'Transferencia'],
                ['TARJETA', 'Tarjeta'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFiltroMetodo(value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filtroMetodo === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">Cargando pagos...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trabajo asociado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(pago.fecha)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{pago.cliente}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{pago.trabajo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-bold">{formatCurrency(pago.monto)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><Badge variant={pago.metodo === 'EFECTIVO' ? 'success' : 'info'}>{formatEnumLabel(pago.metodo)}</Badge></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatEnumLabel(pago.tipo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Pago" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Trabajo asociado" value={pagoData.trabajoId} onChange={(e) => setPagoData({ ...pagoData, trabajoId: e.target.value })} options={trabajoOptions} required />
          <Input label="Monto" type="number" step="0.01" value={pagoData.monto} onChange={(e) => setPagoData({ ...pagoData, monto: e.target.value })} placeholder="0.00" required />
          <Select label="Método de pago" value={pagoData.metodo} onChange={(e) => setPagoData({ ...pagoData, metodo: e.target.value })} options={[{ value: 'EFECTIVO', label: 'Efectivo' }, { value: 'TRANSFERENCIA', label: 'Transferencia' }, { value: 'TARJETA', label: 'Tarjeta' }, { value: 'YAPE', label: 'Yape' }, { value: 'PLIN', label: 'Plin' }]} />
          <Select label="Tipo de pago" value={pagoData.tipo} onChange={(e) => setPagoData({ ...pagoData, tipo: e.target.value })} options={[{ value: 'ADELANTO', label: 'Adelanto' }, { value: 'PARCIAL', label: 'Parcial' }, { value: 'FINAL', label: 'Final' }]} />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
