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
    cliente.telefono.includes(searchTerm) ||
    cliente.direccion.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleOpenModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-600 mt-1">Gestiona la base de datos de clientes</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total clientes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{clientes.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
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
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="overflow-x-auto">
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
                        {cliente.telefono}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {cliente.direccion}
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
          <Input
            label="Nombre completo"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Ej: Juan Pérez García"
            required
          />

          <Input
            label="Teléfono"
            type="tel"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            placeholder="Ej: 987654321"
            required
          />

          <Input
            label="Dirección"
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            placeholder="Ej: Av. Principal 123, Lima"
            required
          />

          <Input
            label="Documento (opcional)"
            value={formData.documento}
            onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
            placeholder="Ej: DNI o RUC"
          />

          <Textarea
            label="Observación (opcional)"
            value={formData.observacion}
            onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
            placeholder="Notas adicionales sobre el cliente"
            rows={3}
          />

          <div className="flex gap-3 pt-4">
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
