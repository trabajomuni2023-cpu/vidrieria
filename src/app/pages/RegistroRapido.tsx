import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CheckCircle2,
  CreditCard,
  Search,
  UserRound,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { HelpCallout } from '../components/ui/HelpCallout';
import { createCliente, getClientes, type Cliente } from '../lib/clientes-api';
import { createTrabajo, type TrabajoPayload } from '../lib/trabajos-api';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

type ClienteMode = 'existente' | 'nuevo';

const initialClienteForm = {
  nombre: '',
  telefono: '',
  direccion: '',
  documento: '',
  observacion: '',
};

const initialTrabajoForm: TrabajoPayload = {
  clienteId: '',
  descripcion: '',
  total: '',
  adelantoInicial: '',
  fechaEntrega: '',
  tipoTrabajo: '',
  direccionInstalacion: '',
  observaciones: '',
  comprobanteNumero: '',
  metodoPago: 'EFECTIVO',
};

export default function RegistroRapido() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clienteMode, setClienteMode] = useState<ClienteMode>('existente');
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('');
  const [registrarAdelanto, setRegistrarAdelanto] = useState(true);
  const [clienteForm, setClienteForm] = useState(initialClienteForm);
  const [trabajoForm, setTrabajoForm] = useState<TrabajoPayload>(initialTrabajoForm);

  useEffect(() => {
    let isMounted = true;

    async function loadClientes() {
      try {
        const data = await getClientes();

        if (!isMounted) {
          return;
        }

        setClientes(data);
        if (data.length > 0) {
          setClienteSeleccionadoId(data[0].id);
        } else {
          setClienteMode('nuevo');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar la lista de clientes.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadClientes();

    return () => {
      isMounted = false;
    };
  }, []);

  const clientesFiltrados = useMemo(() => {
    const search = clienteSearch.trim().toLowerCase();

    if (!search) {
      return clientes;
    }

    return clientes.filter(
      (cliente) =>
        cliente.nombre.toLowerCase().includes(search) ||
        (cliente.telefono || '').toLowerCase().includes(search) ||
        (cliente.documento || '').toLowerCase().includes(search),
    );
  }, [clienteSearch, clientes]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => cliente.id === clienteSeleccionadoId) || null,
    [clienteSeleccionadoId, clientes],
  );

  const totalNumero = Number(trabajoForm.total || 0);
  const adelantoNumero = Number(registrarAdelanto ? trabajoForm.adelantoInicial || 0 : 0);
  const saldoCalculado = Math.max(totalNumero - adelantoNumero, 0);

  const progreso = {
    cliente:
      clienteMode === 'existente'
        ? Boolean(clienteSeleccionadoId)
        : Boolean(clienteForm.nombre.trim()),
    trabajo: Boolean(trabajoForm.descripcion.trim()) && totalNumero > 0,
    pago: !registrarAdelanto || adelantoNumero > 0,
  };

  const pasosCompletos = Object.values(progreso).filter(Boolean).length;

  function resetFormulario() {
    setClienteMode(clientes.length > 0 ? 'existente' : 'nuevo');
    setClienteSearch('');
    setClienteSeleccionadoId(clientes[0]?.id || '');
    setRegistrarAdelanto(true);
    setClienteForm(initialClienteForm);
    setTrabajoForm(initialTrabajoForm);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (clienteMode === 'existente' && !clienteSeleccionadoId) {
      toast.error('Selecciona un cliente existente o cambia a cliente nuevo.');
      return;
    }

    if (clienteMode === 'nuevo' && !clienteForm.nombre.trim()) {
      toast.error('Ingresa al menos el nombre del cliente.');
      return;
    }

    if (!trabajoForm.descripcion.trim() || totalNumero <= 0) {
      toast.error('Completa la descripción y el total del trabajo antes de guardar.');
      return;
    }

    if (registrarAdelanto && adelantoNumero < 0) {
      toast.error('El adelanto no puede ser negativo.');
      return;
    }

    setIsSaving(true);

    try {
      let clienteId = clienteSeleccionadoId;

      if (clienteMode === 'nuevo') {
        const nuevoCliente = await createCliente({
          nombre: clienteForm.nombre.trim(),
          telefono: clienteForm.telefono.trim(),
          direccion: clienteForm.direccion.trim(),
          documento: clienteForm.documento.trim(),
          observacion: clienteForm.observacion.trim(),
        });

        clienteId = nuevoCliente.id;
        setClientes((current) => [nuevoCliente, ...current]);
      }

      const trabajo = await createTrabajo({
        ...trabajoForm,
        clienteId,
        adelantoInicial: registrarAdelanto ? trabajoForm.adelantoInicial || '0' : '0',
      });

      toast.success('Registro completo guardado. Ya puedes revisar el detalle del trabajo.');
      resetFormulario();
      navigate(`/dashboard/trabajos/${trabajo.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo completar el registro.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section
        className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm"
        style={{
          backgroundImage:
            'linear-gradient(135deg, #ffffff 0%, var(--brand-50) 55%, color-mix(in srgb, var(--brand-100) 55%, white) 100%)',
        }}
      >
        <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[1.35fr_0.9fr] lg:px-8">
          <div className="space-y-4">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]"
              style={{
                border: '1px solid color-mix(in srgb, var(--brand-600) 20%, white)',
                background: 'color-mix(in srgb, var(--brand-100) 65%, white)',
                color: 'var(--brand-700)',
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Registro guiado
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Registrar cliente, trabajo y pago en un solo flujo
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Pensado para uso rápido y sin confusión. Completa los bloques en orden
                y el sistema guardará todo junto.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Progreso del registro
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {pasosCompletos} de 3 bloques listos
            </p>
            <div className="mt-4 grid gap-3">
              {[
                { label: 'Cliente', ok: progreso.cliente },
                { label: 'Trabajo', ok: progreso.trabajo },
                { label: 'Pago inicial', ok: progreso.pago },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm text-slate-700">{item.label}</span>
                  {item.ok ? (
                    <Badge variant="success">Listo</Badge>
                  ) : (
                    <Badge variant="warning">Pendiente</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <HelpCallout
          title="Consejo para usuarios nuevos"
          description="Si el cliente ya existe, selecciónalo primero. Si es nuevo, crea sus datos básicos y luego continúa con el trabajo."
          tone="tip"
        />
        <HelpCallout
          title="Qué guardará el sistema"
          description="Al finalizar se registrarán el cliente, el trabajo y el pago inicial si corresponde. No necesitas ir módulo por módulo."
          tone="info"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Cliente</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {clienteMode === 'existente'
                  ? clienteSeleccionado?.nombre || 'Seleccionar cliente'
                  : clienteForm.nombre || 'Cliente nuevo'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Trabajo</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {trabajoForm.descripcion || 'Pendiente de completar'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pago inicial</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {registrarAdelanto ? formatCurrency(adelantoNumero) : 'Sin adelanto'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.75fr]"
      >
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle>Paso 1. Cliente</CardTitle>
              <CardDescription>
                Primero elige si vas a usar un cliente existente o si vas a crear uno nuevo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <HelpCallout
                title="Qué hacer aquí"
                description="Este bloque solo identifica a la persona o empresa. Teléfono y dirección son opcionales, así que no te detengas si no los tienes."
                tone="info"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setClienteMode('existente')}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    clienteMode === 'existente'
                      ? 'border-[var(--brand-600)] bg-[var(--brand-50)]'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">Usar cliente existente</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Ideal si ya atendiste a esa persona antes.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setClienteMode('nuevo')}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    clienteMode === 'nuevo'
                      ? 'border-[var(--brand-600)] bg-[var(--brand-50)]'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">Crear cliente nuevo</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Úsalo si es la primera vez que lo registran.
                  </p>
                </button>
              </div>

              {clienteMode === 'existente' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar cliente por nombre, teléfono o documento..."
                      value={clienteSearch}
                      onChange={(event) => setClienteSearch(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)]"
                    />
                  </div>

                  <Select
                    label="Cliente"
                    helperText="Selecciona la persona o empresa que está haciendo el pedido."
                    value={clienteSeleccionadoId}
                    onChange={(event) => setClienteSeleccionadoId(event.target.value)}
                    options={[
                      {
                        value: '',
                        label: isLoading ? 'Cargando clientes...' : 'Seleccionar cliente',
                      },
                      ...clientesFiltrados.map((cliente) => ({
                        value: cliente.id,
                        label: cliente.nombre,
                      })),
                    ]}
                    required
                  />

                  {clienteSeleccionado ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {clienteSeleccionado.nombre}
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Teléfono
                          </p>
                          <p className="mt-1 text-slate-900">
                            {clienteSeleccionado.telefono || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Dirección
                          </p>
                          <p className="mt-1 text-slate-900">
                            {clienteSeleccionado.direccion || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Nombre completo"
                    helperText="Es el dato más importante para encontrar luego al cliente."
                    value={clienteForm.nombre}
                    onChange={(event) =>
                      setClienteForm((current) => ({ ...current, nombre: event.target.value }))
                    }
                    placeholder="Ej: María Torres"
                    required
                  />
                  <Input
                    label="Teléfono (opcional)"
                    helperText="Útil para llamadas o WhatsApp."
                    value={clienteForm.telefono}
                    onChange={(event) =>
                      setClienteForm((current) => ({
                        ...current,
                        telefono: event.target.value,
                      }))
                    }
                    placeholder="Ej: 987654321"
                  />
                  <Input
                    label="Dirección (opcional)"
                    helperText="Puedes registrar dirección del cliente o lugar frecuente."
                    value={clienteForm.direccion}
                    onChange={(event) =>
                      setClienteForm((current) => ({
                        ...current,
                        direccion: event.target.value,
                      }))
                    }
                    placeholder="Ej: Av. Principal 123"
                  />
                  <Input
                    label="Documento (opcional)"
                    helperText="DNI o RUC si hace falta para comprobantes."
                    value={clienteForm.documento}
                    onChange={(event) =>
                      setClienteForm((current) => ({
                        ...current,
                        documento: event.target.value,
                      }))
                    }
                    placeholder="Ej: 12345678"
                  />
                  <div className="sm:col-span-2">
                    <Textarea
                      label="Observación (opcional)"
                      helperText="Anota un dato útil para recordar a este cliente."
                      rows={3}
                      value={clienteForm.observacion}
                      onChange={(event) =>
                        setClienteForm((current) => ({
                          ...current,
                          observacion: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle>Paso 2. Trabajo</CardTitle>
              <CardDescription>
                Ahora registra el pedido principal para que entre directo al flujo del negocio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <HelpCallout
                title="Qué no puede faltar"
                description="La descripción y el total son obligatorios. Todo lo demás te ayuda a ordenar mejor entregas, calendario y reportes."
                tone="tip"
              />

              <Textarea
                label="Descripción del trabajo"
                helperText="Explica claramente qué se va a fabricar, instalar o entregar."
                rows={3}
                value={trabajoForm.descripcion}
                onChange={(event) =>
                  setTrabajoForm((current) => ({
                    ...current,
                    descripcion: event.target.value,
                  }))
                }
                placeholder="Ej: Fabricación e instalación de mampara de vidrio templado"
                required
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Total acordado"
                  helperText="Monto total del trabajo."
                  type="number"
                  step="0.01"
                  value={trabajoForm.total}
                  onChange={(event) =>
                    setTrabajoForm((current) => ({ ...current, total: event.target.value }))
                  }
                  placeholder="0.00"
                  required
                />
                <Input
                  label="Fecha de entrega (opcional)"
                  helperText="Si ya la sabes, aparecerá luego en calendario."
                  type="date"
                  value={trabajoForm.fechaEntrega}
                  onChange={(event) =>
                    setTrabajoForm((current) => ({
                      ...current,
                      fechaEntrega: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Tipo de trabajo (opcional)"
                  helperText="Ejemplo: Mampara, espejo, puerta o ventana."
                  value={trabajoForm.tipoTrabajo}
                  onChange={(event) =>
                    setTrabajoForm((current) => ({
                      ...current,
                      tipoTrabajo: event.target.value,
                    }))
                  }
                  placeholder="Ej: Mampara"
                />
                <Input
                  label="Boleta o comprobante (opcional)"
                  helperText="Si ya se emitió, regístralo aquí."
                  value={trabajoForm.comprobanteNumero}
                  onChange={(event) =>
                    setTrabajoForm((current) => ({
                      ...current,
                      comprobanteNumero: event.target.value,
                    }))
                  }
                  placeholder="Ej: B001-000123"
                />
              </div>

              <Input
                label="Dirección de instalación (opcional)"
                helperText="Útil cuando el trabajo se hace fuera del taller."
                value={trabajoForm.direccionInstalacion}
                onChange={(event) =>
                  setTrabajoForm((current) => ({
                    ...current,
                    direccionInstalacion: event.target.value,
                  }))
                }
                placeholder="Ej: Calle Las Flores 220"
              />

              <Textarea
                label="Observaciones (opcional)"
                helperText="Medidas, referencias, coordinaciones o detalles especiales."
                rows={3}
                value={trabajoForm.observaciones}
                onChange={(event) =>
                  setTrabajoForm((current) => ({
                    ...current,
                    observaciones: event.target.value,
                  }))
                }
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle>Paso 3. Pago inicial</CardTitle>
              <CardDescription>
                Si el cliente dejó adelanto ahora mismo, puedes registrarlo aquí sin salir
                a otro módulo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <HelpCallout
                title="Si no pagó hoy, no pasa nada"
                description="Puedes dejar este bloque sin adelanto. El trabajo se guardará igual y luego el cobro se registra desde Pagos o desde el detalle del trabajo."
                tone="warning"
              />

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                  checked={registrarAdelanto}
                  onChange={(event) => setRegistrarAdelanto(event.target.checked)}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Registrar adelanto ahora</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Si no hubo pago inicial, desactiva esta opción y el trabajo quedará solo
                    con saldo pendiente.
                  </p>
                </div>
              </label>

              {registrarAdelanto ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Monto del adelanto"
                    helperText="Lo que el cliente pagó en este momento."
                    type="number"
                    step="0.01"
                    value={trabajoForm.adelantoInicial}
                    onChange={(event) =>
                      setTrabajoForm((current) => ({
                        ...current,
                        adelantoInicial: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                  />
                  <Select
                    label="Método de pago"
                    helperText="Sirve para caja y reportes."
                    value={trabajoForm.metodoPago || 'EFECTIVO'}
                    onChange={(event) =>
                      setTrabajoForm((current) => ({
                        ...current,
                        metodoPago: event.target.value,
                      }))
                    }
                    options={[
                      { value: 'EFECTIVO', label: 'Efectivo' },
                      { value: 'TRANSFERENCIA', label: 'Transferencia' },
                      { value: 'TARJETA', label: 'Tarjeta' },
                      { value: 'YAPE', label: 'Yape' },
                      { value: 'PLIN', label: 'Plin' },
                    ]}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm xl:sticky xl:top-24">
            <CardHeader>
              <CardTitle>Resumen del registro</CardTitle>
              <CardDescription>
                Antes de guardar, revisa que todo esté correcto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Cliente
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {clienteMode === 'existente'
                    ? clienteSeleccionado?.nombre || 'Pendiente'
                    : clienteForm.nombre || 'Pendiente'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Trabajo
                </p>
                <p className="mt-2 text-sm text-slate-900">
                  {trabajoForm.descripcion || 'Pendiente de describir'}
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Total</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(totalNumero)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Adelanto</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(adelantoNumero)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Saldo</span>
                    <span className="font-semibold text-rose-600">
                      {formatCurrency(saldoCalculado)}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl border px-4 py-3 text-sm"
                style={{
                  borderColor: 'color-mix(in srgb, var(--brand-100) 90%, white)',
                  background: 'color-mix(in srgb, var(--brand-50) 80%, white)',
                  color: 'var(--brand-700)',
                }}
              >
                Al guardar, el sistema hará todo en orden: cliente, trabajo y pago inicial
                si corresponde.
              </div>

              <HelpCallout
                title="Antes de presionar guardar"
                description="Revisa especialmente el cliente elegido, la descripción del trabajo y el monto del adelanto. Son los datos que más suelen generar correcciones."
                tone="warning"
              />

              <div className="space-y-3 pt-2">
                <Button type="submit" className="w-full" disabled={isSaving}>
                  <CheckCircle2 className="h-4 w-4" />
                  {isSaving ? 'Guardando registro...' : 'Guardar registro completo'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={resetFormulario}
                  disabled={isSaving}
                >
                  Reiniciar formulario
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
