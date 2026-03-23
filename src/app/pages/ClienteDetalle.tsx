import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Phone, MapPin, FileText, CreditCard, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { getClienteDetalle, updateCliente, type ClienteDetalle as ClienteDetalleData } from '../lib/clientes-api';

function getEstadoBadge(estado: string) {
  const estados: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
    PENDIENTE: { label: 'Pendiente', variant: 'warning' },
    EN_PROCESO: { label: 'En proceso', variant: 'info' },
    TERMINADO: { label: 'Terminado', variant: 'success' },
    ENTREGADO: { label: 'Entregado', variant: 'success' },
    CANCELADO: { label: 'Cancelado', variant: 'default' },
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

export default function ClienteDetalle() {
  const { id } = useParams();
  const [cliente, setCliente] = useState<ClienteDetalleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    documento: '',
    observacion: '',
  });

  async function loadCliente() {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getClienteDetalle(id);
      setCliente(data);
      setForm({
        nombre: data.nombre,
        telefono: data.telefono,
        direccion: data.direccion,
        documento: data.documento || '',
        observacion: data.observacion || '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar el detalle del cliente');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCliente();
  }, [id]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!cliente) {
      return;
    }

    setIsSaving(true);
    try {
      await updateCliente(cliente.id, form);
      await loadCliente();
      setIsModalOpen(false);
      toast.success('Cliente actualizado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el cliente');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="p-4 sm:p-6"><div className="rounded-xl border bg-white px-6 py-12 text-center text-sm text-gray-500">Cargando detalle del cliente...</div></div>;
  }

  if (!cliente) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Link to="/dashboard/clientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
            Volver a Clientes
          </Button>
        </Link>
        <div className="rounded-xl border bg-white px-6 py-12 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Cliente no encontrado</h1>
          <p className="mt-2 text-sm text-gray-500">El cliente que intentaste abrir no existe o no pudo cargarse.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Link to="/dashboard/clientes">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4" />
          Volver a Clientes
        </Button>
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h1>
          <p className="text-sm text-gray-600 mt-1">Informacion completa del cliente</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">Editar Cliente</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><Phone className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-gray-600 mb-1">Telefono</p><p className="text-sm font-medium text-gray-900">{cliente.telefono}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0"><User className="w-5 h-5 text-purple-600" /></div><div><p className="text-xs text-gray-600 mb-1">Documento</p><p className="text-sm font-medium text-gray-900">{cliente.documento || '-'}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-green-600" /></div><div><p className="text-xs text-gray-600 mb-1">Total trabajos</p><p className="text-sm font-medium text-gray-900">{cliente.cantidadTrabajos}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0"><CreditCard className="w-5 h-5 text-red-600" /></div><div><p className="text-xs text-gray-600 mb-1">Saldo pendiente</p><p className="text-sm font-medium text-red-600">{formatCurrency(cliente.saldoPendiente)}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Datos generales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3"><MapPin className="w-5 h-5 text-gray-400 mt-0.5" /><div><p className="text-xs text-gray-600 mb-1">Direccion</p><p className="text-sm text-gray-900">{cliente.direccion}</p></div></div>
          {cliente.observacion ? <div className="flex items-start gap-3"><FileText className="w-5 h-5 text-gray-400 mt-0.5" /><div><p className="text-xs text-gray-600 mb-1">Observacion</p><p className="text-sm text-gray-900">{cliente.observacion}</p></div></div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historial de trabajos</CardTitle></CardHeader>
        <CardContent>
          {cliente.trabajos.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">Este cliente todavia no tiene trabajos registrados.</div>
          ) : (
            <>
            <div className="space-y-3 md:hidden">
              {cliente.trabajos.map((trabajo) => (
                <div key={trabajo.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500">{formatDate(trabajo.fecha)}</p>
                      <p className="mt-1 text-sm text-gray-900">{trabajo.descripcion}</p>
                    </div>
                    {getEstadoBadge(trabajo.estado)}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{formatCurrency(trabajo.total)}</span>
                    <span className={trabajo.saldo > 0 ? 'font-medium text-red-600' : 'text-green-600'}>{trabajo.saldo > 0 ? formatCurrency(trabajo.saldo) : 'Pagado'}</span>
                  </div>
                  <Link to={`/dashboard/trabajos/${trabajo.id}`} className="mt-3 block">
                    <Button variant="outline" size="sm" className="w-full">Ver detalle</Button>
                  </Link>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripcion</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cliente.trabajos.map((trabajo) => (
                    <tr key={trabajo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(trabajo.fecha)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{trabajo.descripcion}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(trabajo.total)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{trabajo.saldo > 0 ? <span className="text-red-600 font-medium">{formatCurrency(trabajo.saldo)}</span> : <span className="text-green-600">Pagado</span>}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getEstadoBadge(trabajo.estado)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right"><Link to={`/dashboard/trabajos/${trabajo.id}`}><Button variant="ghost" size="sm">Ver detalle</Button></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historial de pagos</CardTitle></CardHeader>
        <CardContent>
          {cliente.pagos.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">Este cliente todavia no tiene pagos registrados.</div>
          ) : (
            <>
            <div className="space-y-3 md:hidden">
              {cliente.pagos.map((pago) => (
                <div key={pago.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{formatDate(pago.fecha)}</p>
                  <p className="mt-1 text-sm text-gray-900">{pago.trabajo}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-600">{formatEnumLabel(pago.tipo)}</span>
                    <span className="font-medium text-green-600">{formatCurrency(pago.monto)}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{formatEnumLabel(pago.metodo)}</p>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trabajo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metodo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cliente.pagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(pago.fecha)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pago.trabajo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatEnumLabel(pago.tipo)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">{formatCurrency(pago.monto)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatEnumLabel(pago.metodo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Editar Cliente" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre completo" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} required />
          <Input label="Teléfono" value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} />
          <Input label="Dirección" value={form.direccion} onChange={(event) => setForm({ ...form, direccion: event.target.value })} />
          <Input label="Documento (opcional)" value={form.documento} onChange={(event) => setForm({ ...form, documento: event.target.value })} />
          <Textarea label="Observación (opcional)" value={form.observacion} onChange={(event) => setForm({ ...form, observacion: event.target.value })} rows={3} />
          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Actualizar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
