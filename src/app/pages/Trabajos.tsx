import { useEffect, useState } from 'react';
import { Search, Plus, Eye, Edit2, Briefcase, Download, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { formatCurrency, formatDate } from '../lib/utils';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { getClientes, type Cliente } from '../lib/clientes-api';
import { createTrabajo, getTrabajos, updateTrabajo, type Trabajo, type TrabajoPayload } from '../lib/trabajos-api';
import { exportRowsToExcel } from '../lib/export';

function getEstadoBadge(estado: string) {
  const estados: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'danger' | 'default' }> = {
    PENDIENTE: { label: 'Pendiente', variant: 'warning' },
    EN_PROCESO: { label: 'En proceso', variant: 'info' },
    TERMINADO: { label: 'Terminado', variant: 'success' },
    ENTREGADO: { label: 'Entregado', variant: 'success' },
    CANCELADO: { label: 'Cancelado', variant: 'danger' },
  };

  const config = estados[estado] || estados.PENDIENTE;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

const initialForm: TrabajoPayload = {
  clienteId: '',
  descripcion: '',
  total: '',
  adelantoInicial: '',
  fechaEntrega: '',
  tipoTrabajo: '',
  direccionInstalacion: '',
  observaciones: '',
  comprobanteNumero: '',
  metodoPago: 'EFECTIVO',
};

export default function Trabajos() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTrabajo, setEditingTrabajo] = useState<Trabajo | null>(null);
  const [form, setForm] = useState<TrabajoPayload>(initialForm);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [trabajosData, clientesData] = await Promise.all([getTrabajos(), getClientes()]);

        if (isMounted) {
          setTrabajos(trabajosData);
          setClientes(clientesData);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los trabajos');
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

  const filteredTrabajos = trabajos.filter((trabajo) => {
    const matchSearch =
      trabajo.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trabajo.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trabajo.boleta || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || trabajo.estado === filtroEstado;
    const trabajoDate = new Date(trabajo.fecha);
    const matchDesde = !fechaDesde || trabajoDate >= new Date(`${fechaDesde}T00:00:00`);
    const matchHasta = !fechaHasta || trabajoDate <= new Date(`${fechaHasta}T23:59:59`);

    return matchSearch && matchEstado && matchDesde && matchHasta;
  });

  const stats = {
    total: filteredTrabajos.length,
    pendientes: filteredTrabajos.filter((trabajo) => trabajo.estado === 'PENDIENTE').length,
    enProceso: filteredTrabajos.filter((trabajo) => trabajo.estado === 'EN_PROCESO').length,
    terminados: filteredTrabajos.filter((trabajo) => trabajo.estado === 'TERMINADO').length,
    entregados: filteredTrabajos.filter((trabajo) => trabajo.estado === 'ENTREGADO').length,
    totalSaldo: filteredTrabajos.reduce((sum, trabajo) => sum + trabajo.saldo, 0),
    totalMonto: filteredTrabajos.reduce((sum, trabajo) => sum + trabajo.total, 0),
  };

  function updateForm<K extends keyof TrabajoPayload>(key: K, value: TrabajoPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleOpenModal(trabajo?: Trabajo) {
    if (trabajo) {
      setEditingTrabajo(trabajo);
      setForm({
        clienteId: trabajo.clienteId,
        descripcion: trabajo.descripcion,
        total: String(trabajo.total),
        adelantoInicial: String(trabajo.adelanto),
        fechaEntrega: trabajo.fechaEntrega ? new Date(trabajo.fechaEntrega).toISOString().split('T')[0] : '',
        tipoTrabajo: '',
        direccionInstalacion: '',
        observaciones: '',
        comprobanteNumero: trabajo.boleta || '',
        metodoPago: 'EFECTIVO',
      });
    } else {
      setEditingTrabajo(null);
      setForm(initialForm);
    }

    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setEditingTrabajo(null);
    setForm(initialForm);
    setIsModalOpen(false);
  }

  async function handleSaveTrabajo(event: React.FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    try {
      if (editingTrabajo) {
        const trabajo = await updateTrabajo(editingTrabajo.id, {
          clienteId: form.clienteId,
          descripcion: form.descripcion,
          total: form.total,
          fechaEntrega: form.fechaEntrega,
          tipoTrabajo: form.tipoTrabajo,
          direccionInstalacion: form.direccionInstalacion,
          observaciones: form.observaciones,
          comprobanteNumero: form.comprobanteNumero,
        });

        setTrabajos((current) => current.map((item) => (item.id === trabajo.id ? trabajo : item)));
        toast.success('Trabajo actualizado correctamente');
      } else {
        const trabajo = await createTrabajo(form);
        setTrabajos((current) => [trabajo, ...current]);
        toast.success('Trabajo registrado correctamente');
      }

      handleCloseModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el trabajo');
    } finally {
      setIsSaving(false);
    }
  }

  function handleClearFilters() {
    setSearchTerm('');
    setFiltroEstado('todos');
    setFechaDesde('');
    setFechaHasta('');
  }

  function handleExportExcel() {
    exportRowsToExcel(
      'trabajos-filtrados',
      'Trabajos',
      ['Fecha', 'Cliente', 'Descripcion', 'Total', 'Adelanto', 'Saldo', 'Estado', 'Boleta', 'Fecha entrega'],
      filteredTrabajos.map((trabajo) => [
        formatDate(trabajo.fecha),
        trabajo.cliente,
        trabajo.descripcion,
        trabajo.total,
        trabajo.adelanto,
        trabajo.saldo,
        trabajo.estado,
        trabajo.boleta || '',
        trabajo.fechaEntrega ? formatDate(trabajo.fechaEntrega) : '',
      ]),
    );
    toast.success('Trabajos exportados en Excel.');
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trabajos</h1>
          <p className="text-sm text-gray-600 mt-1">Gestiona pedidos y trabajos en proceso</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={handleExportExcel} disabled={isLoading || filteredTrabajos.length === 0} className="w-full sm:w-auto">
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
          <Button onClick={() => handleOpenModal()} disabled={clientes.length === 0 && !isLoading} className="w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nuevo Trabajo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-600 mb-1">Total</p><p className="text-2xl font-bold text-gray-900">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-600 mb-1">Pendientes</p><p className="text-2xl font-bold text-amber-600">{stats.pendientes}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-600 mb-1">En proceso</p><p className="text-2xl font-bold text-[var(--brand-600)]">{stats.enProceso}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-600 mb-1">Terminados</p><p className="text-2xl font-bold text-green-600">{stats.terminados}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-600 mb-1">Entregados</p><p className="text-2xl font-bold text-green-700">{stats.entregados}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-600 mb-1">Saldo total</p><p className="text-lg font-bold text-red-600">{formatCurrency(stats.totalSaldo)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, descripcion o boleta..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)] focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Input type="date" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} className="w-full" />
              <Input type="date" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} className="w-full" />
              <Button type="button" variant="outline" onClick={handleClearFilters} className="w-full xl:w-auto">
                <RotateCcw className="w-4 h-4" />
                Limpiar
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[['todos', 'Todos'], ['PENDIENTE', 'Pendientes'], ['EN_PROCESO', 'En proceso'], ['TERMINADO', 'Terminados'], ['ENTREGADO', 'Entregados']].map(([value, label]) => (
                <button key={value} onClick={() => setFiltroEstado(value)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${filtroEstado === value ? 'bg-[var(--brand-600)] text-[var(--brand-contrast)]' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
            <div><p className="text-xs text-gray-500">Trabajos en rango</p><p className="text-lg font-semibold text-gray-900">{stats.total}</p></div>
            <div><p className="text-xs text-gray-500">Monto total</p><p className="text-lg font-semibold text-[var(--brand-600)]">{formatCurrency(stats.totalMonto)}</p></div>
            <div><p className="text-xs text-gray-500">Pendientes</p><p className="text-lg font-semibold text-amber-600">{stats.pendientes}</p></div>
            <div><p className="text-xs text-gray-500">Terminados</p><p className="text-lg font-semibold text-green-600">{stats.terminados}</p></div>
            <div><p className="text-xs text-gray-500">Entregados</p><p className="text-lg font-semibold text-green-700">{stats.entregados}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">Cargando trabajos...</div>
          ) : filteredTrabajos.length === 0 ? (
            <EmptyState icon={Briefcase} title={searchTerm ? 'No se encontraron trabajos' : 'Todavia no hay trabajos registrados'} description={searchTerm ? 'No hay trabajos que coincidan con tu busqueda' : 'Cuando registres trabajos reales aqui apareceran automaticamente'} />
          ) : (
            <>
            <div className="divide-y divide-gray-200 md:hidden">
              {filteredTrabajos.map((trabajo) => (
                <div key={trabajo.id} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{trabajo.cliente}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatDate(trabajo.fecha)}</p>
                    </div>
                    {getEstadoBadge(trabajo.estado)}
                  </div>

                  <div>
                    <p className="text-sm text-gray-700">{trabajo.descripcion}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-3 text-sm">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total</p>
                      <p className="mt-1 font-semibold text-gray-900">{formatCurrency(trabajo.total)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Saldo</p>
                      <p className="mt-1 font-semibold text-red-600">{trabajo.saldo > 0 ? formatCurrency(trabajo.saldo) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Adelanto</p>
                      <p className="mt-1 text-green-600">{formatCurrency(trabajo.adelanto)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Entrega</p>
                      <p className="mt-1 text-gray-900">{trabajo.fechaEntrega ? formatDate(trabajo.fechaEntrega) : '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`/dashboard/trabajos/${trabajo.id}`} className="min-w-0">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="w-4 h-4" />
                        Ver detalle
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenModal(trabajo)}>
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripcion</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Adelanto</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boleta</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">F. Entrega</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTrabajos.map((trabajo) => (
                    <tr key={trabajo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(trabajo.fecha)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{trabajo.cliente}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{trabajo.descripcion}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{formatCurrency(trabajo.total)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{formatCurrency(trabajo.adelanto)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{trabajo.saldo > 0 ? <span className="text-red-600 font-medium">{formatCurrency(trabajo.saldo)}</span> : <span className="text-gray-400">-</span>}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getEstadoBadge(trabajo.estado)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trabajo.boleta || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trabajo.fechaEntrega ? formatDate(trabajo.fechaEntrega) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/dashboard/trabajos/${trabajo.id}`}>
                            <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(trabajo)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTrabajo ? 'Editar Trabajo' : 'Nuevo Trabajo'} size="lg">
        {clientes.length === 0 ? (
          <div className="py-6 text-sm text-gray-600">Necesitas registrar al menos un cliente antes de crear un trabajo.</div>
        ) : (
          <form onSubmit={handleSaveTrabajo} className="space-y-4">
            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'color-mix(in srgb, var(--brand-100) 90%, white)', background: 'color-mix(in srgb, var(--brand-50) 80%, white)', color: 'var(--brand-700)' }}>
              Llena primero los datos basicos del pedido. Si el cliente dejo adelanto, registralo aqui para que el saldo se calcule solo.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Cliente" helperText="Selecciona a la persona o empresa que solicito el trabajo." value={form.clienteId} onChange={(event) => updateForm('clienteId', event.target.value)} options={[{ value: '', label: 'Seleccionar cliente' }, ...clientes.map((cliente) => ({ value: cliente.id, label: cliente.nombre }))]} required />
              <Input label="Tipo de trabajo" helperText="Escribe una categoria corta para ubicarlo rapido despues." value={form.tipoTrabajo} onChange={(event) => updateForm('tipoTrabajo', event.target.value)} placeholder="Ej: Mampara, puerta, espejo" />
            </div>

            <Textarea label="Descripcion" helperText="Describe lo que se va a fabricar o instalar para evitar confusiones." value={form.descripcion} onChange={(event) => updateForm('descripcion', event.target.value)} rows={3} required />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Total" helperText="Monto total acordado con el cliente." type="number" step="0.01" value={form.total} onChange={(event) => updateForm('total', event.target.value)} placeholder="0.00" required />
              <Input label="Adelanto inicial" helperText="Si el cliente pago algo al inicio, registralo aqui." type="number" step="0.01" value={form.adelantoInicial} onChange={(event) => updateForm('adelantoInicial', event.target.value)} placeholder="0.00" disabled={Boolean(editingTrabajo)} />
              <Select label="Metodo de pago" helperText="Solo aplica para el adelanto inicial." value={form.metodoPago} onChange={(event) => updateForm('metodoPago', event.target.value)} options={[{ value: 'EFECTIVO', label: 'Efectivo' }, { value: 'TRANSFERENCIA', label: 'Transferencia' }, { value: 'TARJETA', label: 'Tarjeta' }, { value: 'YAPE', label: 'Yape' }, { value: 'PLIN', label: 'Plin' }]} disabled={Boolean(editingTrabajo)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Fecha de entrega" helperText="Sirve para verlo luego en calendario y seguimiento." type="date" value={form.fechaEntrega} onChange={(event) => updateForm('fechaEntrega', event.target.value)} />
              <Input label="Boleta o comprobante" helperText="Opcional, pero util si ya se emitio un documento." value={form.comprobanteNumero} onChange={(event) => updateForm('comprobanteNumero', event.target.value)} placeholder="Ej: B001-000123" />
            </div>

            <Input label="Direccion de instalacion" helperText="Si el trabajo se instala en obra, deja la direccion aqui." value={form.direccionInstalacion} onChange={(event) => updateForm('direccionInstalacion', event.target.value)} placeholder="Opcional" />
            <Textarea label="Observaciones" helperText="Anota color, medidas pendientes, coordinaciones o notas internas." value={form.observaciones} onChange={(event) => updateForm('observaciones', event.target.value)} rows={3} placeholder="Notas internas o detalles del pedido" />

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? 'Guardando...' : editingTrabajo ? 'Actualizar trabajo' : 'Registrar trabajo'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
