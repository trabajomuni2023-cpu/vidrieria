import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, FileText, Download, Edit2, CheckCircle, XCircle, Plus, Trash2, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { getClientes, type Cliente } from '../lib/clientes-api';
import {
  convertirCotizacion,
  deleteCotizacion,
  getCotizacionDetalle,
  anularCotizacion,
  updateCotizacion,
  updateCotizacionEstado,
  type CotizacionDetalle as CotizacionDetalleData,
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

const emptyItem: CotizacionItemPayload = { descripcion: '', cantidad: '', unidad: '', precioUnitario: '' };

export default function CotizacionDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cotizacion, setCotizacion] = useState<CotizacionDetalleData | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<CotizacionPayload>({
    clienteId: '',
    fechaVigencia: '',
    descripcion: '',
    manoObra: '',
    descuento: '',
    observaciones: '',
    items: [{ ...emptyItem }],
  });

  async function loadCotizacion() {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      const [data, clientesData] = await Promise.all([getCotizacionDetalle(id), getClientes()]);
      setCotizacion(data);
      setClientes(clientesData);
      setForm({
        clienteId: data.cliente.id,
        fechaVigencia: new Date(data.vigencia).toISOString().split('T')[0],
        descripcion: data.descripcion,
        manoObra: String(data.manoObra),
        descuento: String(data.descuento),
        observaciones: data.observaciones || '',
        items: data.items.map((item) => ({
          descripcion: item.descripcion,
          cantidad: String(item.cantidad),
          unidad: item.unidad,
          precioUnitario: String(item.precioUnitario),
        })),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar la cotizacion');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCotizacion();
  }, [id]);

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

  const canDelete = cotizacion ? cotizacion.estado === 'PENDIENTE' && !cotizacion.trabajoConvertido && !cotizacion.trabajoId : false;
  const canAnular = cotizacion ? !canDelete && cotizacion.estado !== 'ANULADA' : false;

  async function handleGuardarEdicion(event: React.FormEvent) {
    event.preventDefault();

    if (!cotizacion) {
      return;
    }

    setIsSaving(true);
    try {
      await updateCotizacion(cotizacion.id, form);
      await loadCotizacion();
      setIsModalOpen(false);
      toast.success('Cotizacion actualizada correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la cotizacion');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAprobar() {
    if (!cotizacion) return;
    try {
      setIsSaving(true);
      const updated = await updateCotizacionEstado(cotizacion.id, 'APROBADA');
      setCotizacion((current) => (current ? { ...current, estado: updated.estado } : current));
      toast.success('Cotizacion aprobada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo aprobar la cotizacion');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRechazar() {
    if (!cotizacion) return;
    try {
      setIsSaving(true);
      const updated = await updateCotizacionEstado(cotizacion.id, 'RECHAZADA');
      setCotizacion((current) => (current ? { ...current, estado: updated.estado } : current));
      toast.success('Cotizacion rechazada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo rechazar la cotizacion');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConvertirTrabajo() {
    if (!cotizacion) return;
    try {
      setIsSaving(true);
      const result = await convertirCotizacion(cotizacion.id);
      toast.success('Cotizacion convertida en trabajo');
      navigate(`/dashboard/trabajos/${result.trabajoId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo convertir la cotizacion');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEliminar() {
    if (!cotizacion) return;

    const confirmed = window.confirm(`Se eliminara la cotizacion ${cotizacion.numero}. Esta accion no se puede deshacer. Deseas continuar?`);

    if (!confirmed) {
      return;
    }

    try {
      setIsSaving(true);
      await deleteCotizacion(cotizacion.id);
      toast.success('Cotizacion eliminada correctamente');
      navigate('/dashboard/cotizaciones');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la cotizacion');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAnular() {
    if (!cotizacion) return;

    const confirmed = window.confirm(`La cotizacion ${cotizacion.numero} se marcara como anulada para conservar historial. Deseas continuar?`);

    if (!confirmed) {
      return;
    }

    try {
      setIsSaving(true);
      const updated = await anularCotizacion(cotizacion.id);
      setCotizacion((current) => (current ? { ...current, estado: updated.estado, trabajoConvertido: updated.trabajoConvertido } : current));
      toast.success('Cotizacion anulada correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo anular la cotizacion');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="p-6"><div className="rounded-xl border bg-white px-6 py-12 text-center text-sm text-gray-500">Cargando cotizacion...</div></div>;
  }

  if (!cotizacion) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/dashboard/cotizaciones">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
            Volver a Cotizaciones
          </Button>
        </Link>
        <div className="rounded-xl border bg-white px-6 py-12 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Cotizacion no encontrada</h1>
          <p className="mt-2 text-sm text-gray-500">La cotizacion que intentaste abrir no existe o no pudo cargarse.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Link to="/dashboard/cotizaciones">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4" />
          Volver a Cotizaciones
        </Button>
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{cotizacion.numero}</h1>
            {getEstadoBadge(cotizacion.estado)}
          </div>
          <p className="text-sm text-gray-600">Detalle completo de la cotizacion</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info('La exportacion a PDF sera una mejora posterior.')}><Download className="w-4 h-4" />Exportar PDF</Button>
          <Button variant="outline" onClick={() => setIsModalOpen(true)} disabled={cotizacion.trabajoConvertido || cotizacion.estado === 'ANULADA'}><Edit2 className="w-4 h-4" />Editar</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Informacion del cliente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><p className="text-xs text-gray-600 mb-1">Cliente</p><p className="text-sm font-medium text-gray-900">{cotizacion.cliente.nombre}</p></div>
          <div><p className="text-xs text-gray-600 mb-1">Telefono</p><p className="text-sm font-medium text-gray-900">{cotizacion.cliente.telefono}</p></div>
          <div><p className="text-xs text-gray-600 mb-1">Direccion</p><p className="text-sm font-medium text-gray-900">{cotizacion.cliente.direccion}</p></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card><CardHeader><CardTitle>Descripcion del trabajo</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-900">{cotizacion.descripcion}</p></CardContent></Card>
          <Card>
            <CardHeader><CardTitle>Desglose de materiales</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cant.</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unidad</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cotizacion.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{item.descripcion}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.cantidad}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.unidad}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.precioUnitario)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {cotizacion.observaciones ? <Card><CardHeader><CardTitle>Observaciones</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-700">{cotizacion.observaciones}</p></CardContent></Card> : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Fecha emision:</span><span className="text-gray-900 font-medium">{formatDate(cotizacion.fecha)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Vigencia:</span><span className="text-gray-900 font-medium">{formatDate(cotizacion.vigencia)}</span></div>
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal materiales:</span><span className="text-gray-900">{formatCurrency(cotizacion.items.reduce((sum, item) => sum + item.total, 0))}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Mano de obra:</span><span className="text-gray-900">{formatCurrency(cotizacion.manoObra)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal:</span><span className="text-gray-900">{formatCurrency(cotizacion.subtotal)}</span></div>
                {cotizacion.descuento > 0 ? <div className="flex justify-between text-sm"><span className="text-gray-600">Descuento:</span><span className="text-red-600">-{formatCurrency(cotizacion.descuento)}</span></div> : null}
                <div className="border-t border-gray-200 pt-2 flex justify-between"><span className="font-semibold text-gray-900">Total:</span><span className="text-xl font-bold text-blue-600">{formatCurrency(cotizacion.total)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={handleConvertirTrabajo} disabled={isSaving || cotizacion.trabajoConvertido || cotizacion.estado === 'ANULADA'}><FileText className="w-4 h-4" />{cotizacion.trabajoConvertido ? 'Ya convertida en trabajo' : 'Convertir en trabajo'}</Button>
              <Button variant="outline" className="w-full" onClick={handleAprobar} disabled={isSaving || cotizacion.estado === 'ANULADA'}><CheckCircle className="w-4 h-4" />Aprobar cotizacion</Button>
              <Button variant="danger" className="w-full" onClick={handleRechazar} disabled={isSaving || cotizacion.estado === 'ANULADA'}><XCircle className="w-4 h-4" />Rechazar cotizacion</Button>
              {canDelete ? <Button variant="danger" className="w-full" onClick={handleEliminar} disabled={isSaving}><Trash2 className="w-4 h-4" />Eliminar cotizacion</Button> : null}
              {canAnular ? <Button variant="outline" className="w-full" onClick={handleAnular} disabled={isSaving}><Ban className="w-4 h-4" />Anular cotizacion</Button> : null}
              {cotizacion.trabajoConvertido && cotizacion.trabajoId ? <Button variant="outline" className="w-full" onClick={() => navigate(`/dashboard/trabajos/${cotizacion.trabajoId}`)}>Ver trabajo generado</Button> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Editar cotizacion" size="xl">
        <form onSubmit={handleGuardarEdicion} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Cliente" value={form.clienteId} onChange={(event) => updateForm('clienteId', event.target.value)} options={[{ value: '', label: 'Seleccionar cliente' }, ...clientes.map((cliente) => ({ value: cliente.id, label: cliente.nombre }))]} required />
            <Input label="Vigencia" type="date" value={form.fechaVigencia} onChange={(event) => updateForm('fechaVigencia', event.target.value)} required />
          </div>
          <Textarea label="Descripcion del trabajo" value={form.descripcion} onChange={(event) => updateForm('descripcion', event.target.value)} rows={3} required />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4" />Agregar item</Button>
            </div>
            {form.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border border-gray-200 rounded-lg">
                <div className="md:col-span-5"><Input label="Descripcion" value={item.descripcion} onChange={(event) => updateItem(index, 'descripcion', event.target.value)} required /></div>
                <div className="md:col-span-2"><Input label="Cantidad" type="number" step="0.001" value={item.cantidad} onChange={(event) => updateItem(index, 'cantidad', event.target.value)} required /></div>
                <div className="md:col-span-2"><Input label="Unidad" value={item.unidad} onChange={(event) => updateItem(index, 'unidad', event.target.value)} required /></div>
                <div className="md:col-span-2"><Input label="Precio" type="number" step="0.01" value={item.precioUnitario} onChange={(event) => updateItem(index, 'precioUnitario', event.target.value)} required /></div>
                <div className="md:col-span-1 flex items-end"><Button type="button" variant="outline" size="sm" className="w-full" disabled={form.items.length === 1} onClick={() => removeItem(index)}>Quitar</Button></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Mano de obra" type="number" step="0.01" value={form.manoObra} onChange={(event) => updateForm('manoObra', event.target.value)} />
            <Input label="Descuento" type="number" step="0.01" value={form.descuento} onChange={(event) => updateForm('descuento', event.target.value)} />
          </div>
          <Textarea label="Observaciones" rows={3} value={form.observaciones} onChange={(event) => updateForm('observaciones', event.target.value)} />
          <div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Actualizar'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
