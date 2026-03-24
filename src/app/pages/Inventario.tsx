import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Package, ArrowDownCircle, ArrowUpCircle, Eye, Edit2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { HelpCallout } from '../components/ui/HelpCallout';
import { formatCurrency } from '../lib/utils';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  createMovimientoInventario,
  createProducto,
  getProductos,
  updateProducto,
  type Producto,
} from '../lib/inventario-api';

type ProductoForm = {
  nombre: string;
  categoria: string;
  unidad: string;
  stockInicial: string;
  stockMinimo: string;
  costoUnitario: string;
  proveedor: string;
  observacion: string;
};

type MovimientoForm = {
  productoId: string;
  cantidad: string;
  costoUnitario: string;
  proveedor: string;
  fecha: string;
  observacion: string;
  motivo: string;
  referencia: string;
};

const emptyProductoForm: ProductoForm = {
  nombre: '',
  categoria: '',
  unidad: 'm2',
  stockInicial: '',
  stockMinimo: '',
  costoUnitario: '',
  proveedor: '',
  observacion: '',
};

const today = new Date().toISOString().split('T')[0];

const emptyEntradaForm: MovimientoForm = {
  productoId: '',
  cantidad: '',
  costoUnitario: '',
  proveedor: '',
  fecha: today,
  observacion: '',
  motivo: 'COMPRA',
  referencia: '',
};

const emptySalidaForm: MovimientoForm = {
  productoId: '',
  cantidad: '',
  costoUnitario: '',
  proveedor: '',
  fecha: today,
  observacion: '',
  motivo: 'USO_EN_TRABAJO',
  referencia: '',
};

