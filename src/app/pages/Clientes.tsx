import { useEffect, useState } from 'react';
import { Search, Plus, Eye, Edit2, Trash2, Users } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency } from '../lib/utils';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  createCliente,
  deleteCliente,
  getClientes,
  type Cliente,
  updateCliente,
} from '../lib/clientes-api';

type ClienteFormData = {
  nombre: string;
  telefono: string;
  direccion: string;
  documento: string;
  observacion: string;
};

const emptyForm: ClienteFormData = {
  nombre: '',
  telefono: '',
  direccion: '',
  documento: '',
  observacion: '',
};

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>(emptyForm);

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const data = await getClientes();
        setClientes(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los clientes');
      } finally {
        setIsLoading(false);
      }
    };

    void loadClientes();
  }, []);

  const filteredClientes = clientes.filter((cliente) =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cliente.telefono || '').includes(searchTerm) ||
    (cliente.direccion || '').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleOpenModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nombre: cliente.nombre,
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
        documento: cliente.documento || '',
        observacion: cliente.observacion || '',
      });
    } else {
      setEditingCliente(null);
      setFormData(emptyForm);
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCliente(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submit = async () => {
      setIsSaving(true);

      try {
        if (editingCliente) {
          const updatedCliente = await updateCliente(editingCliente.id, formData);
          setClientes((current) =>
            current.map((cliente) =>
              cliente.id === updatedCliente.id ? updatedCliente : cliente,
            ),
          );
          toast.success('Cliente actualizado correctamente');
        } else {
          const newCliente = await createCliente(formData);
          setClientes((current) => [newCliente, ...current]);
          toast.success('Cliente creado correctamente');
        }

        handleCloseModal();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el cliente');
      } finally {
        setIsSaving(false);
      }
    };

    void submit();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este cliente?')) {
      return;
    }

    const remove = async () => {
      setDeletingId(id);

      try {
        await deleteCliente(id);
        setClientes((current) => current.filter((cliente) => cliente.id !== id));
        toast.success('Cliente eliminado correctamente');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el cliente');
      } finally {
        setDeletingId(null);
      }
    };

    void remove();
  };

  const clientesConSaldo = clientes.filter((cliente) => cliente.saldoPendiente > 0).length;
  const saldoTotalPendiente = clientes.reduce((sum, cliente) => sum + cliente.saldoPendiente, 0);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-600 mt-1">Gestiona la base de datos de clientes</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total clientes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{clientes.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--brand-100)]">
                <Users className="w-6 h-6 text-[var(--brand-600)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Con saldo pendiente</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{clientesConSaldo}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo total pendiente</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(saldoTotalPendiente)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)] focus:border-transparent"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              Cargando clientes...
            </div>
          ) : filteredClientes.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchTerm ? 'No se encontraron clientes' : 'Aún no hay clientes registrados'}
              description={
                searchTerm
                  ? 'No hay clientes que coincidan con tu búsqueda'
                  : 'Empieza registrando tu primer cliente en la base de datos'
              }
              action={
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="w-4 h-4" />
                  Crear primer cliente
                </Button>
              }
            />
          ) : (
            <>
            <div className="divide-y divide-gray-200 md:hidden">
              {filteredClientes.map((cliente) => (
                <div key={cliente.id} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{cliente.nombre}</p>
                      <p className="mt-1 text-xs text-gray-500">{cliente.documento ? `Documento: ${cliente.documento}` : 'Sin documento registrado'}</p>
                    </div>
                    {cliente.saldoPendiente > 0 ? (
                      <span className="text-sm font-medium text-red-600">{formatCurrency(cliente.saldoPendiente)}</span>
                    ) : (
                      <Badge variant="success">Al día</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Teléfono</p>
                      <p className="mt-1 text-gray-900">{cliente.telefono || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Dirección</p>
                      <p className="mt-1 text-gray-900">{cliente.direccion || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Observación</p>
                      <p className="mt-1 text-gray-900">{cliente.observacion || '-'}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Trabajos</p>
                        <p className="mt-1 text-gray-900">{cliente.cantidadTrabajos}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Link to={`/dashboard/clientes/${cliente.id}`} className="min-w-0">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenModal(cliente)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDelete(cliente.id)}
                      disabled={deletingId === cliente.id}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observación</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trabajos</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                        {cliente.documento && (
                          <div className="text-xs text-gray-500">Documento: {cliente.documento}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {cliente.telefono || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {cliente.direccion || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {cliente.observacion || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {cliente.saldoPendiente > 0 ? (
                          <span className="text-sm font-medium text-red-600">
                            {formatCurrency(cliente.saldoPendiente)}
                          </span>
                        ) : (
                          <Badge variant="success">Al día</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {cliente.cantidadTrabajos}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/dashboard/clientes/${cliente.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(cliente)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cliente.id)}
                            disabled={deletingId === cliente.id}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
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

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Registra aquí los datos base del cliente para poder crear trabajos, pagos y seguimiento sin repetir información después.
          </div>
          <Input
            label="Nombre completo"
            helperText="Es el nombre con el que lo buscaran luego en trabajos y pagos."
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Ej: Juan Pérez García"
            required
          />

          <Input
            label="Teléfono (opcional)"
            helperText="Si lo tienes, sirve para llamadas, WhatsApp o coordinaciones."
            type="tel"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            placeholder="Ej: 987654321"
          />

          <Input
            label="Dirección (opcional)"
            helperText="Puede ser la dirección del cliente o un lugar frecuente de instalación."
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            placeholder="Ej: Av. Principal 123, Lima"
          />

          <Input
            label="Documento (opcional)"
            helperText="Puede ser DNI o RUC si te sirve para comprobantes o control interno."
            value={formData.documento}
            onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
            placeholder="Ej: DNI o RUC"
          />

          <Textarea
            label="Observación (opcional)"
            helperText="Anota datos útiles como referencia de ubicación, horario o preferencia del cliente."
            value={formData.observacion}
            onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
            placeholder="Notas adicionales sobre el cliente"
            rows={3}
          />

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingCliente ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

