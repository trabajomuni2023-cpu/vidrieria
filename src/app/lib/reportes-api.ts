export interface ReporteSerieItem {
  label: string;
  ingresos: number;
  gastos: number;
}

export interface ReporteEstadoTrabajo {
  estado: string;
  cantidad: number;
}

export interface ReporteClienteSaldo {
  cliente: string;
  saldo: number;
}

export interface ReporteProductoUsado {
  producto: string;
  cantidad: number;
}

export interface ReporteComparativoItem {
  actual: number;
  anterior: number;
  diferencia: number;
  porcentaje: number | null;
}

export interface ReporteRentabilidadTrabajo {
  id: string;
  numero: string;
  cliente: string;
  descripcion: string;
  total: number;
  costoMateriales: number;
  utilidadEstimada: number;
  margenPorcentaje: number;
  estado: string;
}

export interface ReporteClienteCompras {
  cliente: string;
  totalCompras: number;
  trabajos: number;
}

export interface ReportesResumen {
  totalIngresos: number;
  totalGastos: number;
  utilidadNeta: number;
  trabajosRealizados: number;
  ingresosVsGastos: ReporteSerieItem[];
  trabajosPorEstado: ReporteEstadoTrabajo[];
  clientesConSaldo: ReporteClienteSaldo[];
  productosUsados: ReporteProductoUsado[];
  comparativo: {
    ingresos: ReporteComparativoItem;
    gastos: ReporteComparativoItem;
    utilidad: ReporteComparativoItem;
    trabajos: ReporteComparativoItem;
  };
  trabajosRentables: ReporteRentabilidadTrabajo[];
  clientesConMasCompras: ReporteClienteCompras[];
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(data?.message || 'Ocurrió un error inesperado.');
}

export async function getReportes(periodo: string, desde?: string, hasta?: string) {
  const params = new URLSearchParams({
    periodo,
  });

  if (desde) {
    params.set('desde', desde);
  }

  if (hasta) {
    params.set('hasta', hasta);
  }

  const response = await fetch(`/api/reportes?${params.toString()}`);
  return parseResponse<ReportesResumen>(response);
}
