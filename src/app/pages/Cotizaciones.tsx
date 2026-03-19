import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Eye, Edit2, FileText, CheckCircle, XCircle, Clock, Trash2, Ban } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { formatCurrency, formatDate } from '../lib/utils';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { getClientes, type Cliente } from '../lib/clientes-api';
import {
  createCotizacion,
  deleteCotizacion,
  getCotizaciones,
  anularCotizacion,
  updateCotizacion,
  type Cotizacion,
  type CotizacionItemPayload,
  type CotizacionPayload,
} from '../lib/cotizaciones-api';

function getEstadoBadge(estado: string) {
  const estados: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
    PENDIENTE: { label: 'Pendiente', variant: 'warning' },
    APROBADA: { label: 'Aprobada', variant: 'success' },
    RECHAZADA: { label: 'Rechazada', variant: 'danger' },
    VENCIDA: { label: 'Vencida', variant: 'default' },
    ANULADA: { label: 'Anulada', variant: 'default' },
  };

  const config = estados[estado] || estados.PENDIENTE;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

const emptyItem: CotizacionItemPayload = {
  descripcion: '',
  cantidad: '',
  unidad: '',
  precioUnitario: '',
};

const initialForm: CotizacionPayload = {
  clienteId: '',
  fechaVigencia: '',
  descripcion: '',
  manoObra: '',
  descuento: '',
  observaciones: '',
  items: [{ ...emptyItem }],
};

