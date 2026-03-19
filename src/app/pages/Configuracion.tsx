import { useEffect, useState } from 'react';
import { Save, Building, User, DollarSign, Package as PackageIcon, Briefcase, Shield, KeyRound, Plus, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Modal } from '../components/ui/Modal';
import { toast } from 'sonner';
import {
  changePassword,
  createUsuario,
  getConfiguracion,
  getUsuarios,
  updateConfiguracion,
  updatePerfil,
  updateUsuario,
  type UsuarioSistema,
} from '../lib/configuracion-api';
import { getAuthSession } from '../lib/auth';

const defaultNegocio = {
  nombreComercial: '',
  moneda: 'PEN',
  stockMinimoPorDefecto: '5',
};

const defaultUsuario = {
  nombre: '',
  email: '',
  telefono: '',
};

const defaultPassword = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const defaultUserForm = {
  nombre: '',
  email: '',
  telefono: '',
  password: '',
  rol: 'OPERADOR',
  activo: true,
};

export default function Configuracion() {
  const [datosNegocio, setDatosNegocio] = useState(defaultNegocio);
  const [datosUsuario, setDatosUsuario] = useState(defaultUsuario);
  const [passwordForm, setPasswordForm] = useState(defaultPassword);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNegocio, setIsSavingNegocio] = useState(false);
  const [isSavingUsuario, setIsSavingUsuario] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingSystemUser, setIsSavingSystemUser] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingSystemUser, setEditingSystemUser] = useState<UsuarioSistema | null>(null);
  const [userForm, setUserForm] = useState(defaultUserForm);

  const currentSession = getAuthSession();
  const isAdmin = currentSession?.user.rol === 'ADMIN';

  useEffect(() => {
    let isMounted = true;

    async function loadConfiguracion() {
      try {
        const [config, usuariosData] = await Promise.all([
          getConfiguracion(),
          isAdmin ? getUsuarios() : Promise.resolve([]),
        ]);

        if (!isMounted) {
          return;
        }

        setDatosNegocio({
          nombreComercial: config.negocio.nombreComercial,
          moneda: config.negocio.moneda,
          stockMinimoPorDefecto: String(config.negocio.stockMinimoPorDefecto),
        });

        setDatosUsuario({
          nombre: config.user.nombre,
          email: config.user.email,
          telefono: config.user.telefono || '',
        });

        setUsuarios(usuariosData);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar la configuracion.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadConfiguracion();

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  async function handleGuardarNegocio(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingNegocio(true);

    try {
      await updateConfiguracion(datosNegocio);
      toast.success('Datos del negocio actualizados');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el negocio.');
    } finally {
      setIsSavingNegocio(false);
    }
  }

  async function handleGuardarUsuario(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingUsuario(true);

    try {
      await updatePerfil(datosUsuario);
      toast.success('Datos del usuario actualizados');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.');
    } finally {
      setIsSavingUsuario(false);
    }
  }

  async function handleCambiarPassword(event: React.FormEvent) {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('La nueva contraseña y su confirmacion no coinciden.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(defaultPassword);
      toast.success('Contraseña actualizada correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setIsSavingPassword(false);
    }
  }

  function openUserModal(usuario?: UsuarioSistema) {
    if (usuario) {
      setEditingSystemUser(usuario);
      setUserForm({
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono || '',
        password: '',
        rol: usuario.rol,
        activo: usuario.activo ?? true,
      });
    } else {
      setEditingSystemUser(null);
      setUserForm(defaultUserForm);
    }

    setIsUserModalOpen(true);
  }

  function closeUserModal() {
    setEditingSystemUser(null);
    setUserForm(defaultUserForm);
    setIsUserModalOpen(false);
  }

  async function handleGuardarSystemUser(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingSystemUser(true);

    try {
      if (editingSystemUser) {
        const usuario = await updateUsuario(editingSystemUser.id, {
          nombre: userForm.nombre,
          email: userForm.email,
          telefono: userForm.telefono,
          rol: userForm.rol,
          activo: userForm.activo,
        });
        setUsuarios((current) => current.map((item) => (item.id === usuario.id ? usuario : item)));
        toast.success('Usuario actualizado');
      } else {
        const usuario = await createUsuario({
          nombre: userForm.nombre,
          email: userForm.email,
          telefono: userForm.telefono,
          password: userForm.password,
          rol: userForm.rol,
        });
        setUsuarios((current) => [usuario, ...current]);
        toast.success('Usuario creado');
      }

      closeUserModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el usuario.');
    } finally {
      setIsSavingSystemUser(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
        <p className="text-sm text-gray-600 mt-1">Administra la configuracion del sistema y los usuarios</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <CardTitle>Datos del negocio</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGuardarNegocio} className="space-y-4">
            <Input
              label="Nombre comercial"
              value={datosNegocio.nombreComercial}
              onChange={(e) => setDatosNegocio({ ...datosNegocio, nombreComercial: e.target.value })}
              placeholder="Nombre del negocio"
            />

            <Select
              label="Moneda"
              value={datosNegocio.moneda}
              onChange={(e) => setDatosNegocio({ ...datosNegocio, moneda: e.target.value })}
              options={[
                { value: 'PEN', label: 'Soles (S/)' },
                { value: 'USD', label: 'Dolares ($)' },
              ]}
            />

            <Input
              label="Stock minimo por defecto"
              type="number"
              value={datosNegocio.stockMinimoPorDefecto}
              onChange={(e) => setDatosNegocio({ ...datosNegocio, stockMinimoPorDefecto: e.target.value })}
              placeholder="5"
            />

            <div className="pt-4">
              <Button type="submit" disabled={isSavingNegocio || isLoading}>
                <Save className="w-4 h-4" />
                {isSavingNegocio ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <CardTitle>Mi perfil</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGuardarUsuario} className="space-y-4">
            <Input
              label="Nombre completo"
              value={datosUsuario.nombre}
              onChange={(e) => setDatosUsuario({ ...datosUsuario, nombre: e.target.value })}
            />

            <Input
              label="Correo electronico"
              type="email"
              value={datosUsuario.email}
              onChange={(e) => setDatosUsuario({ ...datosUsuario, email: e.target.value })}
            />

            <Input
              label="Telefono"
              value={datosUsuario.telefono}
              onChange={(e) => setDatosUsuario({ ...datosUsuario, telefono: e.target.value })}
            />

            <div className="pt-4">
              <Button type="submit" disabled={isSavingUsuario || isLoading}>
                <Save className="w-4 h-4" />
                {isSavingUsuario ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-amber-600" />
            </div>
            <CardTitle>Cambiar contraseña</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <Input
              label="Contraseña actual"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            />
            <Input
              label="Nueva contraseña"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            />
            <Input
              label="Confirmar nueva contraseña"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            />
            <div className="pt-4">
              <Button type="submit" disabled={isSavingPassword}>
                <KeyRound className="w-4 h-4" />
                {isSavingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <CardTitle>Usuarios del sistema</CardTitle>
              </div>
              <Button size="sm" onClick={() => openUserModal()}>
                <Plus className="w-4 h-4" />
                Nuevo usuario
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {usuarios.map((usuario) => (
                <div key={usuario.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{usuario.nombre}</p>
                    <p className="text-xs text-gray-500">{usuario.email} · {usuario.rol}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openUserModal(usuario)}>
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </Button>
                </div>
              ))}
              {!isLoading && usuarios.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">Todavia no hay usuarios registrados.</div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <PackageIcon className="w-5 h-5 text-green-600" />
            </div>
            <CardTitle>Notas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>Las categorias y tipos de trabajo siguen usando listas simples en pantalla por ahora.</p>
          <p>Si quieres, el siguiente paso puede ser convertir tambien esas listas a catalogos reales administrables.</p>
        </CardContent>
      </Card>

      <Modal isOpen={isUserModalOpen} onClose={closeUserModal} title={editingSystemUser ? 'Editar usuario' : 'Nuevo usuario'} size="md">
        <form onSubmit={handleGuardarSystemUser} className="space-y-4">
          <Input label="Nombre completo" value={userForm.nombre} onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })} required />
          <Input label="Correo electronico" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
          <Input label="Telefono" value={userForm.telefono} onChange={(e) => setUserForm({ ...userForm, telefono: e.target.value })} />
          {!editingSystemUser ? (
            <Input label="Contraseña inicial" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
          ) : null}
          <Select
            label="Rol"
            value={userForm.rol}
            onChange={(e) => setUserForm({ ...userForm, rol: e.target.value })}
            options={[
              { value: 'ADMIN', label: 'Administrador' },
              { value: 'OPERADOR', label: 'Operador' },
            ]}
          />
          {editingSystemUser ? (
            <Select
              label="Estado"
              value={userForm.activo ? 'activo' : 'inactivo'}
              onChange={(e) => setUserForm({ ...userForm, activo: e.target.value === 'activo' })}
              options={[
                { value: 'activo', label: 'Activo' },
                { value: 'inactivo', label: 'Inactivo' },
              ]}
            />
          ) : null}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeUserModal} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSavingSystemUser}>
              {isSavingSystemUser ? 'Guardando...' : editingSystemUser ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
