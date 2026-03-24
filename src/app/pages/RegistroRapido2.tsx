import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Briefcase, CheckCircle2, CreditCard, Plus, Search, Sparkles, UserRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { createCliente, getClientes, type Cliente } from '../lib/clientes-api';
import { createTrabajo, type TrabajoPayload } from '../lib/trabajos-api';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

type ClienteMode = 'existente' | 'nuevo';
type WizardStep = 1 | 2 | 3;

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

const stepItems: Array<{ step: WizardStep; title: string; description: string }> = [
  { step: 1, title: 'Cliente', description: 'Selecciona un cliente o crea uno nuevo.' },
  { step: 2, title: 'Trabajo', description: 'Describe el pedido y cuánto costará.' },
  { step: 3, title: 'Pago inicial', description: 'Registra el adelanto solo si lo dejaron hoy.' },
];

export default function RegistroRapido2() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

    return clientes.filter((cliente) =>
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
  const progresoCliente = clienteMode === 'existente' ? Boolean(clienteSeleccionadoId) : Boolean(clienteForm.nombre.trim());
  const progresoTrabajo = Boolean(trabajoForm.descripcion.trim()) && totalNumero > 0;
  const progresoPago = !registrarAdelanto || adelantoNumero > 0;

  function resetFormulario() {
    setCurrentStep(1);
    setClienteMode(clientes.length > 0 ? 'existente' : 'nuevo');
    setClienteSearch('');
    setClienteSeleccionadoId(clientes[0]?.id || '');
    setRegistrarAdelanto(true);
    setClienteForm(initialClienteForm);
    setTrabajoForm(initialTrabajoForm);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    resetFormulario();
  }

  function validateStep(step: WizardStep) {
    if (step === 1) {
      if (clienteMode === 'existente' && !clienteSeleccionadoId) {
        toast.error('Selecciona un cliente antes de continuar.');
        return false;
      }

      if (clienteMode === 'nuevo' && !clienteForm.nombre.trim()) {
        toast.error('Ingresa al menos el nombre del cliente.');
        return false;
      }
    }

    if (step === 2) {
      if (!trabajoForm.descripcion.trim()) {
        toast.error('Describe el trabajo antes de continuar.');
        return false;
      }

      if (Number(trabajoForm.total || 0) <= 0) {
        toast.error('Ingresa un total válido para el trabajo.');
        return false;
      }
    }

    if (step === 3 && registrarAdelanto && Number(trabajoForm.adelantoInicial || 0) < 0) {
      toast.error('El adelanto no puede ser negativo.');
      return false;
    }

    return true;
  }

  function handleNext() {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < 3) {
      setCurrentStep((current) => (current + 1) as WizardStep);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep((current) => (current - 1) as WizardStep);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
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

      toast.success('Registro guiado guardado correctamente.');
      setIsModalOpen(false);
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
          backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--brand-50) 55%, color-mix(in srgb, var(--brand-100) 55%, white) 100%)',
        }}
      >
        <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[1.25fr_0.95fr] lg:px-8">
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
              Registro guiado por pasos
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Una sola acción y un formulario por vez</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Esta versión evita el scroll largo. Primero abres el registro, luego avanzas cliente, trabajo y pago inicial en una ventana guiada.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Cómo funciona</p>
            <div className="mt-4 space-y-3">
              {stepItems.map((item) => (
                <div key={item.step} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-600)] text-xs font-semibold text-[var(--brand-contrast)]">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-slate-200/80 shadow-sm xl:col-span-2">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Propuesta 2</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Registro rápido en modal</h2>
              <p className="mt-2 text-sm text-slate-600">Ideal para alguien que quiere hacer clic en “Registrar” y seguir pasos claros sin perderse.</p>
            </div>
            <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Registrar ahora
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Qué se guarda</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-700">Cliente</span>
                <Badge variant="info">Incluido</Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-700">Trabajo</span>
                <Badge variant="info">Incluido</Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-700">Pago inicial</span>
                <Badge variant="info">Opcional</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title="Registro rápido 2" size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {stepItems.map((item) => (
              <div
                key={item.step}
                className={`rounded-2xl border px-4 py-4 transition ${
                  currentStep === item.step
                    ? 'border-slate-300 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                        currentStep === item.step
                          ? 'bg-white text-slate-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.step}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${currentStep === item.step ? 'text-white' : 'text-slate-900'}`}>{item.title}</p>
                      <p className={`mt-1 text-sm ${currentStep === item.step ? 'text-slate-200' : 'text-slate-600'}`}>{item.description}</p>
                    </div>
                  </div>

                  <Badge
                    variant={
                      currentStep === item.step
                        ? 'default'
                        : item.step === 1
                          ? (progresoCliente ? 'success' : 'info')
                          : item.step === 2
                            ? (progresoTrabajo ? 'success' : 'info')
                            : (progresoPago ? 'success' : 'info')
                    }
                  >
                    {currentStep === item.step
                      ? 'Actual'
                      : item.step === 1
                        ? (progresoCliente ? 'Listo' : 'Pendiente')
                        : item.step === 2
                          ? (progresoTrabajo ? 'Listo' : 'Pendiente')
                          : (progresoPago ? 'Listo' : 'Pendiente')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.75fr]">
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader>
                <CardTitle>
                  {currentStep === 1 ? 'Paso 1. Cliente' : currentStep === 2 ? 'Paso 2. Trabajo' : 'Paso 3. Pago inicial'}
                </CardTitle>
                <CardDescription>
                  {currentStep === 1
                    ? 'Elige un cliente existente o crea uno nuevo.'
                    : currentStep === 2
                    ? 'Registra lo que se va a fabricar o instalar.'
                    : 'Si dejaron adelanto hoy, puedes anotarlo aquí.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {currentStep === 1 ? (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setClienteMode('existente')}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          clienteMode === 'existente'
                            ? 'border-slate-300 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-sm font-semibold ${clienteMode === 'existente' ? 'text-white' : 'text-slate-900'}`}>Usar cliente existente</p>
                            <p className={`mt-1 text-sm ${clienteMode === 'existente' ? 'text-slate-200' : 'text-slate-600'}`}>Más rápido si ya está registrado.</p>
                          </div>
                          {clienteMode === 'existente' ? <Badge variant="default">Seleccionado</Badge> : null}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setClienteMode('nuevo')}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          clienteMode === 'nuevo'
                            ? 'border-slate-300 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-sm font-semibold ${clienteMode === 'nuevo' ? 'text-white' : 'text-slate-900'}`}>Crear cliente nuevo</p>
                            <p className={`mt-1 text-sm ${clienteMode === 'nuevo' ? 'text-slate-200' : 'text-slate-600'}`}>Úsalo si todavía no existe.</p>
                          </div>
                          {clienteMode === 'nuevo' ? <Badge variant="default">Seleccionado</Badge> : null}
                        </div>
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
                          helperText="Selecciona quién está haciendo el pedido."
                          value={clienteSeleccionadoId}
                          onChange={(event) => setClienteSeleccionadoId(event.target.value)}
                          options={[
                            { value: '', label: isLoading ? 'Cargando clientes...' : 'Seleccionar cliente' },
                            ...clientesFiltrados.map((cliente) => ({
                              value: cliente.id,
                              label: cliente.nombre,
                            })),
                          ]}
                          required
                        />

                        {clienteSeleccionado ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-900">{clienteSeleccionado.nombre}</p>
                            <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Teléfono</p>
                                <p className="mt-1 text-slate-900">{clienteSeleccionado.telefono || '-'}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Dirección</p>
                                <p className="mt-1 text-slate-900">{clienteSeleccionado.direccion || '-'}</p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                          label="Nombre completo"
                          helperText="Dato principal para ubicar luego al cliente."
                          value={clienteForm.nombre}
                          onChange={(event) => setClienteForm((current) => ({ ...current, nombre: event.target.value }))}
                          placeholder="Ej: María Torres"
                          required
                        />
                        <Input
                          label="Teléfono (opcional)"
                          helperText="Para llamadas o WhatsApp."
                          value={clienteForm.telefono}
                          onChange={(event) => setClienteForm((current) => ({ ...current, telefono: event.target.value }))}
                        />
                        <Input
                          label="Dirección (opcional)"
                          helperText="Puedes dejarla vacía si aún no la sabes."
                          value={clienteForm.direccion}
                          onChange={(event) => setClienteForm((current) => ({ ...current, direccion: event.target.value }))}
                        />
                        <Input
                          label="Documento (opcional)"
                          helperText="DNI o RUC si hace falta."
                          value={clienteForm.documento}
                          onChange={(event) => setClienteForm((current) => ({ ...current, documento: event.target.value }))}
                        />
                        <div className="sm:col-span-2">
                          <Textarea
                            label="Observación (opcional)"
                            helperText="Cualquier detalle útil para recordar al cliente."
                            rows={3}
                            value={clienteForm.observacion}
                            onChange={(event) => setClienteForm((current) => ({ ...current, observacion: event.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : null}

                {currentStep === 2 ? (
                  <>
                    <Textarea
                      label="Descripción del trabajo"
                      helperText="Explica claramente qué se va a fabricar, instalar o entregar."
                      rows={3}
                      value={trabajoForm.descripcion}
                      onChange={(event) => setTrabajoForm((current) => ({ ...current, descripcion: event.target.value }))}
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
                        onChange={(event) => setTrabajoForm((current) => ({ ...current, total: event.target.value }))}
                        placeholder="0.00"
                        required
                      />
                      <Input
                        label="Fecha de entrega (opcional)"
                        helperText="Si ya la sabes, aparecerá en calendario."
                        type="date"
                        value={trabajoForm.fechaEntrega}
                        onChange={(event) => setTrabajoForm((current) => ({ ...current, fechaEntrega: event.target.value }))}
                      />
                      <Input
                        label="Tipo de trabajo (opcional)"
                        helperText="Ejemplo: Mampara, espejo, puerta."
                        value={trabajoForm.tipoTrabajo}
                        onChange={(event) => setTrabajoForm((current) => ({ ...current, tipoTrabajo: event.target.value }))}
                      />
                      <Input
                        label="Boleta o comprobante (opcional)"
                        helperText="Si ya se emitió, anótalo aquí."
                        value={trabajoForm.comprobanteNumero}
                        onChange={(event) => setTrabajoForm((current) => ({ ...current, comprobanteNumero: event.target.value }))}
                      />
                    </div>

                    <Input
                      label="Dirección de instalación (opcional)"
                      helperText="Útil cuando el trabajo se hace fuera del taller."
                      value={trabajoForm.direccionInstalacion}
                      onChange={(event) => setTrabajoForm((current) => ({ ...current, direccionInstalacion: event.target.value }))}
                    />

                    <Textarea
                      label="Observaciones (opcional)"
                      helperText="Medidas, referencias, coordinaciones o detalles especiales."
                      rows={3}
                      value={trabajoForm.observaciones}
                      onChange={(event) => setTrabajoForm((current) => ({ ...current, observaciones: event.target.value }))}
                    />
                  </>
                ) : null}

                {currentStep === 3 ? (
                  <>
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                        checked={registrarAdelanto}
                        onChange={(event) => setRegistrarAdelanto(event.target.checked)}
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Registrar adelanto ahora</p>
                        <p className="mt-1 text-sm text-slate-600">Si no hubo pago inicial, desactiva esta opción y el trabajo quedará con saldo completo.</p>
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
                          onChange={(event) => setTrabajoForm((current) => ({ ...current, adelantoInicial: event.target.value }))}
                          placeholder="0.00"
                        />
                        <Select
                          label="Método de pago"
                          helperText="Sirve para caja y reportes."
                          value={trabajoForm.metodoPago || 'EFECTIVO'}
                          onChange={(event) => setTrabajoForm((current) => ({ ...current, metodoPago: event.target.value }))}
                          options={[
                            { value: 'EFECTIVO', label: 'Efectivo' },
                            { value: 'TRANSFERENCIA', label: 'Transferencia' },
                            { value: 'TARJETA', label: 'Tarjeta' },
                            { value: 'YAPE', label: 'Yape' },
                            { value: 'PLIN', label: 'Plin' },
                          ]}
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        Este registro se guardará sin pago inicial.
                      </div>
                    )}
                  </>
                ) : null}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
                  <Button type="button" variant="outline" onClick={handleBack} disabled={currentStep === 1 || isSaving}>
                    <ArrowLeft className="h-4 w-4" />
                    Anterior
                  </Button>

                  {currentStep < 3 ? (
                    <Button type="button" onClick={handleNext} disabled={isSaving}>
                      Siguiente
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSaving}>
                      <CheckCircle2 className="h-4 w-4" />
                      {isSaving ? 'Guardando...' : 'Guardar registro'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-sm xl:sticky xl:top-4">
              <CardHeader>
                <CardTitle>Resumen rápido</CardTitle>
                <CardDescription>Así no pierdes el contexto aunque solo veas un paso a la vez.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Cliente</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 xl:text-base">
                    {clienteMode === 'existente' ? clienteSeleccionado?.nombre || 'Pendiente' : clienteForm.nombre || 'Pendiente'}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 xl:text-sm">
                    {clienteMode === 'existente'
                      ? 'Se usará un cliente ya registrado.'
                      : 'Se creará un cliente nuevo al guardar.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Trabajo</p>
                  <p className="mt-2 text-sm text-slate-900 xl:text-base">{trabajoForm.descripcion || 'Pendiente de describir'}</p>
                  <p className="mt-2 text-xs text-slate-500 xl:text-sm">
                    {totalNumero > 0 ? `Total acordado: ${formatCurrency(totalNumero)}` : 'Aún falta indicar el total.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Montos</p>
                  <div className="mt-3 space-y-3 text-sm xl:text-base">
                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                      <span className="text-slate-600">Total</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(totalNumero)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                      <span className="text-slate-600">Adelanto</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(adelantoNumero)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                      <span className="text-slate-600">Saldo</span>
                      <span className="font-semibold text-rose-600">{formatCurrency(saldoCalculado)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </Modal>
    </div>
  );
}
