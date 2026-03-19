import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { getProductoDetalle, updateProducto, type ProductoDetalle as ProductoDetalleData } from '../lib/inventario-api';

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ProductoDetalle() {
  const { id } = useParams();
  const [producto, setProducto] = useState<ProductoDetalleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    unidad: 'm2',
    stockMinimo: '',
    costoUnitario: '',
    proveedor: '',
    observacion: '',
  });

  async function loadProducto() {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getProductoDetalle(id);
      setProducto(data);
      setForm({
        nombre: data.nombre,
        categoria: data.categoria === 'Sin categoria' ? '' : data.categoria,
        unidad: data.unidad,
        stockMinimo: String(data.stockMinimo),
        costoUnitario: String(data.costo),
        proveedor: data.proveedor || '',
        observacion: data.observacion || '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar el detalle del producto');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProducto();
  }, [id]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!producto) {
      return;
    }

    setIsSaving(true);
    try {
      await updateProducto(producto.id, form);
      await loadProducto();
      setIsModalOpen(false);
      toast.success('Producto actualizado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el producto');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="p-6"><div className="rounded-xl border bg-white px-6 py-12 text-center text-sm text-gray-500">Cargando detalle del producto...</div></div>;
  }

  if (!producto) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/dashboard/inventario">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
            Volver a Inventario
          </Button>
        </Link>
        <div className="rounded-xl border bg-white px-6 py-12 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Producto no encontrado</h1>
          <p className="mt-2 text-sm text-gray-500">El producto que intentaste abrir no existe o no pudo cargarse.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Link to="/dashboard/inventario">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4" />
          Volver a Inventario
        </Button>
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{producto.nombre}</h1>
          <p className="text-sm text-gray-600 mt-1">Detalle del producto</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Editar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><p className="text-xs text-gray-600 mb-1">Stock actual</p><p className="text-2xl font-bold text-gray-900">{producto.stock}</p><p className="text-xs text-gray-500 mt-1">{producto.unidad}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-xs text-gray-600 mb-1">Stock minimo</p><p className="text-2xl font-bold text-gray-900">{producto.stockMinimo}</p><p className="text-xs text-gray-500 mt-1">{producto.unidad}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-xs text-gray-600 mb-1">Costo unitario</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(producto.costo)}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-xs text-gray-600 mb-1">Valor total</p><p className="text-2xl font-bold text-green-600">{formatCurrency(producto.stock * producto.costo)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Informacion general</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><p className="text-xs text-gray-600 mb-1">Categoria</p><p className="text-sm text-gray-900">{producto.categoria}</p></div>
          <div><p className="text-xs text-gray-600 mb-1">Unidad</p><p className="text-sm text-gray-900">{producto.unidad}</p></div>
          <div><p className="text-xs text-gray-600 mb-1">Proveedor</p><p className="text-sm text-gray-900">{producto.proveedor || '-'}</p></div>
          <div><p className="text-xs text-gray-600 mb-1">Estado</p>{producto.stock < producto.stockMinimo ? <Badge variant="danger">Stock bajo</Badge> : <Badge variant="success">Stock OK</Badge>}</div>
          {producto.observacion ? <div className="md:col-span-2"><p className="text-xs text-gray-600 mb-1">Observacion</p><p className="text-sm text-gray-900">{producto.observacion}</p></div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historial de movimientos</CardTitle></CardHeader>
        <CardContent>
          {producto.movimientos.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">Este producto todavia no tiene movimientos registrados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {producto.movimientos.map((movimiento) => (
                    <tr key={movimiento.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(movimiento.fecha)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {movimiento.tipo === 'ENTRADA' ? <><TrendingDown className="w-4 h-4 text-green-600" /><Badge variant="success">Entrada</Badge></> : <><TrendingUp className="w-4 h-4 text-red-600" /><Badge variant="danger">Salida</Badge></>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-center font-medium">{movimiento.cantidad}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatEnumLabel(movimiento.motivo)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{movimiento.referencia || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{movimiento.costoUnitario != null ? formatCurrency(movimiento.costoUnitario) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Editar Producto" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre del producto" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} required />
          <Select label="Categoria" value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })} options={[{ value: '', label: 'Seleccionar categoria' }, { value: 'Vidrios', label: 'Vidrios' }, { value: 'Espejos', label: 'Espejos' }, { value: 'Perfiles', label: 'Perfiles' }, { value: 'Accesorios', label: 'Accesorios' }]} required />
          <Select label="Unidad" value={form.unidad} onChange={(event) => setForm({ ...form, unidad: event.target.value })} options={[{ value: 'm2', label: 'm2' }, { value: 'm', label: 'm' }, { value: 'unid', label: 'Unidad' }]} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Stock minimo" type="number" value={form.stockMinimo} onChange={(event) => setForm({ ...form, stockMinimo: event.target.value })} required />
            <Input label="Costo unitario" type="number" step="0.01" value={form.costoUnitario} onChange={(event) => setForm({ ...form, costoUnitario: event.target.value })} required />
          </div>
          <Input label="Proveedor" value={form.proveedor} onChange={(event) => setForm({ ...form, proveedor: event.target.value })} />
          <Textarea label="Observacion" rows={3} value={form.observacion} onChange={(event) => setForm({ ...form, observacion: event.target.value })} />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Actualizar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
