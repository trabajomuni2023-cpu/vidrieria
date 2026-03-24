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
import { anularPago, createPago } from '../lib/pagos-api';
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
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [pagoAAnularId, setPagoAAnularId] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [isAnnullingPago, setIsAnnullingPago] = useState(false);
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

  const pagoSeleccionado = trabajo?.pagosHistorial.find((pago) => pago.id === pagoAAnularId) || null;

  const handleRegistrarPago = (event: React.FormEvent) => {
    event.preventDefault();

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

  const isTrabajoCancelado = trabajo.estado === 'CANCELADO';

  async function handleAnularPago() {
    if (!pagoSeleccionado) {
      return;
    }

    setIsAnnullingPago(true);
    try {
      await anularPago(pagoSeleccionado.id, {
        motivo: motivoAnulacion.trim() || undefined,
      });
      await loadTrabajo();
      setPagoAAnularId(null);
      setMotivoAnulacion('');
      toast.success('Pago anulado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo anular el pago');
    } finally {
      setIsAnnullingPago(false);
    }
  }

  if (isLoading) {
    return <div className="p-4 sm:p-6"><div className="rounded-xl border bg-white px-6 py-12 text-center text-sm text-gray-500">Cargando detalle del trabajo...</div></div>;
  }

  if (!trabajo) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Link to="/dashboard/trabajos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
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
    <div className="space-y-6 p-4 sm:p-6">
      <Link to="/dashboard/trabajos">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Volver a Trabajos
        </Button>
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{trabajo.numero}</h1>
            {getEstadoBadge(trabajo.estado)}
          </div>
          <p className="text-sm text-gray-600">{trabajo.descripcion}</p>
        </div>
        <Button variant="outline" onClick={() => setIsModalEditOpen(true)} className="w-full sm:w-auto">
          <Edit2 className="h-4 w-4" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--brand-100)]"><User className="h-5 w-5 text-[var(--brand-600)]" /></div><div><p className="mb-1 text-xs text-gray-600">Cliente</p><p className="text-sm font-medium text-gray-900">{trabajo.cliente}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100"><Calendar className="h-5 w-5 text-green-600" /></div><div><p className="mb-1 text-xs text-gray-600">Fecha entrega</p><p className="text-sm font-medium text-gray-900">{trabajo.fechaEntrega ? formatDate(trabajo.fechaEntrega) : '-'}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100"><FileText className="h-5 w-5 text-purple-600" /></div><div><p className="mb-1 text-xs text-gray-600">Boleta</p><p className="text-sm font-medium text-gray-900">{trabajo.boleta || '-'}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-100"><CreditCard className="h-5 w-5 text-red-600" /></div><div><p className="mb-1 text-xs text-gray-600">Saldo pendiente</p><p className="text-sm font-medium text-red-600">{formatCurrency(trabajo.saldo)}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Detalles del trabajo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="mb-1 text-xs text-gray-600">Tipo de trabajo</p><p className="text-sm text-gray-900">{trabajo.tipoTrabajo}</p></div>
                <div><p className="mb-1 text-xs text-gray-600">Fecha de registro</p><p className="text-sm text-gray-900">{formatDate(trabajo.fecha)}</p></div>
              </div>
              <div><p className="mb-1 text-xs text-gray-600">Descripción completa</p><p className="text-sm text-gray-900">{trabajo.descripcion}</p></div>
              <div className="flex items-start gap-3"><Phone className="mt-0.5 h-5 w-5 text-gray-400" /><div><p className="mb-1 text-xs text-gray-600">Teléfono</p><p className="text-sm text-gray-900">{trabajo.telefono}</p></div></div>
              <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 text-gray-400" /><div><p className="mb-1 text-xs text-gray-600">Dirección de instalación</p><p className="text-sm text-gray-900">{trabajo.direccionInstalacion || trabajo.direccion}</p></div></div>
              {trabajo.observaciones ? <div><p className="mb-1 text-xs text-gray-600">Observaciones</p><p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-900">{trabajo.observaciones}</p></div> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Materiales utilizados</CardTitle></CardHeader>
            <CardContent>
              {trabajo.materiales.length === 0 ? <div className="py-8 text-center text-sm text-gray-500">Este trabajo todavía no tiene materiales registrados.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Producto</th><th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Cantidad</th><th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Unidad</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                      {trabajo.materiales.map((material) => (
                        <tr key={material.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{material.producto}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{material.cantidad}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600">{material.unidad}</td>
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
              {trabajo.pagosHistorial.length === 0 ? <div className="py-8 text-center text-sm text-gray-500">Este trabajo todavía no tiene pagos registrados.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Fecha</th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tipo</th><th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Monto</th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Método</th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th><th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Acciones</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                      {trabajo.pagosHistorial.map((pago) => (
                        <tr key={pago.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(pago.fecha)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatEnumLabel(pago.tipo)}</td>
                          <td className={`px-4 py-3 text-right text-sm font-medium ${pago.anulado ? 'text-gray-500 line-through' : 'text-green-600'}`}>{formatCurrency(pago.monto)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatEnumLabel(pago.metodo)}</td>
                          <td className="px-4 py-3 text-sm">{pago.anulado ? <Badge variant="danger">Anulado</Badge> : <Badge variant="success">Activo</Badge>}</td>
                          <td className="px-4 py-3 text-right">
                            <Button type="button" variant="outline" size="sm" disabled={pago.anulado} onClick={() => setPagoAAnularId(pago.id)}>
                              Anular
                            </Button>
                          </td>
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
              <div className="flex justify-between text-sm"><span className="text-gray-600">Total:</span><span className="font-semibold text-gray-900">{formatCurrency(trabajo.total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Pagado:</span><span className="text-green-600">{formatCurrency(trabajo.adelanto)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-3"><span className="font-semibold text-gray-900">Saldo:</span><span className="text-xl font-bold text-red-600">{formatCurrency(trabajo.saldo)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => setIsModalPagoOpen(true)}><CreditCard className="h-4 w-4" />Registrar pago</Button>
              <Button variant="outline" className="w-full" onClick={() => handleCambiarEstado('TERMINADO')} disabled={isTrabajoCancelado}>Marcar como terminado</Button>
              <Button variant="outline" className="w-full" onClick={() => handleCambiarEstado('ENTREGADO')} disabled={isTrabajoCancelado}>Marcar como entregado</Button>
              <Button variant="danger" className="w-full" onClick={() => setIsConfirmCancelOpen(true)} disabled={isTrabajoCancelado}>
                {isTrabajoCancelado ? 'Trabajo cancelado' : 'Cancelar trabajo'}
              </Button>
              {isTrabajoCancelado ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  Este trabajo ya fue cancelado. Por seguridad ya no puede pasar a terminado o entregado.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal isOpen={isModalPagoOpen} onClose={() => setIsModalPagoOpen(false)} title="Registrar pago" size="md">
        <form onSubmit={handleRegistrarPago} className="space-y-4">
          <div className="rounded-lg border p-4" style={{ borderColor: 'color-mix(in srgb, var(--brand-100) 90%, white)', background: 'color-mix(in srgb, var(--brand-50) 80%, white)' }}><p className="text-sm text-gray-700"><span className="font-medium">Saldo pendiente: </span><span className="text-xl font-bold text-red-600">{formatCurrency(trabajo.saldo)}</span></p></div>
          <Input label="Monto" helperText="Ingresa el importe exacto que se está cobrando ahora." type="number" value={pagoData.monto} onChange={(event) => setPagoData({ ...pagoData, monto: event.target.value })} placeholder="0.00" required />
          <Select label="Método de pago" helperText="Sirve para registrar correctamente caja y reportes." value={pagoData.metodo} onChange={(event) => setPagoData({ ...pagoData, metodo: event.target.value })} options={[{ value: 'EFECTIVO', label: 'Efectivo' }, { value: 'TRANSFERENCIA', label: 'Transferencia' }, { value: 'TARJETA', label: 'Tarjeta' }, { value: 'YAPE', label: 'Yape' }, { value: 'PLIN', label: 'Plin' }]} />
          <Select label="Tipo de pago" helperText="Usa parcial o final según el saldo que quede pendiente." value={pagoData.tipo} onChange={(event) => setPagoData({ ...pagoData, tipo: event.target.value })} options={[{ value: 'ADELANTO', label: 'Adelanto' }, { value: 'PARCIAL', label: 'Parcial' }, { value: 'FINAL', label: 'Final' }]} />
          <div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setIsModalPagoOpen(false)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1" disabled={isSavingPago}>{isSavingPago ? 'Guardando...' : 'Registrar pago'}</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isModalEditOpen} onClose={() => setIsModalEditOpen(false)} title="Editar trabajo" size="lg">
        <form onSubmit={handleGuardarEdicion} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select label="Cliente" value={form.clienteId} onChange={(event) => setForm({ ...form, clienteId: event.target.value })} options={[{ value: '', label: 'Seleccionar cliente' }, ...clientes.map((cliente) => ({ value: cliente.id, label: cliente.nombre }))]} required />
            <Input label="Tipo de trabajo" value={form.tipoTrabajo} onChange={(event) => setForm({ ...form, tipoTrabajo: event.target.value })} />
          </div>
          <Textarea label="Descripción" rows={3} value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} required />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Total" type="number" step="0.01" value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} required />
            <Input label="Fecha de entrega" type="date" value={form.fechaEntrega} onChange={(event) => setForm({ ...form, fechaEntrega: event.target.value })} />
          </div>
          <Input label="Boleta o comprobante" value={form.comprobanteNumero} onChange={(event) => setForm({ ...form, comprobanteNumero: event.target.value })} />
          <Input label="Dirección de instalación" value={form.direccionInstalacion} onChange={(event) => setForm({ ...form, direccionInstalacion: event.target.value })} />
          <Textarea label="Observaciones" rows={3} value={form.observaciones} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} />
          <div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setIsModalEditOpen(false)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1" disabled={isSavingEdit}>{isSavingEdit ? 'Guardando...' : 'Actualizar'}</Button></div>
        </form>
      </Modal>

      <Modal
        isOpen={isConfirmCancelOpen}
        onClose={() => setIsConfirmCancelOpen(false)}
        title="Confirmar cancelación"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Vas a cancelar este trabajo. Se conservará el historial, pero ya no debería avanzar a terminado o entregado.
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-900">{trabajo.numero}</p>
            <p className="mt-1 text-slate-600">{trabajo.descripcion}</p>
            <p className="mt-3 text-slate-900">
              Cliente: <span className="font-medium">{trabajo.cliente}</span>
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsConfirmCancelOpen(false)}>
              Volver
            </Button>
            <Button
              type="button"
              variant="danger"
              className="flex-1"
              onClick={async () => {
                await handleCambiarEstado('CANCELADO');
                setIsConfirmCancelOpen(false);
              }}
            >
              Sí, cancelar trabajo
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(pagoAAnularId)}
        onClose={() => {
          if (!isAnnullingPago) {
            setPagoAAnularId(null);
            setMotivoAnulacion('');
          }
        }}
        title="Anular pago"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            El pago quedará en historial como anulado, se registrará una reversa en caja y el saldo del trabajo se recalculará.
          </div>
          {pagoSeleccionado ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">{formatEnumLabel(pagoSeleccionado.tipo)}</p>
              <p className="mt-1 text-slate-600">{formatDate(pagoSeleccionado.fecha)}</p>
              <p className="mt-3 text-slate-900">Monto: <span className="font-semibold">{formatCurrency(pagoSeleccionado.monto)}</span></p>
            </div>
          ) : null}
          <Textarea
            label="Motivo de anulación (opcional)"
            helperText="Sirve para dejar claro por qué se revirtió este pago."
            rows={3}
            value={motivoAnulacion}
            onChange={(event) => setMotivoAnulacion(event.target.value)}
            placeholder="Ej: se registró en el trabajo equivocado"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setPagoAAnularId(null); setMotivoAnulacion(''); }} disabled={isAnnullingPago}>Cancelar</Button>
            <Button type="button" variant="danger" className="flex-1" onClick={handleAnularPago} disabled={isAnnullingPago}>{isAnnullingPago ? 'Anulando...' : 'Confirmar anulación'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
