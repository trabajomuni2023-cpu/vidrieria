import { useEffect, useState } from 'react';
import { Search, Plus, TrendingDown, Edit2, Download, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { HelpCallout } from '../components/ui/HelpCallout';
import { formatCurrency, formatDate } from '../lib/utils';
import { createGasto, getGastos, updateGasto, type Gasto, type GastoPayload } from '../lib/gastos-api';
import { toast } from 'sonner';
import { exportRowsToExcel } from '../lib/export';

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
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
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
    ) && (filtroCategoria === 'todos' || gasto.categoria === filtroCategoria) &&
      (!fechaDesde || new Date(gasto.fecha) >= new Date(`${fechaDesde}T00:00:00`)) &&
      (!fechaHasta || new Date(gasto.fecha) <= new Date(`${fechaHasta}T23:59:59`));
  });
  const totalRango = filteredGastos.reduce((sum, gasto) => sum + gasto.monto, 0);
  const promedio = filteredGastos.length > 0 ? totalRango / filteredGastos.length : 0;
  const categorias = filteredGastos.reduce<Record<string, number>>((acc, gasto) => {
    acc[gasto.categoria] = (acc[gasto.categoria] || 0) + 1;
    return acc;
  }, {});
  const categoriaMasUsada = Object.entries(categorias).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

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

  function handleClearFilters() {
    setSearchTerm('');
    setFiltroCategoria('todos');
    setFechaDesde('');
    setFechaHasta('');
  }

  function handleExportExcel() {
    exportRowsToExcel(
      'gastos-filtrados',
      'Gastos',
      ['Fecha', 'Descripcion', 'Categoria', 'Monto', 'Referencia', 'Observacion'],
      filteredGastos.map((gasto) => [
        formatDate(gasto.fecha),
        gasto.descripcion,
        gasto.categoria,
        gasto.monto,
        gasto.referencia || '',
        gasto.observacion || '',
      ]),
    );
    toast.success('Gastos exportados en Excel.');
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-600 mt-1">Registro de egresos del negocio</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={handleExportExcel} disabled={isLoading || filteredGastos.length === 0} className="w-full sm:w-auto">
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nuevo Gasto
          </Button>
        </div>
      </div>

      <HelpCallout
        title="Qué conviene registrar aquí"
        description="Usa este módulo para salidas reales de dinero del negocio, como materiales, transporte o servicios. Si solo es una corrección de stock, hazla desde Inventario."
        tone="tip"
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total gastado</p><p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalRango)}</p></div><div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center"><TrendingDown className="w-6 h-6 text-red-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Promedio</p><p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(promedio)}</p></div><div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center"><TrendingDown className="w-6 h-6 text-orange-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Categoria top</p><p className="text-lg font-bold text-gray-900 mt-1">{categoriaMasUsada}</p></div><div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center"><TrendingDown className="w-6 h-6 text-slate-600" /></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por descripcion o categoria..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)] focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Select value={filtroCategoria} onChange={(event) => setFiltroCategoria(event.target.value)} options={[{ value: 'todos', label: 'Todas las categorías' }, ...Array.from(new Set(gastos.map((gasto) => gasto.categoria))).map((categoria) => ({ value: categoria, label: categoria }))]} className="w-full" />
              <Input type="date" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} className="w-full" />
              <Input type="date" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} className="w-full" />
              <Button type="button" variant="outline" onClick={handleClearFilters} className="w-full xl:w-auto">
                <RotateCcw className="w-4 h-4" />
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200 md:hidden">
            {filteredGastos.map((gasto) => (
              <div key={gasto.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{gasto.descripcion}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(gasto.fecha)}</p>
                  </div>
                  <p className="text-sm font-bold text-red-600">-{formatCurrency(gasto.monto)}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">{gasto.categoria}</Badge>
                  </div>
                  <p className="mt-3 text-gray-900">{gasto.referencia || 'Sin referencia'}</p>
                  {gasto.observacion ? <p className="mt-2 text-gray-600">{gasto.observacion}</p> : null}
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenModal(gasto)}>
                  <Edit2 className="w-4 h-4" />
                  Editar gasto
                </Button>
              </div>
            ))}
            {!isLoading && filteredGastos.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">No hay gastos registrados todavía.</div>
            ) : null}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observación</th>
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
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">No hay gastos registrados todavía.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingGasto ? 'Editar Gasto' : 'Nuevo Gasto'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Registra aqui cualquier salida de dinero del negocio para que caja y reportes siempre queden correctos.
          </div>
          <Input label="Fecha" helperText="Dia en que realmente se hizo el gasto." type="date" value={form.fecha} onChange={(event) => updateForm('fecha', event.target.value)} required />
          <Input label="Descripcion" helperText="Escribe que se compro o pago de forma clara." placeholder="Ej: Compra de materiales" value={form.descripcion} onChange={(event) => updateForm('descripcion', event.target.value)} required />
          <Select label="Categoria" helperText="Ayuda a ordenar reportes como materiales, transporte o servicios." value={form.categoria} onChange={(event) => updateForm('categoria', event.target.value)} options={[{ value: '', label: 'Seleccionar categoria' }, { value: 'Materiales', label: 'Materiales' }, { value: 'Transporte', label: 'Transporte' }, { value: 'Servicios', label: 'Servicios' }, { value: 'Herramientas', label: 'Herramientas' }, { value: 'Mantenimiento', label: 'Mantenimiento' }, { value: 'Otros', label: 'Otros' }]} required />
          <Input label="Monto" helperText="Coloca el importe total pagado." type="number" step="0.01" placeholder="0.00" value={form.monto} onChange={(event) => updateForm('monto', event.target.value)} required />
          <Input label="Referencia (opcional)" helperText="Puedes guardar numero de recibo, factura o una nota corta." placeholder="Ej: Factura, recibo" value={form.referencia} onChange={(event) => updateForm('referencia', event.target.value)} />
          <Textarea label="Observacion (opcional)" helperText="Usa este espacio para detalles extra que luego ayuden a recordar el gasto." rows={3} value={form.observacion} onChange={(event) => updateForm('observacion', event.target.value)} />

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? 'Guardando...' : editingGasto ? 'Actualizar' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