export default function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProducto, setIsSavingProducto] = useState(false);
  const [isSavingMovimiento, setIsSavingMovimiento] = useState(false);
  const [isModalProductoOpen, setIsModalProductoOpen] = useState(false);
  const [isModalEntradaOpen, setIsModalEntradaOpen] = useState(false);
  const [isModalSalidaOpen, setIsModalSalidaOpen] = useState(false);
  const [productoForm, setProductoForm] = useState<ProductoForm>(emptyProductoForm);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [entradaForm, setEntradaForm] = useState<MovimientoForm>(emptyEntradaForm);
  const [salidaForm, setSalidaForm] = useState<MovimientoForm>(emptySalidaForm);

  useEffect(() => {
    const loadProductos = async () => {
      try {
        const data = await getProductos();
        setProductos(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el inventario');
      } finally {
        setIsLoading(false);
      }
    };

    void loadProductos();
  }, []);

  const filteredProductos = useMemo(
    () =>
      productos.filter(
        (producto) =>
          producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          producto.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (producto.proveedor || '').toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [productos, searchTerm],
  );

  const productosStockBajo = productos.filter((producto) => producto.stock < producto.stockMinimo);
  const valorTotal = productos.reduce((sum, producto) => sum + producto.stock * producto.costo, 0);
  const totalCategorias = new Set(productos.map((producto) => producto.categoria)).size;

  function handleOpenProductoModal(producto?: Producto) {
    if (producto) {
      setEditingProducto(producto);
      setProductoForm({
        nombre: producto.nombre,
        categoria: producto.categoria === 'Sin categoria' ? '' : producto.categoria,
        unidad: producto.unidad,
        stockInicial: String(producto.stock),
        stockMinimo: String(producto.stockMinimo),
        costoUnitario: String(producto.costo),
        proveedor: producto.proveedor || '',
        observacion: producto.observacion || '',
      });
    } else {
      setEditingProducto(null);
      setProductoForm(emptyProductoForm);
    }

    setIsModalProductoOpen(true);
  }

  function handleCloseProductoModal() {
    setEditingProducto(null);
    setProductoForm(emptyProductoForm);
    setIsModalProductoOpen(false);
  }

  const handleSaveProducto = (event: React.FormEvent) => {
    event.preventDefault();

    const submit = async () => {
      setIsSavingProducto(true);

      try {
        if (editingProducto) {
          const producto = await updateProducto(editingProducto.id, {
            nombre: productoForm.nombre,
            categoria: productoForm.categoria,
            unidad: productoForm.unidad,
            stockMinimo: productoForm.stockMinimo,
            costoUnitario: productoForm.costoUnitario,
            proveedor: productoForm.proveedor,
            observacion: productoForm.observacion,
          });

          setProductos((current) => current.map((item) => (item.id === producto.id ? producto : item)));
          toast.success('Producto actualizado correctamente');
        } else {
          const producto = await createProducto(productoForm);
          setProductos((current) => [producto, ...current]);
          toast.success('Producto creado correctamente');
        }

        handleCloseProductoModal();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el producto');
      } finally {
        setIsSavingProducto(false);
      }
    };

    void submit();
  };

  const handleMovimiento = (tipo: 'ENTRADA' | 'SALIDA', form: MovimientoForm) => {
    const submit = async () => {
      setIsSavingMovimiento(true);

      try {
        const result = await createMovimientoInventario(form.productoId, {
          tipo,
          motivo: form.motivo,
          cantidad: form.cantidad,
          costoUnitario: form.costoUnitario,
          proveedor: form.proveedor,
          referencia: form.referencia,
          observacion: form.observacion,
          fecha: form.fecha,
        });

        setProductos((current) =>
          current.map((producto) => (producto.id === result.producto.id ? result.producto : producto)),
        );

        if (tipo === 'ENTRADA') {
          setEntradaForm(emptyEntradaForm);
          setIsModalEntradaOpen(false);
          toast.success('Entrada registrada correctamente');
        } else {
          setSalidaForm(emptySalidaForm);
          setIsModalSalidaOpen(false);
          toast.success('Salida registrada correctamente');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo registrar el movimiento');
      } finally {
        setIsSavingMovimiento(false);
      }
    };

    void submit();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-600 mt-1">Control de productos y materiales</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          <Button variant="outline" onClick={() => setIsModalEntradaOpen(true)} className="w-full sm:w-auto">
            <ArrowDownCircle className="w-4 h-4" />
            Entrada
          </Button>
          <Button variant="outline" onClick={() => setIsModalSalidaOpen(true)} className="w-full sm:w-auto">
            <ArrowUpCircle className="w-4 h-4" />
            Salida
          </Button>
          <Button onClick={() => handleOpenProductoModal()} className="w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <HelpCallout
        title="Orden recomendado"
        description="Primero crea el producto. Después usa Entrada cuando compras material y Salida cuando ese material se consume o se pierde."
        tone="info"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total productos</p><p className="text-2xl font-bold text-gray-900 mt-1">{productos.length}</p></div><div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--brand-100)]"><Package className="w-6 h-6 text-[var(--brand-600)]" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Stock bajo</p><p className="text-2xl font-bold text-red-600 mt-1">{productosStockBajo.length}</p></div><div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center"><Package className="w-6 h-6 text-red-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Valor total</p><p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(valorTotal)}</p></div><div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><Package className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Categorias</p><p className="text-2xl font-bold text-gray-900 mt-1">{totalCategorias}</p></div><div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><Package className="w-6 h-6 text-purple-600" /></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por producto, categoria o proveedor..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)] focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">Cargando inventario...</div>
          ) : filteredProductos.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              {searchTerm ? 'No se encontraron productos con ese criterio.' : 'Todavia no hay productos registrados en inventario.'}
            </div>
          ) : (
            <>
            <div className="divide-y divide-gray-200 md:hidden">
              {filteredProductos.map((producto) => (
                <div key={producto.id} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{producto.nombre}</p>
                      <p className="mt-1 text-xs text-gray-500">{producto.categoria}</p>
                    </div>
                    {producto.stock < producto.stockMinimo ? <Badge variant="danger">Stock bajo</Badge> : <Badge variant="success">OK</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-3 text-sm">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Stock</p>
                      <p className="mt-1 font-semibold text-gray-900">{producto.stock} {producto.unidad}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Mínimo</p>
                      <p className="mt-1 text-gray-900">{producto.stockMinimo}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Costo</p>
                      <p className="mt-1 text-gray-900">{formatCurrency(producto.costo)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Proveedor</p>
                      <p className="mt-1 text-gray-900">{producto.proveedor || '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`/dashboard/inventario/${producto.id}`} className="min-w-0">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="w-4 h-4" />
                        Ver
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenProductoModal(producto)}>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unidad</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock min.</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProductos.map((producto) => (
                    <tr key={producto.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{producto.nombre}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{producto.categoria}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">{producto.unidad}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-center font-semibold">{producto.stock}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">{producto.stockMinimo}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(producto.costo)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{producto.proveedor || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {producto.stock < producto.stockMinimo ? <Badge variant="danger">Stock bajo</Badge> : <Badge variant="success">OK</Badge>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/dashboard/inventario/${producto.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenProductoModal(producto)}>
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

      <Modal isOpen={isModalProductoOpen} onClose={handleCloseProductoModal} title={editingProducto ? 'Editar Producto' : 'Nuevo Producto'} size="md">
        <form onSubmit={handleSaveProducto} className="space-y-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            Crea cada material una sola vez. Luego las entradas y salidas te ayudaran a mantener el stock correcto.
          </div>
          <Input label="Nombre del producto" helperText="Usa el nombre con el que lo reconocen en el taller o almacen." value={productoForm.nombre} onChange={(event) => setProductoForm({ ...productoForm, nombre: event.target.value })} placeholder="Ej: Vidrio templado 6mm" required />
          <Select label="Categoria" helperText="Agrupa productos similares para buscarlos mas facil." value={productoForm.categoria} onChange={(event) => setProductoForm({ ...productoForm, categoria: event.target.value })} options={[{ value: '', label: 'Seleccionar categoria' }, { value: 'Vidrios', label: 'Vidrios' }, { value: 'Espejos', label: 'Espejos' }, { value: 'Perfiles', label: 'Perfiles' }, { value: 'Accesorios', label: 'Accesorios' }]} required />
          <Select label="Unidad" helperText="Define si el producto se controla por m2, metros o unidades." value={productoForm.unidad} onChange={(event) => setProductoForm({ ...productoForm, unidad: event.target.value })} options={[{ value: 'm2', label: 'm2' }, { value: 'm', label: 'm' }, { value: 'unid', label: 'Unidad' }]} required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Stock inicial" helperText="Solo se usa al crear el producto por primera vez." type="number" value={productoForm.stockInicial} onChange={(event) => setProductoForm({ ...productoForm, stockInicial: event.target.value })} placeholder="0" required={!editingProducto} disabled={Boolean(editingProducto)} />
            <Input label="Stock minimo" helperText="Cuando baje de este numero, el sistema lo marcara como stock bajo." type="number" value={productoForm.stockMinimo} onChange={(event) => setProductoForm({ ...productoForm, stockMinimo: event.target.value })} placeholder="0" required />
          </div>
          <Input label="Costo unitario" helperText="Costo aproximado de compra por unidad de medida." type="number" step="0.01" value={productoForm.costoUnitario} onChange={(event) => setProductoForm({ ...productoForm, costoUnitario: event.target.value })} placeholder="0.00" required />
          <Input label="Proveedor" helperText="Opcional, pero util para recordar donde se compra normalmente." value={productoForm.proveedor} onChange={(event) => setProductoForm({ ...productoForm, proveedor: event.target.value })} placeholder="Nombre del proveedor" />
          <Textarea label="Observacion" helperText="Puedes anotar color, grosor, marca o cualquier detalle util." value={productoForm.observacion} onChange={(event) => setProductoForm({ ...productoForm, observacion: event.target.value })} rows={3} />

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={handleCloseProductoModal} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isSavingProducto}>{isSavingProducto ? 'Guardando...' : editingProducto ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isModalEntradaOpen} onClose={() => setIsModalEntradaOpen(false)} title="Entrada de Inventario" size="md">
        <form onSubmit={(event) => { event.preventDefault(); handleMovimiento('ENTRADA', entradaForm); }} className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Usa entrada cuando compraste material nuevo o cuando necesitas aumentar stock por correccion.
          </div>
          <Select label="Producto" helperText="Selecciona el material que ingreso al almacen." value={entradaForm.productoId} onChange={(event) => setEntradaForm({ ...entradaForm, productoId: event.target.value })} options={[{ value: '', label: 'Seleccionar producto' }, ...productos.map((producto) => ({ value: producto.id, label: producto.nombre }))]} required />
          <Input label="Cantidad" helperText="Cantidad que ingreso hoy." type="number" value={entradaForm.cantidad} onChange={(event) => setEntradaForm({ ...entradaForm, cantidad: event.target.value })} placeholder="0" required />
          <Input label="Costo unitario" helperText="Opcional, pero sirve para calcular mejor el valor del inventario." type="number" step="0.01" value={entradaForm.costoUnitario} onChange={(event) => setEntradaForm({ ...entradaForm, costoUnitario: event.target.value })} placeholder="0.00" />
          <Input label="Proveedor" helperText="Quien entrego el material o a quien se le compro." value={entradaForm.proveedor} onChange={(event) => setEntradaForm({ ...entradaForm, proveedor: event.target.value })} placeholder="Nombre del proveedor" />
          <Input label="Referencia" helperText="Factura, guia o cualquier codigo que ayude a rastrear la compra." value={entradaForm.referencia} onChange={(event) => setEntradaForm({ ...entradaForm, referencia: event.target.value })} placeholder="Factura, guia u otra referencia" />
          <Input label="Fecha" helperText="Fecha real de ingreso." type="date" value={entradaForm.fecha} onChange={(event) => setEntradaForm({ ...entradaForm, fecha: event.target.value })} required />
          <Textarea label="Observacion" helperText="Anota detalles utiles como lote, color o estado del material." value={entradaForm.observacion} onChange={(event) => setEntradaForm({ ...entradaForm, observacion: event.target.value })} rows={3} />

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setIsModalEntradaOpen(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isSavingMovimiento}>{isSavingMovimiento ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isModalSalidaOpen} onClose={() => setIsModalSalidaOpen(false)} title="Salida de Inventario" size="md">
        <form onSubmit={(event) => { event.preventDefault(); handleMovimiento('SALIDA', salidaForm); }} className="space-y-4">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Usa salida cuando el material se consumio en un trabajo, se vendio o se perdio por merma o rotura.
          </div>
          <Select label="Producto" helperText="Selecciona el material que salio del inventario." value={salidaForm.productoId} onChange={(event) => setSalidaForm({ ...salidaForm, productoId: event.target.value })} options={[{ value: '', label: 'Seleccionar producto' }, ...productos.map((producto) => ({ value: producto.id, label: producto.nombre }))]} required />
          <Input label="Cantidad" helperText="Cantidad que ya no quedara disponible en stock." type="number" value={salidaForm.cantidad} onChange={(event) => setSalidaForm({ ...salidaForm, cantidad: event.target.value })} placeholder="0" required />
          <Select label="Motivo" helperText="Aclara por que salio el material y mejora los reportes." value={salidaForm.motivo} onChange={(event) => setSalidaForm({ ...salidaForm, motivo: event.target.value })} options={[{ value: 'USO_EN_TRABAJO', label: 'Uso en trabajo' }, { value: 'VENTA_DIRECTA', label: 'Venta directa' }, { value: 'MERMA', label: 'Merma o rotura' }, { value: 'AJUSTE', label: 'Ajuste' }, { value: 'OTRO', label: 'Otro' }]} required />
          <Input label="Referencia" helperText="Puedes poner numero de trabajo, venta o una nota corta." value={salidaForm.referencia} onChange={(event) => setSalidaForm({ ...salidaForm, referencia: event.target.value })} placeholder="Trabajo asociado, venta u observacion corta" />
          <Input label="Fecha" helperText="Fecha real en que salio el material." type="date" value={salidaForm.fecha} onChange={(event) => setSalidaForm({ ...salidaForm, fecha: event.target.value })} required />
          <Textarea label="Observacion" helperText="Usa este espacio si necesitas explicar mejor la salida." value={salidaForm.observacion} onChange={(event) => setSalidaForm({ ...salidaForm, observacion: event.target.value })} rows={3} />

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setIsModalSalidaOpen(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" variant="danger" className="flex-1" disabled={isSavingMovimiento}>{isSavingMovimiento ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
