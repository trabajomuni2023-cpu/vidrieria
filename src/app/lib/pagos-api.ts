export interface Pago {
  id: string;
  fecha: string;
  cliente: string;
  clienteId: string;
  trabajo: string;
  trabajoId?: string | null;
  monto: number;
  metodo: string;
  tipo: string;
  observacion?: string | null;
  anulado: boolean;
  anuladoAt?: string | null;
  anuladoMotivo?: string | null;
}

export interface PagoPayload {
  trabajoId: string;
  monto: string;
  metodo: string;
  tipo: string;
  observacion?: string;
}

export interface AnularPagoPayload {
  motivo?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(data?.message || 'Ocurrió un error inesperado.');
}

export async function getPagos() {
  const response = await fetch('/api/pagos');
  return parseResponse<Pago[]>(response);
}

export async function createPago(payload: PagoPayload) {
  const response = await fetch('/api/pagos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<Pago>(response);
}

export async function anularPago(id: string, payload: AnularPagoPayload = {}) {
  const response = await fetch(`/api/pagos/${id}/anular`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<Pago>(response);
}