export default function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCotizacion, setEditingCotizacion] = useState<Cotizacion | null>(null);
  const [form, setForm] = useState<CotizacionPayload>(initialForm);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [cotizacionesData, clientesData] = await Promise.all([getCotizaciones(), getClientes()]);

        if (isMounted) {
          setCotizaciones(cotizacionesData);
          setClientes(clientesData);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las cotizaciones');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCotizaciones = useMemo(() => {
    return cotizaciones.filter((cotizacion) => {
      const search = searchTerm.toLowerCase();
      const matchSearch =
        cotizacion.cliente.toLowerCase().includes(search) ||
        cotizacion.numero.toLowerCase().includes(search) ||
        cotizacion.descripcion.toLowerCase().includes(search);
      const matchEstado = filtroEstado === 'todos' || cotizacion.estado === filtroEstado;

      return matchSearch && matchEstado;
    });
  }, [cotizaciones, filtroEstado, searchTerm]);

  const stats = {
    total: cotizaciones.length,
    pendientes: cotizaciones.filter((item) => item.estado === 'PENDIENTE').length,
    aprobadas: cotizaciones.filter((item) => item.estado === 'APROBADA').length,
    rechazadas: cotizaciones.filter((item) => item.estado === 'RECHAZADA' || item.estado === 'ANULADA').length,
  };

  function canDeleteCotizacion(cotizacion: Cotizacion) {
    return cotizacion.estado === 'PENDIENTE' && !cotizacion.trabajoConvertido && !cotizacion.trabajoId;
  }

  function canAnularCotizacion(cotizacion: Cotizacion) {
    return !canDeleteCotizacion(cotizacion) && cotizacion.estado !== 'ANULADA';
  }

  function updateForm<K extends keyof CotizacionPayload>(key: K, value: CotizacionPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateItem(index: number, key: keyof CotizacionItemPayload, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, { ...emptyItem }] }));
  }

  function removeItem(index: number) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function handleOpenModal(cotizacion?: Cotizacion) {
    if (cotizacion) {
      setEditingCotizacion(cotizacion);
      setForm({
        clienteId: cotizacion.clienteId,
        fechaVigencia: new Date(cotizacion.vigencia).toISOString().split('T')[0],
        descripcion: cotizacion.descripcion,
        manoObra: '',
        descuento: '',
        observaciones: '',
        items: [{ ...emptyItem }],
      });
    } else {
      setEditingCotizacion(null);
      setForm(initialForm);
    }

    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setEditingCotizacion(null);
    setForm(initialForm);
    setIsModalOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    try {
      if (editingCotizacion) {
        const cotizacion = await updateCotizacion(editingCotizacion.id, form);
        setCotizaciones((current) => current.map((item) => (item.id === cotizacion.id ? cotizacion : item)));
        toast.success('Cotizacion actualizada correctamente');
      } else {
        const cotizacion = await createCotizacion(form);
        setCotizaciones((current) => [cotizacion, ...current]);
        toast.success('Cotizacion creada correctamente');
      }

      handleCloseModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la cotizacion');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(cotizacion: Cotizacion) {
    const confirmed = window.confirm(`Se eliminara la cotizacion ${cotizacion.numero}. Esta accion no se puede deshacer. Deseas continuar?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteCotizacion(cotizacion.id);
      setCotizaciones((current) => current.filter((item) => item.id !== cotizacion.id));
      toast.success('Cotizacion eliminada correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la cotizacion');
    }
  }

  async function handleAnular(cotizacion: Cotizacion) {
    const confirmed = window.confirm(`La cotizacion ${cotizacion.numero} se marcara como anulada para conservar historial. Deseas continuar?`);

    if (!confirmed) {
      return;
    }

    try {
      const updated = await anularCotizacion(cotizacion.id);
      setCotizaciones((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success('Cotizacion anulada correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo anular la cotizacion');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-sm text-gray-600 mt-1">Gestiona presupuestos y propuestas a clientes</p>
        </div>
        <Button onClick={() => handleOpenModal()} disabled={clientes.length === 0 && !isLoading}>
          <Plus className="w-4 h-4" />
          Nueva Cotizacion
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p></div><div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><FileText className="w-6 h-6 text-blue-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Pendientes</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendientes}</p></div><div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center"><Clock className="w-6 h-6 text-amber-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Aprobadas</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.aprobadas}</p></div><div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Rechazadas</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.rechazadas}</p></div><div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center"><XCircle className="w-6 h-6 text-red-600" /></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, numero o descripcion..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {[['todos', 'Todos'], ['PENDIENTE', 'Pendientes'], ['APROBADA', 'Aprobadas'], ['ANULADA', 'Anuladas']].map(([value, label]) => (
                <button key={value} onClick={() => setFiltroEstado(value)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroEstado === value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
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
            <div className="px-6 py-12 text-center text-sm text-gray-500">Cargando cotizaciones...</div>
          ) : filteredCotizaciones.length === 0 ? (
            <EmptyState icon={FileText} title={searchTerm ? 'No se encontraron cotizaciones' : 'Todavia no hay cotizaciones registradas'} description={searchTerm ? 'No hay cotizaciones que coincidan con tu busqueda' : 'Cuando registres cotizaciones reales apareceran automaticamente aqui'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripcion</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vigencia</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCotizaciones.map((cotizacion) => (
                    <tr key={cotizacion.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cotizacion.numero}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(cotizacion.fecha)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cotizacion.cliente}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{cotizacion.descripcion}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{formatCurrency(cotizacion.total)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(cotizacion.vigencia)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getEstadoBadge(cotizacion.estado)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/dashboard/cotizaciones/${cotizacion.id}`}>
                            <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(cotizacion)} disabled={cotizacion.trabajoConvertido || cotizacion.estado === 'ANULADA'}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {canDeleteCotizacion(cotizacion) ? (
                            <Button variant="ghost" size="sm" onClick={() => void handleDelete(cotizacion)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : null}
                          {canAnularCotizacion(cotizacion) ? (
                            <Button variant="ghost" size="sm" onClick={() => void handleAnular(cotizacion)}>
                              <Ban className="w-4 h-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCotizacion ? 'Editar Cotizacion' : 'Nueva Cotizacion'} size="xl">
        {clientes.length === 0 ? (
          <div className="py-6 text-sm text-gray-600">Necesitas registrar al menos un cliente antes de crear una cotizacion.</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Cliente" value={form.clienteId} onChange={(event) => updateForm('clienteId', event.target.value)} options={[{ value: '', label: 'Seleccionar cliente' }, ...clientes.map((cliente) => ({ value: cliente.id, label: cliente.nombre }))]} required />
              <Input label="Vigencia" type="date" value={form.fechaVigencia} onChange={(event) => updateForm('fechaVigencia', event.target.value)} required />
            </div>

            <Textarea label="Descripcion del trabajo" value={form.descripcion} onChange={(event) => updateForm('descripcion', event.target.value)} rows={3} required />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4" />
                  Agregar item
                </Button>
              </div>

              {form.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border border-gray-200 rounded-lg">
                  <div className="md:col-span-5"><Input label="Descripcion" value={item.descripcion} onChange={(event) => updateItem(index, 'descripcion', event.target.value)} required /></div>
                  <div className="md:col-span-2"><Input label="Cantidad" type="number" step="0.001" value={item.cantidad} onChange={(event) => updateItem(index, 'cantidad', event.target.value)} required /></div>
                  <div className="md:col-span-2"><Input label="Unidad" value={item.unidad} onChange={(event) => updateItem(index, 'unidad', event.target.value)} placeholder="m2, unid..." required /></div>
                  <div className="md:col-span-2"><Input label="Precio" type="number" step="0.01" value={item.precioUnitario} onChange={(event) => updateItem(index, 'precioUnitario', event.target.value)} required /></div>
                  <div className="md:col-span-1 flex items-end"><Button type="button" variant="outline" size="sm" className="w-full" disabled={form.items.length === 1} onClick={() => removeItem(index)}>Quitar</Button></div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Mano de obra" type="number" step="0.01" value={form.manoObra} onChange={(event) => updateForm('manoObra', event.target.value)} placeholder="0.00" />
              <Input label="Descuento" type="number" step="0.01" value={form.descuento} onChange={(event) => updateForm('descuento', event.target.value)} placeholder="0.00" />
            </div>

            <Textarea label="Observaciones" value={form.observaciones} onChange={(event) => updateForm('observaciones', event.target.value)} rows={3} />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? 'Guardando...' : editingCotizacion ? 'Actualizar cotizacion' : 'Crear cotizacion'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
