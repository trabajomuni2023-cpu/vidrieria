import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, User, Phone, MapPin, Calendar, FileText, Edit2, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { getClientes, type Cliente } from '../lib/clientes-api';
import { createPago } from '../lib/pagos-api';
import { getTrabajoDetalle, updateTrabajo, updateTrabajoEstado, type TrabajoDetalle as TrabajoDetalleData } from '../lib/trabajos-api';

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

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function TrabajoDetalle() {
  const { id } = useParams();
  const [trabajo, setTrabajo] = useState<TrabajoDetalleData | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [isModalEditOpen, setIsModalEditOpen] = useState(false);
  const [isSavingPago, setIsSavingPago] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pagoData, setPagoData] = useState({ monto: '', metodo: 'EFECTIVO', tipo: 'PARCIAL' });
  const [form, setForm] = useState({
    clienteId: '',
    descripcion: '',
    total: '',
    fechaEntrega: '',
    tipoTrabajo: '',
    direccionInstalacion: '',
    observaciones: '',
    comprobanteNumero: '',
  });

  const loadTrabajo = async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      const [trabajoData, clientesData] = await Promise.all([getTrabajoDetalle(id), getClientes()]);
      setTrabajo(trabajoData);
      setClientes(clientesData);
      setForm({
        clienteId: trabajoData.clienteId,
        descripcion: trabajoData.descripcion,
        total: String(trabajoData.total),
        fechaEntrega: trabajoData.fechaEntrega ? new Date(trabajoData.fechaEntrega).toISOString().split('T')[0] : '',
        tipoTrabajo: trabajoData.tipoTrabajo === 'Sin tipo' ? '' : trabajoData.tipoTrabajo,
        direccionInstalacion: trabajoData.direccionInstalacion || trabajoData.direccion,
        observaciones: trabajoData.observaciones || '',
        comprobanteNumero: trabajoData.boleta || '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar el detalle del trabajo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTrabajo();
  }, [id]);

  const handleRegistrarPago = (e: React.FormEvent) => {
    e.preventDefault();

    if (!trabajo) {
      return;
    }

    const submit = async () => {
      setIsSavingPago(true);

      try {
        await createPago({
          trabajoId: trabajo.id,
          monto: pagoData.monto,
          metodo: pagoData.metodo,
          tipo: pagoData.tipo,
        });

        await loadTrabajo();
        setPagoData({ monto: '', metodo: 'EFECTIVO', tipo: 'PARCIAL' });
        setIsModalPagoOpen(false);
        toast.success('Pago registrado correctamente');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo registrar el pago');
      } finally {
        setIsSavingPago(false);
      }
    };

    void submit();
  };

  async function handleGuardarEdicion(event: React.FormEvent) {
    event.preventDefault();

    if (!trabajo) {
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateTrabajo(trabajo.id, form);
      await loadTrabajo();
      setIsModalEditOpen(false);
      toast.success('Trabajo actualizado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el trabajo');
    } finally {
      setIsSavingEdit(false);
    }
  }

  const handleCambiarEstado = async (estado: string) => {
    if (!trabajo) {
      return;
    }

    try {
      await updateTrabajoEstado(trabajo.id, estado);
      await loadTrabajo();
      toast.success(`Estado actualizado a ${formatEnumLabel(estado)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el estado');
    }
  };

  if (isLoading) {
    return <div className="p-6"><div className="rounded-xl border bg-white px-6 py-12 text-center text-sm text-gray-500">Cargando detalle del trabajo...</div></div>;
  }

  if (!trabajo) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/dashboard/trabajos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
            Volver a Trabajos
          </Button>
        </Link>
        <div className="rounded-xl border bg-white px-6 py-12 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Trabajo no encontrado</h1>
          <p className="mt-2 text-sm text-gray-500">El trabajo que intentaste abrir no existe o no pudo cargarse.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Link to="/dashboard/trabajos">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4" />
          Volver a Trabajos
        </Button>
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{trabajo.numero}</h1>
            {getEstadoBadge(trabajo.estado)}
          </div>
          <p className="text-sm text-gray-600">{trabajo.descripcion}</p>
        </div>
        <Button variant="outline" onClick={() => setIsModalEditOpen(true)}>
          <Edit2 className="w-4 h-4" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><User className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-gray-600 mb-1">Cliente</p><p className="text-sm font-medium text-gray-900">{trabajo.cliente}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0"><Calendar className="w-5 h-5 text-green-600" /></div><div><p className="text-xs text-gray-600 mb-1">Fecha entrega</p><p className="text-sm font-medium text-gray-900">{trabajo.fechaEntrega ? formatDate(trabajo.fechaEntrega) : '-'}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-purple-600" /></div><div><p className="text-xs text-gray-600 mb-1">Boleta</p><p className="text-sm font-medium text-gray-900">{trabajo.boleta || '-'}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0"><CreditCard className="w-5 h-5 text-red-600" /></div><div><p className="text-xs text-gray-600 mb-1">Saldo pendiente</p><p className="text-sm font-medium text-red-600">{formatCurrency(trabajo.saldo)}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Detalles del trabajo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-600 mb-1">Tipo de trabajo</p><p className="text-sm text-gray-900">{trabajo.tipoTrabajo}</p></div>
                <div><p className="text-xs text-gray-600 mb-1">Fecha de registro</p><p className="text-sm text-gray-900">{formatDate(trabajo.fecha)}</p></div>
              </div>
              <div><p className="text-xs text-gray-600 mb-1">Descripcion completa</p><p className="text-sm text-gray-900">{trabajo.descripcion}</p></div>
              <div className="flex items-start gap-3"><Phone className="w-5 h-5 text-gray-400 mt-0.5" /><div><p className="text-xs text-gray-600 mb-1">Telefono</p><p className="text-sm text-gray-900">{trabajo.telefono}</p></div></div>
              <div className="flex items-start gap-3"><MapPin className="w-5 h-5 text-gray-400 mt-0.5" /><div><p className="text-xs text-gray-600 mb-1">Direccion de instalacion</p><p className="text-sm text-gray-900">{trabajo.direccionInstalacion || trabajo.direccion}</p></div></div>
              {trabajo.observaciones ? <div><p className="text-xs text-gray-600 mb-1">Observaciones</p><p className="text-sm text-gray-900 bg-amber-50 border border-amber-200 p-3 rounded-lg">{trabajo.observaciones}</p></div> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Materiales utilizados</CardTitle></CardHeader>
            <CardContent>
              {trabajo.materiales.length === 0 ? <div className="py-8 text-center text-sm text-gray-500">Este trabajo todavia no tiene materiales registrados.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th><th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th><th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unidad</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                      {trabajo.materiales.map((material) => (
                        <tr key={material.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{material.producto}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center">{material.cantidad}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-center">{material.unidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Historial de pagos</CardTitle></CardHeader>
            <CardContent>
              {trabajo.pagosHistorial.length === 0 ? <div className="py-8 text-center text-sm text-gray-500">Este trabajo todavia no tiene pagos registrados.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metodo</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                      {trabajo.pagosHistorial.map((pago) => (
                        <tr key={pago.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(pago.fecha)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatEnumLabel(pago.tipo)}</td>
                          <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">{formatCurrency(pago.monto)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatEnumLabel(pago.metodo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Resumen financiero</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Total:</span><span className="text-gray-900 font-semibold">{formatCurrency(trabajo.total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Pagado:</span><span className="text-green-600">{formatCurrency(trabajo.adelanto)}</span></div>
              <div className="border-t border-gray-200 pt-3 flex justify-between"><span className="font-semibold text-gray-900">Saldo:</span><span className="text-xl font-bold text-red-600">{formatCurrency(trabajo.saldo)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => setIsModalPagoOpen(true)}><CreditCard className="w-4 h-4" />Registrar pago</Button>
              <Button variant="outline" className="w-full" onClick={() => handleCambiarEstado('TERMINADO')}>Marcar como terminado</Button>
              <Button variant="outline" className="w-full" onClick={() => handleCambiarEstado('ENTREGADO')}>Marcar como entregado</Button>
              <Button variant="danger" className="w-full" onClick={() => handleCambiarEstado('CANCELADO')}>Cancelar trabajo</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal isOpen={isModalPagoOpen} onClose={() => setIsModalPagoOpen(false)} title="Registrar pago" size="md">
        <form onSubmit={handleRegistrarPago} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg"><p className="text-sm text-gray-700"><span className="font-medium">Saldo pendiente: </span><span className="text-xl font-bold text-red-600">{formatCurrency(trabajo.saldo)}</span></p></div>
          <Input label="Monto" type="number" value={pagoData.monto} onChange={(event) => setPagoData({ ...pagoData, monto: event.target.value })} placeholder="0.00" required />
          <Select label="Metodo de pago" value={pagoData.metodo} onChange={(event) => setPagoData({ ...pagoData, metodo: event.target.value })} options={[{ value: 'EFECTIVO', label: 'Efectivo' }, { value: 'TRANSFERENCIA', label: 'Transferencia' }, { value: 'TARJETA', label: 'Tarjeta' }, { value: 'YAPE', label: 'Yape' }, { value: 'PLIN', label: 'Plin' }]} />
          <Select label="Tipo de pago" value={pagoData.tipo} onChange={(event) => setPagoData({ ...pagoData, tipo: event.target.value })} options={[{ value: 'ADELANTO', label: 'Adelanto' }, { value: 'PARCIAL', label: 'Parcial' }, { value: 'FINAL', label: 'Final' }]} />
          <div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setIsModalPagoOpen(false)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1" disabled={isSavingPago}>{isSavingPago ? 'Guardando...' : 'Registrar pago'}</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isModalEditOpen} onClose={() => setIsModalEditOpen(false)} title="Editar trabajo" size="lg">
        <form onSubmit={handleGuardarEdicion} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Cliente" value={form.clienteId} onChange={(event) => setForm({ ...form, clienteId: event.target.value })} options={[{ value: '', label: 'Seleccionar cliente' }, ...clientes.map((cliente) => ({ value: cliente.id, label: cliente.nombre }))]} required />
            <Input label="Tipo de trabajo" value={form.tipoTrabajo} onChange={(event) => setForm({ ...form, tipoTrabajo: event.target.value })} />
          </div>
          <Textarea label="Descripcion" rows={3} value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Total" type="number" step="0.01" value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} required />
            <Input label="Fecha de entrega" type="date" value={form.fechaEntrega} onChange={(event) => setForm({ ...form, fechaEntrega: event.target.value })} />
          </div>
          <Input label="Boleta o comprobante" value={form.comprobanteNumero} onChange={(event) => setForm({ ...form, comprobanteNumero: event.target.value })} />
          <Input label="Direccion de instalacion" value={form.direccionInstalacion} onChange={(event) => setForm({ ...form, direccionInstalacion: event.target.value })} />
          <Textarea label="Observaciones" rows={3} value={form.observaciones} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} />
          <div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setIsModalEditOpen(false)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1" disabled={isSavingEdit}>{isSavingEdit ? 'Guardando...' : 'Actualizar'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
