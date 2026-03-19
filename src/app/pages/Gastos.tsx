import { useEffect, useState } from 'react';
import { Search, Plus, TrendingDown, Edit2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { formatCurrency, formatDate } from '../lib/utils';
import { createGasto, getGastos, updateGasto, type Gasto, type GastoPayload } from '../lib/gastos-api';
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

function getStartOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const initialForm: GastoPayload = {
  fecha: new Date().toISOString().split('T')[0],
  descripcion: '',
  categoria: '',
  monto: '',
  referencia: '',
  observacion: '',
};

export default function Gastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [form, setForm] = useState<GastoPayload>(initialForm);

  useEffect(() => {
    let isMounted = true;

    async function loadGastos() {
      try {
        const data = await getGastos();
        if (isMounted) {
          setGastos(data);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los gastos.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadGastos();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredGastos = gastos.filter((gasto) => {
    const search = searchTerm.toLowerCase();

    return (
      gasto.descripcion.toLowerCase().includes(search) ||
      gasto.categoria.toLowerCase().includes(search) ||
      (gasto.referencia || '').toLowerCase().includes(search)
    );
  });

  const startDay = getStartOfDay();
  const startWeek = getStartOfWeek();
  const startMonth = getStartOfMonth();

  const totalHoy = gastos
    .filter((gasto) => new Date(gasto.fecha) >= startDay)
    .reduce((sum, gasto) => sum + gasto.monto, 0);
  const totalSemana = gastos
    .filter((gasto) => new Date(gasto.fecha) >= startWeek)
    .reduce((sum, gasto) => sum + gasto.monto, 0);
  const totalMes = gastos
    .filter((gasto) => new Date(gasto.fecha) >= startMonth)
    .reduce((sum, gasto) => sum + gasto.monto, 0);

  function handleOpenModal(gasto?: Gasto) {
    if (gasto) {
      setEditingGasto(gasto);
      setForm({
        fecha: new Date(gasto.fecha).toISOString().split('T')[0],
        descripcion: gasto.descripcion,
        categoria: gasto.categoria === 'Sin categoria' ? '' : gasto.categoria,
        monto: String(gasto.monto),
        referencia: gasto.referencia || '',
        observacion: gasto.observacion || '',
      });
    } else {
      setEditingGasto(null);
      setForm(initialForm);
    }

    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setEditingGasto(null);
    setForm(initialForm);
    setIsModalOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    try {
      if (editingGasto) {
        const gasto = await updateGasto(editingGasto.id, form);
        setGastos((current) => current.map((item) => (item.id === gasto.id ? gasto : item)));
        toast.success('Gasto actualizado correctamente');
      } else {
        const gasto = await createGasto(form);
        setGastos((current) => [gasto, ...current]);
        toast.success('Gasto registrado correctamente');
      }

      handleCloseModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el gasto.');
    } finally {
      setIsSaving(false);
    }
  }

  function updateForm<K extends keyof GastoPayload>(key: K, value: GastoPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-600 mt-1">Registro de egresos del negocio</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" />
          Nuevo Gasto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Gastos hoy</p><p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalHoy)}</p></div><div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center"><TrendingDown className="w-6 h-6 text-red-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Gastos semana</p><p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalSemana)}</p></div><div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center"><TrendingDown className="w-6 h-6 text-red-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Gastos mes</p><p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalMes)}</p></div><div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center"><TrendingDown className="w-6 h-6 text-red-600" /></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descripcion o categoria..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripcion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observacion</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredGastos.map((gasto) => (
                  <tr key={gasto.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(gasto.fecha)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{gasto.descripcion}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><Badge variant="default">{gasto.categoria}</Badge></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-bold">-{formatCurrency(gasto.monto)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{gasto.referencia || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{gasto.observacion || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(gasto)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!isLoading && filteredGastos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">No hay gastos registrados todavia.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingGasto ? 'Editar Gasto' : 'Nuevo Gasto'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Fecha" type="date" value={form.fecha} onChange={(event) => updateForm('fecha', event.target.value)} required />
          <Input label="Descripcion" placeholder="Ej: Compra de materiales" value={form.descripcion} onChange={(event) => updateForm('descripcion', event.target.value)} required />
          <Select label="Categoria" value={form.categoria} onChange={(event) => updateForm('categoria', event.target.value)} options={[{ value: '', label: 'Seleccionar categoria' }, { value: 'Materiales', label: 'Materiales' }, { value: 'Transporte', label: 'Transporte' }, { value: 'Servicios', label: 'Servicios' }, { value: 'Herramientas', label: 'Herramientas' }, { value: 'Mantenimiento', label: 'Mantenimiento' }, { value: 'Otros', label: 'Otros' }]} required />
          <Input label="Monto" type="number" step="0.01" placeholder="0.00" value={form.monto} onChange={(event) => updateForm('monto', event.target.value)} required />
          <Input label="Referencia (opcional)" placeholder="Ej: Factura, recibo" value={form.referencia} onChange={(event) => updateForm('referencia', event.target.value)} />
          <Textarea label="Observacion (opcional)" rows={3} value={form.observacion} onChange={(event) => updateForm('observacion', event.target.value)} />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? 'Guardando...' : editingGasto ? 'Actualizar' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
