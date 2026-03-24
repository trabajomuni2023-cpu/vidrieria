export interface Trabajo {
  id: string;
  fecha: string;
  cliente: string;
  clienteId: string;
  descripcion: string;
  total: number;
  adelanto: number;
  saldo: number;
  estado: string;
  boleta?: string | null;
  fechaEntrega?: string | null;
}

export interface TrabajoDetalleMaterial {
  id: string;
  producto: string;
  cantidad: number;
  unidad: string;
}

export interface TrabajoDetallePago {
  id: string;
  fecha: string;
  monto: number;
  tipo: string;
  metodo: string;
  anulado: boolean;
  anuladoAt?: string | null;
  anuladoMotivo?: string | null;
}

export interface TrabajoDetalle extends Trabajo {
  numero: string;
  telefono: string;
  direccion: string;
  tipoTrabajo: string;
  direccionInstalacion?: string | null;
  observaciones?: string | null;
  materiales: TrabajoDetalleMaterial[];
  pagosHistorial: TrabajoDetallePago[];
}

export interface TrabajoPayload {
  clienteId: string;
  descripcion: string;
  total: string;
  adelantoInicial?: string;
  fechaEntrega?: string;
  tipoTrabajo?: string;
  direccionInstalacion?: string;
  observaciones?: string;
  comprobanteNumero?: string;
  metodoPago?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(data?.message || 'Ocurrió un error inesperado.');
}

export async function getTrabajos() {
  const response = await fetch('/api/trabajos');
  return parseResponse<Trabajo[]>(response);
}

export async function getTrabajoDetalle(id: string) {
  const response = await fetch(`/api/trabajos/${id}`);
  return parseResponse<TrabajoDetalle>(response);
}

export async function createTrabajo(payload: TrabajoPayload) {
  const response = await fetch('/api/trabajos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<Trabajo>(response);
}

export async function updateTrabajo(id: string, payload: TrabajoPayload) {
  const response = await fetch(`/api/trabajos/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<Trabajo>(response);
}

export async function updateTrabajoEstado(id: string, estado: string) {
  const response = await fetch(`/api/trabajos/${id}/estado`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ estado }),
  });

  return parseResponse<Trabajo>(response);
}
