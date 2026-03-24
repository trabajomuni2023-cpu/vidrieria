import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, CreditCard, TrendingUp, Download, RotateCcw, ShieldX } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { HelpCallout } from '../components/ui/HelpCallout';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { anularPago, createPago, getPagos, type Pago } from '../lib/pagos-api';
import { getTrabajos, type Trabajo } from '../lib/trabajos-api';
import { exportRowsToExcel } from '../lib/export';

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Pagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pagoAAnular, setPagoAAnular] = useState<Pago | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [isAnnulling, setIsAnnulling] = useState(false);
  const [pagoData, setPagoData] = useState({
    trabajoId: '',
    monto: '',
    metodo: 'EFECTIVO',
    tipo: 'ADELANTO',
  });

  const loadData = async () => {
    try {
      const [pagosData, trabajosData] = await Promise.all([getPagos(), getTrabajos()]);
      setPagos(pagosData);
      setTrabajos(trabajosData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los pagos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredPagos = useMemo(
    () =>
      pagos.filter((pago) => {
        const matchSearch =
          pago.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pago.trabajo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchMetodo = filtroMetodo === 'todos' || pago.metodo === filtroMetodo;
        const matchTipo = filtroTipo === 'todos' || pago.tipo === filtroTipo;
        const pagoDate = new Date(pago.fecha);
        const matchDesde = !fechaDesde || pagoDate >= new Date(`${fechaDesde}T00:00:00`);
        const matchHasta = !fechaHasta || pagoDate <= new Date(`${fechaHasta}T23:59:59`);
        return matchSearch && matchMetodo && matchTipo && matchDesde && matchHasta;
      }),
    [pagos, searchTerm, filtroMetodo, filtroTipo, fechaDesde, fechaHasta],
  );

  const pagosActivosFiltrados = filteredPagos.filter((pago) => !pago.anulado);
  const totalRango = pagosActivosFiltrados.reduce((sum, pago) => sum + pago.monto, 0);
  const adelantos = pagosActivosFiltrados
    .filter((pago) => pago.tipo === 'ADELANTO')
    .reduce((sum, pago) => sum + pago.monto, 0);
  const finales = pagosActivosFiltrados
    .filter((pago) => pago.tipo === 'FINAL')
    .reduce((sum, pago) => sum + pago.monto, 0);

  const trabajoOptions = [
    { value: '', label: 'Seleccionar trabajo' },
    ...trabajos.map((trabajo) => ({
      value: trabajo.id,
      label: `${trabajo.cliente} - ${trabajo.descripcion}`,
    })),
  ];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const submit = async () => {
      setIsSaving(true);

      try {
        const pago = await createPago(pagoData);
        setPagos((current) => [pago, ...current]);
        setPagoData({ trabajoId: '', monto: '', metodo: 'EFECTIVO', tipo: 'ADELANTO' });
        setIsModalOpen(false);
        toast.success('Pago registrado correctamente');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo registrar el pago');
      } finally {
        setIsSaving(false);
      }
    };

    void submit();
  };

  function handleClearFilters() {
    setSearchTerm('');
    setFiltroMetodo('todos');
    setFiltroTipo('todos');
    setFechaDesde('');
    setFechaHasta('');
  }

  function handleExportExcel() {
    exportRowsToExcel(
      'pagos-filtrados',
      'Pagos',
      ['Fecha', 'Cliente', 'Trabajo', 'Monto', 'Método', 'Tipo', 'Estado', 'Motivo de anulación'],
      filteredPagos.map((pago) => [
        formatDate(pago.fecha),
        pago.cliente,
        pago.trabajo,
        pago.monto,
        formatEnumLabel(pago.metodo),
        formatEnumLabel(pago.tipo),
        pago.anulado ? 'Anulado' : 'Activo',
        pago.anuladoMotivo || '',
      ]),
    );
    toast.success('Pagos exportados en Excel.');
  }

  async function handleConfirmarAnulacion() {
    if (!pagoAAnular) {
      return;
    }

    setIsAnnulling(true);

    try {
      const pagoActualizado = await anularPago(pagoAAnular.id, {
        motivo: motivoAnulacion.trim() || undefined,
      });

      setPagos((current) =>
        current.map((pago) => (pago.id === pagoActualizado.id ? pagoActualizado : pago)),
      );
      setPagoAAnular(null);
      setMotivoAnulacion('');
      toast.success('Pago anulado correctamente.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo anular el pago.');
    } finally {
      setIsAnnulling(false);
    }
  }

  function handleCerrarAnulacion() {
    if (isAnnulling) {
      return;
    }

    setPagoAAnular(null);
    setMotivoAnulacion('');
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="mt-1 text-sm text-gray-600">Registro de pagos recibidos y anulaciones con historial.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={handleExportExcel} disabled={isLoading || filteredPagos.length === 0} className="w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Registrar Pago
          </Button>
        </div>
      </div>

      <HelpCallout
        title="Cómo corregir un error"
        description="Si registraste un pago en el trabajo equivocado, usa Anular pago. Así el historial queda claro y la caja se corrige sola."
        tone="warning"
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total cobrado</p><p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(totalRango)}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100"><TrendingUp className="h-6 w-6 text-green-600" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Adelantos</p><p className="mt-1 text-2xl font-bold text-[var(--brand-600)]">{formatCurrency(adelantos)}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--brand-100)]"><CreditCard className="h-6 w-6 text-[var(--brand-600)]" /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Pagos finales</p><p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(finales)}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100"><CreditCard className="h-6 w-6 text-emerald-600" /></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="relative w-full flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente o trabajo..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)]"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Select value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)} options={[['todos', 'Todos'], ['ADELANTO', 'Adelanto'], ['PARCIAL', 'Parcial'], ['FINAL', 'Final']].map(([value, label]) => ({ value, label }))} />
              <Input type="date" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} className="w-full" />
              <Input type="date" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} className="w-full" />
              <Button type="button" variant="outline" onClick={handleClearFilters} className="w-full xl:w-auto">
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                ['todos', 'Todos'],
                ['EFECTIVO', 'Efectivo'],
                ['TRANSFERENCIA', 'Transferencia'],
                ['TARJETA', 'Tarjeta'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFiltroMetodo(value)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    filtroMetodo === value
                      ? 'bg-[var(--brand-600)] text-[var(--brand-contrast)]'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">Cargando pagos...</div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 md:hidden">
                {filteredPagos.map((pago) => (
                  <div key={pago.id} className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{pago.cliente}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(pago.fecha)}</p>
                      </div>
                      <p className={`text-sm font-bold ${pago.anulado ? 'text-gray-500 line-through' : 'text-green-600'}`}>{formatCurrency(pago.monto)}</p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3 text-sm">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Trabajo asociado</p>
                        <p className="mt-1 text-gray-900">{pago.trabajo}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={pago.metodo === 'EFECTIVO' ? 'success' : 'info'}>{formatEnumLabel(pago.metodo)}</Badge>
                        <Badge variant="default">{formatEnumLabel(pago.tipo)}</Badge>
                        {pago.anulado ? <Badge variant="danger">Anulado</Badge> : <Badge variant="success">Activo</Badge>}
                      </div>
                      {pago.anuladoMotivo ? <p className="mt-3 text-xs text-rose-700">Motivo: {pago.anuladoMotivo}</p> : null}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={pago.anulado}
                      onClick={() => setPagoAAnular(pago)}
                      className="w-full"
                    >
                      <ShieldX className="h-4 w-4" />
                      {pago.anulado ? 'Pago anulado' : 'Anular pago'}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Trabajo asociado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Monto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Método</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPagos.map((pago) => (
                      <tr key={pago.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{formatDate(pago.fecha)}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{pago.cliente}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{pago.trabajo}</td>
                        <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-bold ${pago.anulado ? 'text-gray-500 line-through' : 'text-green-600'}`}>{formatCurrency(pago.monto)}</td>
                        <td className="whitespace-nowrap px-6 py-4"><Badge variant={pago.metodo === 'EFECTIVO' ? 'success' : 'info'}>{formatEnumLabel(pago.metodo)}</Badge></td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{formatEnumLabel(pago.tipo)}</td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {pago.anulado ? <Badge variant="danger">Anulado</Badge> : <Badge variant="success">Activo</Badge>}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pago.anulado}
                            onClick={() => setPagoAAnular(pago)}
                          >
                            <ShieldX className="h-4 w-4" />
                            {pago.anulado ? 'Anulado' : 'Anular'}
                          </Button>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Pago" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Registra el cobro usando el trabajo correcto para que el saldo del cliente y la caja se actualicen solos.
          </div>
          <Select label="Trabajo asociado" helperText="Elige el trabajo al que corresponde este pago." value={pagoData.trabajoId} onChange={(event) => setPagoData({ ...pagoData, trabajoId: event.target.value })} options={trabajoOptions} required />
          <Input label="Monto" helperText="Escribe exactamente lo que el cliente pagó hoy." type="number" step="0.01" value={pagoData.monto} onChange={(event) => setPagoData({ ...pagoData, monto: event.target.value })} placeholder="0.00" required />
          <Select label="Método de pago" helperText="Sirve para diferenciar efectivo, transferencia, Yape u otros medios." value={pagoData.metodo} onChange={(event) => setPagoData({ ...pagoData, metodo: event.target.value })} options={[{ value: 'EFECTIVO', label: 'Efectivo' }, { value: 'TRANSFERENCIA', label: 'Transferencia' }, { value: 'TARJETA', label: 'Tarjeta' }, { value: 'YAPE', label: 'Yape' }, { value: 'PLIN', label: 'Plin' }]} />
          <Select label="Tipo de pago" helperText="Usa adelanto si recién empieza, parcial si falta cobrar y final cuando ya se canceló todo." value={pagoData.tipo} onChange={(event) => setPagoData({ ...pagoData, tipo: event.target.value })} options={[{ value: 'ADELANTO', label: 'Adelanto' }, { value: 'PARCIAL', label: 'Parcial' }, { value: 'FINAL', label: 'Final' }]} />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(pagoAAnular)} onClose={handleCerrarAnulacion} title="Anular pago" size="md">
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Esta acción no elimina el pago. Lo marcará como anulado, registrará la reversa en caja y recalculará el saldo del trabajo.
          </div>

          {pagoAAnular ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">{pagoAAnular.cliente}</p>
              <p className="mt-1 text-slate-600">{pagoAAnular.trabajo}</p>
              <p className="mt-3 text-slate-900">
                Monto: <span className="font-semibold">{formatCurrency(pagoAAnular.monto)}</span>
              </p>
            </div>
          ) : null}

          <Textarea
            label="Motivo de anulación (opcional)"
            helperText="Útil para dejar claro por qué se revirtió este cobro."
            rows={3}
            value={motivoAnulacion}
            onChange={(event) => setMotivoAnulacion(event.target.value)}
            placeholder="Ej: se registró en el trabajo equivocado"
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleCerrarAnulacion} className="flex-1" disabled={isAnnulling}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmarAnulacion} className="flex-1" disabled={isAnnulling}>
              <ShieldX className="h-4 w-4" />
              {isAnnulling ? 'Anulando...' : 'Confirmar anulación'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
