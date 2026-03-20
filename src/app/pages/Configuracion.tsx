import { useEffect, useState } from 'react';
import { Save, Building, User, Package as PackageIcon, Shield, KeyRound, Plus, Edit2, Palette } from 'lucide-react';
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
import {
  applyContentPalette,
  applyThemePreferences,
  applySidebarPalette,
  getStoredThemePreferences,
  themePresets,
  themePalettes,
  type ThemePaletteId,
} from '../lib/theme-preferences';

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
  const storedTheme = getStoredThemePreferences();
  const [contentPalette, setContentPalette] = useState<ThemePaletteId>(storedTheme.contentPaletteId);
  const [sidebarPalette, setSidebarPalette] = useState<ThemePaletteId>(storedTheme.sidebarPaletteId);

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

  function handleContentPaletteChange(paletteId: ThemePaletteId) {
    setContentPalette(paletteId);
    applyContentPalette(paletteId);
    toast.success('Color de la vista principal actualizado');
  }

  function handleSidebarPaletteChange(paletteId: ThemePaletteId) {
    setSidebarPalette(paletteId);
    applySidebarPalette(paletteId);
    toast.success('Color del menu lateral actualizado');
  }

  function handleApplyPreset(presetId: string) {
    const preset = themePresets.find((item) => item.id === presetId);

    if (!preset) {
      return;
    }

    setContentPalette(preset.preferences.contentPaletteId);
    setSidebarPalette(preset.preferences.sidebarPaletteId);
    applyThemePreferences(preset.preferences);
    toast.success(`Combinacion "${preset.name}" aplicada`);
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
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--brand-100)]">
              <Palette className="w-5 h-5 text-[var(--brand-600)]" />
            </div>
            <div>
              <CardTitle>Colores del sistema</CardTitle>
              <p className="text-sm text-gray-600">Puedes usar un color distinto para el menu lateral y otro para la vista principal.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Combinaciones recomendadas</h3>
            <p className="mt-1 text-sm text-gray-600">Aplican un estilo equilibrado en un solo clic y luego puedes ajustar cada zona por separado.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {themePresets.map((preset) => {
              const contentTheme = themePalettes.find((palette) => palette.id === preset.preferences.contentPaletteId);
              const sidebarTheme = themePalettes.find((palette) => palette.id === preset.preferences.sidebarPaletteId);

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className="rounded-2xl border border-gray-200 p-4 text-left transition hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="mb-4 flex overflow-hidden rounded-xl border border-gray-200">
                    <div
                      className="h-20 w-1/3"
                      style={{
                        backgroundImage: `linear-gradient(180deg, ${sidebarTheme?.heroFrom}, ${sidebarTheme?.heroVia})`,
                      }}
                    />
                    <div
                      className="h-20 flex-1"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${contentTheme?.heroFrom}, ${contentTheme?.heroVia}, ${contentTheme?.heroTo})`,
                      }}
                    />
                  </div>
                  <p className="font-semibold text-gray-900">{preset.name}</p>
                  <p className="mt-1 text-sm text-gray-600">{preset.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-gray-500">
                    Menu {sidebarTheme?.name} · Vista {contentTheme?.name}
                  </p>
                </button>
              );
            })}
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Vista principal</h3>
            <p className="mt-1 text-sm text-gray-600">Afecta dashboard, reportes, botones y paneles principales.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {themePalettes.map((palette) => {
              const isActive = contentPalette === palette.id;

              return (
                <button
                  key={`content-${palette.id}`}
                  type="button"
                  onClick={() => handleContentPaletteChange(palette.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isActive ? 'border-gray-900 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className="mb-4 h-24 rounded-xl"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${palette.heroFrom}, ${palette.heroVia}, ${palette.heroTo})`,
                    }}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{palette.name}</p>
                      <p className="mt-1 text-sm text-gray-600">{palette.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: palette.accent }} />
                      <span className="h-5 w-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: palette.accentSoft }} />
                      <span className="h-5 w-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: palette.heroTo }} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-gray-500">{isActive ? 'Paleta activa' : 'Usar esta paleta'}</span>
                    {isActive ? <span className="font-medium text-[var(--brand-600)]">Seleccionada</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-base font-semibold text-gray-900">Menu lateral</h3>
            <p className="mt-1 text-sm text-gray-600">Ideal para dejarlo mas sobrio y que descanse mejor la vista.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {themePalettes.map((palette) => {
              const isActive = sidebarPalette === palette.id;

              return (
                <button
                  key={`sidebar-${palette.id}`}
                  type="button"
                  onClick={() => handleSidebarPaletteChange(palette.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isActive ? 'border-gray-900 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className="mb-4 h-24 rounded-xl"
                    style={{
                      backgroundImage: `linear-gradient(180deg, ${palette.heroFrom}, ${palette.heroVia})`,
                    }}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{palette.name}</p>
                      <p className="mt-1 text-sm text-gray-600">{palette.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: palette.heroFrom }} />
                      <span className="h-5 w-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: palette.heroVia }} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-gray-500">{isActive ? 'Paleta activa' : 'Usar esta paleta'}</span>
                    {isActive ? <span className="font-medium text-gray-900">Seleccionada</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Estos cambios se guardan en el navegador actual. Si luego quieres, puedo hacer que tambien se guarden en la base de datos para que todos vean la misma combinacion por defecto.
          </div>
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
