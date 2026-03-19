import cors from 'cors';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const app = express();
const port = Number(process.env.API_PORT || 3001);

app.use(cors());
app.use(express.json());

const AUTH_SECRET = process.env.AUTH_SECRET || 'vidrieria-dev-secret';
const AUTH_TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

function hashPassword(password) {
  return crypto.scryptSync(password, 'vidrieria-salt', 64).toString('hex');
}

function createAuthToken(payload) {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyAuthToken(token) {
  if (!token) {
    return null;
  }

  const [encoded, signature] = String(token).split('.');

  if (!encoded || !signature) {
    return null;
  }

  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');

  if (signature !== expected) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));

  if (!payload.exp || Date.now() > payload.exp) {
    return null;
  }

  return payload;
}

function getBearerToken(req) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
}

function sanitizeUsuario(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono,
    rol: usuario.rol,
    activo: usuario.activo,
  };
}

async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  const payload = verifyAuthToken(token);

  if (!payload?.sub) {
    return null;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
  });

  if (!usuario || !usuario.activo) {
    return null;
  }

  return usuario;
}

async function ensureDefaultAdmin() {
  const totalUsuarios = await prisma.usuario.count();

  if (totalUsuarios > 0) {
    return;
  }

  await prisma.usuario.create({
    data: {
      nombre: 'Administrador',
      email: 'admin@vidrieria.com',
      telefono: '999999999',
      passwordHash: hashPassword('admin123'),
      rol: 'ADMIN',
    },
  });
}

async function ensureConfiguracionNegocio() {
  const existing = await prisma.configuracionNegocio.findFirst();

  if (existing) {
    return existing;
  }

  return prisma.configuracionNegocio.create({
    data: {
      nombreComercial: 'Vidrieria Cristal',
      moneda: 'PEN',
      stockMinimoPorDefecto: 5,
    },
  });
}

function mapCliente(cliente) {
  const saldoPendiente = cliente.trabajos.reduce(
    (sum, trabajo) => sum + Number(trabajo.saldo ?? 0),
    0,
  );

  return {
    id: cliente.id,
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    direccion: cliente.direccion,
    documento: cliente.documento,
    observacion: cliente.observacion,
    saldoPendiente,
    cantidadTrabajos: cliente._count.trabajos,
    createdAt: cliente.createdAt,
    updatedAt: cliente.updatedAt,
  };
}

async function fetchClientes() {
  const clientes = await prisma.cliente.findMany({
    include: {
      trabajos: {
        select: {
          saldo: true,
        },
      },
      _count: {
        select: {
          trabajos: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return clientes.map(mapCliente);
}

function mapProducto(producto) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    categoria: producto.categoria?.nombre || 'Sin categoría',
    unidad: producto.unidad,
    stock: Number(producto.stockActual),
    stockMinimo: Number(producto.stockMinimo),
    costo: Number(producto.costoUnitario),
    proveedor: producto.proveedor,
    observacion: producto.observacion,
  };
}

function mapMovimientoInventario(movimiento) {
  return {
    id: movimiento.id,
    fecha: movimiento.fecha,
    tipo: movimiento.tipo,
    motivo: movimiento.motivo,
    cantidad: Number(movimiento.cantidad),
    referencia: movimiento.referencia,
    costoUnitario: movimiento.costoUnitario == null ? null : Number(movimiento.costoUnitario),
    proveedor: movimiento.proveedor,
    observacion: movimiento.observacion,
  };
}

async function ensureCategoriaInventario(nombre) {
  if (!nombre) {
    return null;
  }

  const normalizedName = String(nombre).trim();

  if (!normalizedName) {
    return null;
  }

  const existing = await prisma.categoriaInventario.findFirst({
    where: {
      nombre: {
        equals: normalizedName,
        mode: 'insensitive',
      },
    },
  });

  if (existing) {
    return existing.id;
  }

  const categoria = await prisma.categoriaInventario.create({
    data: {
      nombre: normalizedName,
    },
  });

  return categoria.id;
}

async function fetchProductos() {
  const productos = await prisma.producto.findMany({
    include: {
      categoria: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return productos.map(mapProducto);
}

function mapTrabajo(trabajo) {
  const totalPagado = trabajo.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
  const saldo = Number(trabajo.total) - totalPagado;

  return {
    id: trabajo.id,
    fecha: trabajo.fechaRegistro,
    cliente: trabajo.cliente.nombre,
    clienteId: trabajo.cliente.id,
    descripcion: trabajo.descripcion,
    total: Number(trabajo.total),
    adelanto: totalPagado,
    saldo,
    estado: trabajo.estado,
    boleta: trabajo.comprobanteNumero,
    fechaEntrega: trabajo.fechaEntrega,
  };
}

function mapTrabajoDetalle(trabajo) {
  const totalPagado = trabajo.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
  const saldo = Number(trabajo.total) - totalPagado;

  return {
    id: trabajo.id,
    numero: trabajo.numero,
    fecha: trabajo.fechaRegistro,
    cliente: trabajo.cliente.nombre,
    clienteId: trabajo.cliente.id,
    telefono: trabajo.cliente.telefono,
    direccion: trabajo.cliente.direccion,
    tipoTrabajo: trabajo.tipoTrabajo?.nombre || 'Sin tipo',
    descripcion: trabajo.descripcion,
    total: Number(trabajo.total),
    adelanto: totalPagado,
    saldo,
    estado: trabajo.estado,
    boleta: trabajo.comprobanteNumero,
    fechaEntrega: trabajo.fechaEntrega,
    direccionInstalacion: trabajo.direccionInstalacion,
    observaciones: trabajo.observaciones,
    materiales: trabajo.materiales.map((material) => ({
      id: material.id,
      producto: material.producto.nombre,
      cantidad: Number(material.cantidad),
      unidad: material.unidad,
    })),
    pagosHistorial: trabajo.pagos.map((pago) => ({
      id: pago.id,
      fecha: pago.fecha,
      monto: Number(pago.monto),
      tipo: pago.tipo,
      metodo: pago.metodo,
    })),
  };
}

function mapPago(pago) {
  return {
    id: pago.id,
    fecha: pago.fecha,
    cliente: pago.cliente.nombre,
    clienteId: pago.cliente.id,
    trabajo: pago.trabajo?.descripcion || 'Sin trabajo asociado',
    trabajoId: pago.trabajo?.id || null,
    monto: Number(pago.monto),
    metodo: pago.metodo,
    tipo: pago.tipo,
    observacion: pago.observacion,
  };
}

function mapGasto(gasto) {
  return {
    id: gasto.id,
    fecha: gasto.fecha,
    descripcion: gasto.descripcion,
    categoria: gasto.categoria?.nombre || 'Sin categoria',
    monto: Number(gasto.monto),
    referencia: gasto.referencia,
    observacion: gasto.observacion,
  };
}

function mapMovimientoCaja(movimiento) {
  return {
    id: movimiento.id,
    fecha: movimiento.fecha,
    tipo: movimiento.tipo,
    descripcion: movimiento.descripcion,
    monto: Number(movimiento.monto),
    referencia: movimiento.referencia,
    trabajoId: movimiento.trabajoId,
    pagoId: movimiento.pagoId,
    gastoId: movimiento.gastoId,
  };
}

function mapCotizacion(cotizacion) {
  return {
    id: cotizacion.id,
    numero: cotizacion.numero,
    fecha: cotizacion.fechaEmision,
    cliente: cotizacion.cliente.nombre,
    clienteId: cotizacion.cliente.id,
    descripcion: cotizacion.descripcion,
    total: Number(cotizacion.total),
    vigencia: cotizacion.fechaVigencia,
    estado: cotizacion.estado,
    trabajoConvertido: cotizacion.trabajoConvertido,
    trabajoId: cotizacion.trabajo?.id || null,
  };
}

function mapCotizacionDetalle(cotizacion) {
  return {
    id: cotizacion.id,
    numero: cotizacion.numero,
    fecha: cotizacion.fechaEmision,
    vigencia: cotizacion.fechaVigencia,
    estado: cotizacion.estado,
    descripcion: cotizacion.descripcion,
    manoObra: Number(cotizacion.manoObra),
    subtotal: Number(cotizacion.subtotal),
    descuento: Number(cotizacion.descuento),
    total: Number(cotizacion.total),
    observaciones: cotizacion.observaciones,
    trabajoConvertido: cotizacion.trabajoConvertido,
    cliente: {
      id: cotizacion.cliente.id,
      nombre: cotizacion.cliente.nombre,
      telefono: cotizacion.cliente.telefono,
      direccion: cotizacion.cliente.direccion,
    },
    items: cotizacion.items.map((item) => ({
      id: item.id,
      descripcion: item.descripcion,
      cantidad: Number(item.cantidad),
      unidad: item.unidad,
      precioUnitario: Number(item.precioUnitario),
      total: Number(item.total),
    })),
    trabajoId: cotizacion.trabajo?.id || null,
  };
}

function formatEnumLabel(value) {
  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getStartOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getStartOfWeek(date = new Date()) {
  const start = getStartOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  return start;
}

function getStartOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getStartOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1);
}

function getPeriodStart(periodo) {
  const now = new Date();

  switch (periodo) {
    case 'dia':
      return getStartOfDay(now);
    case 'semana':
      return getStartOfWeek(now);
    case 'anio':
      return getStartOfYear(now);
    case 'mes':
    default:
      return getStartOfMonth(now);
  }
}

function getDateRange(periodo, desde, hasta) {
  if (periodo === 'personalizado') {
    const start = desde ? new Date(`${desde}T00:00:00`) : null;
    const end = hasta ? new Date(`${hasta}T23:59:59`) : null;
    return { start, end };
  }

  return {
    start: getPeriodStart(periodo),
    end: null,
  };
}

function createSeriesBuckets(periodo) {
  const now = new Date();

  if (periodo === 'dia') {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));

      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'short',
        }),
        ingresos: 0,
        gastos: 0,
      };
    });
  }

  if (periodo === 'semana') {
    return Array.from({ length: 8 }, (_, index) => {
      const base = getStartOfWeek(now);
      base.setDate(base.getDate() - (7 * (7 - index)));

      return {
        key: base.toISOString().slice(0, 10),
        label: `Sem ${index + 1}`,
        ingresos: 0,
        gastos: 0,
      };
    });
  }

  if (periodo === 'anio') {
    return Array.from({ length: 5 }, (_, index) => {
      const year = now.getFullYear() - (4 - index);

      return {
        key: String(year),
        label: String(year),
        ingresos: 0,
        gastos: 0,
      };
    });
  }

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('es-PE', {
        month: 'short',
      }),
      ingresos: 0,
      gastos: 0,
    };
  });
}

function createCustomSeriesBuckets(startDate, endDate) {
  if (!startDate || !endDate) {
    return [];
  }

  const buckets = [];
  const current = getStartOfDay(startDate);
  const last = getStartOfDay(endDate);

  while (current <= last) {
    buckets.push({
      key: current.toISOString().slice(0, 10),
      label: current.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
      }),
      ingresos: 0,
      gastos: 0,
    });

    current.setDate(current.getDate() + 1);
  }

  return buckets;
}

function getBucketKey(dateValue, periodo) {
  const date = new Date(dateValue);

  if (periodo === 'dia') {
    return date.toISOString().slice(0, 10);
  }

  if (periodo === 'semana') {
    return getStartOfWeek(date).toISOString().slice(0, 10);
  }

  if (periodo === 'anio') {
    return String(date.getFullYear());
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function createMonthlyBuckets(months = 3) {
  const now = new Date();

  return Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      mes: date.toLocaleDateString('es-PE', { month: 'short' }),
      ingresos: 0,
      gastos: 0,
    };
  });
}

async function fetchTrabajos() {
  const trabajos = await prisma.trabajo.findMany({
    include: {
      cliente: {
        select: {
          id: true,
          nombre: true,
        },
      },
      pagos: {
        select: {
          monto: true,
        },
      },
    },
    orderBy: {
      fechaRegistro: 'desc',
    },
  });

  return trabajos.map(mapTrabajo);
}

async function fetchCotizaciones() {
  const cotizaciones = await prisma.cotizacion.findMany({
    include: {
      cliente: {
        select: {
          id: true,
          nombre: true,
        },
      },
      trabajo: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      fechaEmision: 'desc',
    },
  });

  return cotizaciones.map(mapCotizacion);
}

async function syncTrabajoFinancials(tx, trabajoId) {
  const trabajo = await tx.trabajo.findUnique({
    where: { id: trabajoId },
    include: {
      pagos: {
        select: {
          monto: true,
        },
      },
    },
  });

  if (!trabajo) {
    throw new Error('Trabajo no encontrado.');
  }

  const totalPagado = trabajo.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
  const saldo = Number(trabajo.total) - totalPagado;

  await tx.trabajo.update({
    where: { id: trabajoId },
    data: {
      adelanto: totalPagado,
      saldo,
    },
  });
}

async function ensureCategoriaGasto(nombre) {
  if (!nombre) {
    return null;
  }

  const normalizedName = String(nombre).trim();

  if (!normalizedName) {
    return null;
  }

  const existing = await prisma.categoriaGasto.findFirst({
    where: {
      nombre: {
        equals: normalizedName,
        mode: 'insensitive',
      },
    },
  });

  if (existing) {
    return existing.id;
  }

  const categoria = await prisma.categoriaGasto.create({
    data: {
      nombre: normalizedName,
    },
  });

  return categoria.id;
}

async function fetchGastos() {
  const gastos = await prisma.gasto.findMany({
    include: {
      categoria: true,
    },
    orderBy: {
      fecha: 'desc',
    },
  });

  return gastos.map(mapGasto);
}

async function ensureTipoTrabajo(nombre) {
  if (!nombre) {
    return null;
  }

  const normalizedName = String(nombre).trim();

  if (!normalizedName) {
    return null;
  }

  const existing = await prisma.tipoTrabajo.findFirst({
    where: {
      nombre: {
        equals: normalizedName,
        mode: 'insensitive',
      },
    },
  });

  if (existing) {
    return existing.id;
  }

  const tipoTrabajo = await prisma.tipoTrabajo.create({
    data: {
      nombre: normalizedName,
    },
  });

  return tipoTrabajo.id;
}

async function generateTrabajoNumero(tx) {
  const year = new Date().getFullYear();
  const total = await tx.trabajo.count({
    where: {
      createdAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  });

  return `TRA-${year}-${String(total + 1).padStart(4, '0')}`;
}

async function generateCotizacionNumero(tx) {
  const year = new Date().getFullYear();
  const total = await tx.cotizacion.count({
    where: {
      createdAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  });

  return `COT-${year}-${String(total + 1).padStart(4, '0')}`;
}

function mapClienteDetalle(cliente) {
  const saldoPendiente = cliente.trabajos.reduce(
    (sum, trabajo) => sum + Number(trabajo.saldo ?? 0),
    0,
  );

  return {
    id: cliente.id,
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    direccion: cliente.direccion,
    documento: cliente.documento,
    observacion: cliente.observacion,
    saldoPendiente,
    cantidadTrabajos: cliente._count.trabajos,
    trabajos: cliente.trabajos.map((trabajo) => ({
      id: trabajo.id,
      fecha: trabajo.fechaRegistro,
      descripcion: trabajo.descripcion,
      total: Number(trabajo.total),
      saldo: Number(trabajo.saldo),
      estado: trabajo.estado,
    })),
    pagos: cliente.pagos.map((pago) => ({
      id: pago.id,
      fecha: pago.fecha,
      trabajo: pago.trabajo?.descripcion ?? 'Sin trabajo asociado',
      monto: Number(pago.monto),
      tipo: pago.tipo,
      metodo: pago.metodo,
    })),
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    await ensureDefaultAdmin();

    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios.' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        email: String(email).trim().toLowerCase(),
      },
    });

    if (!usuario || usuario.passwordHash !== hashPassword(String(password))) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const safeUser = sanitizeUsuario(usuario);
    const token = createAuthToken({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      exp: Date.now() + AUTH_TOKEN_TTL_MS,
    });

    res.json({
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: 'No se pudo iniciar sesión.' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = getBearerToken(req);
    const payload = verifyAuthToken(token);

    if (!payload?.sub) {
      return res.status(401).json({ message: 'Sesión inválida o vencida.' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ message: 'Usuario no autorizado.' });
    }

    res.json({
      user: sanitizeUsuario(usuario),
    });
  } catch (error) {
    console.error('Error al validar sesión:', error);
    res.status(500).json({ message: 'No se pudo validar la sesión.' });
  }
});

app.patch('/api/auth/profile', async (req, res) => {
  try {
    const usuario = await getAuthenticatedUser(req);

    if (!usuario) {
      return res.status(401).json({ message: 'Sesion invalida o vencida.' });
    }

    const { nombre, email, telefono } = req.body ?? {};

    if (!nombre || !email) {
      return res.status(400).json({ message: 'Nombre y email son obligatorios.' });
    }

    const actualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        nombre: String(nombre).trim(),
        email: String(email).trim().toLowerCase(),
        telefono: telefono ? String(telefono).trim() : null,
      },
    });

    res.json({ user: sanitizeUsuario(actualizado) });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'No se pudo actualizar el perfil.' });
  }
});

app.patch('/api/auth/password', async (req, res) => {
  try {
    const usuario = await getAuthenticatedUser(req);

    if (!usuario) {
      return res.status(401).json({ message: 'Sesion invalida o vencida.' });
    }

    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'La contraseña actual y la nueva son obligatorias.' });
    }

    if (usuario.passwordHash !== hashPassword(String(currentPassword))) {
      return res.status(400).json({ message: 'La contraseña actual no es correcta.' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        passwordHash: hashPassword(String(newPassword)),
      },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'No se pudo cambiar la contraseña.' });
  }
});

app.get('/api/usuarios', async (req, res) => {
  try {
    const usuario = await getAuthenticatedUser(req);

    if (!usuario) {
      return res.status(401).json({ message: 'Sesion invalida o vencida.' });
    }

    if (usuario.rol !== 'ADMIN') {
      return res.status(403).json({ message: 'No tienes permisos para ver usuarios.' });
    }

    const usuarios = await prisma.usuario.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(usuarios.map(sanitizeUsuario));
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ message: 'No se pudieron cargar los usuarios.' });
  }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const usuario = await getAuthenticatedUser(req);

    if (!usuario) {
      return res.status(401).json({ message: 'Sesion invalida o vencida.' });
    }

    if (usuario.rol !== 'ADMIN') {
      return res.status(403).json({ message: 'No tienes permisos para crear usuarios.' });
    }

    const { nombre, email, telefono, password, rol } = req.body ?? {};

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios.' });
    }

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: String(nombre).trim(),
        email: String(email).trim().toLowerCase(),
        telefono: telefono ? String(telefono).trim() : null,
        passwordHash: hashPassword(String(password)),
        rol: rol || 'OPERADOR',
      },
    });

    res.status(201).json(sanitizeUsuario(nuevoUsuario));
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'No se pudo crear el usuario.' });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const authUser = await getAuthenticatedUser(req);

    if (!authUser) {
      return res.status(401).json({ message: 'Sesion invalida o vencida.' });
    }

    if (authUser.rol !== 'ADMIN') {
      return res.status(403).json({ message: 'No tienes permisos para editar usuarios.' });
    }

    const { id } = req.params;
    const { nombre, email, telefono, rol, activo } = req.body ?? {};

    if (!nombre || !email) {
      return res.status(400).json({ message: 'Nombre y email son obligatorios.' });
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        nombre: String(nombre).trim(),
        email: String(email).trim().toLowerCase(),
        telefono: telefono ? String(telefono).trim() : null,
        rol: rol || 'OPERADOR',
        activo: Boolean(activo),
      },
    });

    res.json(sanitizeUsuario(usuario));
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'No se pudo actualizar el usuario.' });
  }
});

app.get('/api/configuracion', async (req, res) => {
  try {
    const usuario = await getAuthenticatedUser(req);

    if (!usuario) {
      return res.status(401).json({ message: 'Sesion invalida o vencida.' });
    }

    const configuracion = await ensureConfiguracionNegocio();

    res.json({
      negocio: configuracion,
      user: sanitizeUsuario(usuario),
    });
  } catch (error) {
    console.error('Error al cargar configuracion:', error);
    res.status(500).json({ message: 'No se pudo cargar la configuracion.' });
  }
});

app.put('/api/configuracion', async (req, res) => {
  try {
    const usuario = await getAuthenticatedUser(req);

    if (!usuario) {
      return res.status(401).json({ message: 'Sesion invalida o vencida.' });
    }

    if (usuario.rol !== 'ADMIN') {
      return res.status(403).json({ message: 'No tienes permisos para editar la configuracion.' });
    }

    const current = await ensureConfiguracionNegocio();
    const { nombreComercial, moneda, stockMinimoPorDefecto } = req.body ?? {};

    if (!nombreComercial) {
      return res.status(400).json({ message: 'El nombre comercial es obligatorio.' });
    }

    const configuracion = await prisma.configuracionNegocio.update({
      where: { id: current.id },
      data: {
        nombreComercial: String(nombreComercial).trim(),
        moneda: moneda || 'PEN',
        stockMinimoPorDefecto: Number(stockMinimoPorDefecto || 5),
      },
    });

    res.json({ negocio: configuracion });
  } catch (error) {
    console.error('Error al actualizar configuracion:', error);
    res.status(500).json({ message: 'No se pudo actualizar la configuracion.' });
  }
});

app.get('/api/clientes', async (_req, res) => {
  try {
    const clientes = await fetchClientes();
    res.json(clientes);
  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({ message: 'No se pudieron cargar los clientes.' });
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        trabajos: {
          orderBy: {
            fechaRegistro: 'desc',
          },
          select: {
            id: true,
            fechaRegistro: true,
            descripcion: true,
            total: true,
            saldo: true,
            estado: true,
          },
        },
        pagos: {
          orderBy: {
            fecha: 'desc',
          },
          select: {
            id: true,
            fecha: true,
            monto: true,
            tipo: true,
            metodo: true,
            trabajo: {
              select: {
                descripcion: true,
              },
            },
          },
        },
        _count: {
          select: {
            trabajos: true,
          },
        },
      },
    });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    res.json(mapClienteDetalle(cliente));
  } catch (error) {
    console.error('Error al obtener detalle del cliente:', error);
    res.status(500).json({ message: 'No se pudo cargar el detalle del cliente.' });
  }
});

app.get('/api/dashboard', async (_req, res) => {
  try {
    const startDay = getStartOfDay();
    const startMonth = getStartOfMonth();
    const monthlyBuckets = createMonthlyBuckets(3);
    const monthlyMap = new Map(monthlyBuckets.map((item) => [item.key, item]));

    const [trabajos, pagos, movimientos, productos] = await Promise.all([
      prisma.trabajo.findMany({
        include: {
          cliente: {
            select: {
              nombre: true,
            },
          },
          pagos: {
            select: {
              monto: true,
            },
          },
        },
        orderBy: {
          fechaRegistro: 'desc',
        },
      }),
      prisma.pago.findMany({
        include: {
          cliente: {
            select: {
              nombre: true,
            },
          },
        },
        orderBy: {
          fecha: 'desc',
        },
        take: 5,
      }),
      prisma.movimientoCaja.findMany({
        orderBy: {
          fecha: 'desc',
        },
      }),
      prisma.producto.findMany({
        orderBy: {
          stockActual: 'asc',
        },
        take: 10,
      }),
    ]);

    let ingresosDia = 0;
    let gastosDia = 0;
    let saldoCaja = 0;

    for (const movimiento of movimientos) {
      const amount = Number(movimiento.monto);
      const bucket = monthlyMap.get(getBucketKey(movimiento.fecha, 'mes'));

      if (movimiento.tipo === 'INGRESO') {
        saldoCaja += amount;
        if (new Date(movimiento.fecha) >= startDay) {
          ingresosDia += amount;
        }
        if (bucket) {
          bucket.ingresos += amount;
        }
      } else {
        saldoCaja -= amount;
        if (new Date(movimiento.fecha) >= startDay) {
          gastosDia += amount;
        }
        if (bucket) {
          bucket.gastos += amount;
        }
      }
    }

    const trabajosHoy = trabajos.filter((trabajo) => new Date(trabajo.fechaRegistro) >= startDay).length;
    const trabajosPendientes = trabajos.filter((trabajo) => trabajo.estado === 'PENDIENTE').length;
    const trabajosTerminadosMes = trabajos.filter(
      (trabajo) => trabajo.estado === 'TERMINADO' && new Date(trabajo.updatedAt) >= startMonth,
    ).length;
    const trabajosCanceladosMes = trabajos.filter(
      (trabajo) => trabajo.estado === 'CANCELADO' && new Date(trabajo.updatedAt) >= startMonth,
    ).length;

    const recentTrabajos = trabajos.slice(0, 5).map((trabajo) => ({
      id: trabajo.id,
      fecha: trabajo.fechaRegistro,
      cliente: trabajo.cliente.nombre,
      descripcion: trabajo.descripcion,
      total: Number(trabajo.total),
      estado: trabajo.estado,
    }));

    const recentPagos = pagos.map((pago) => ({
      id: pago.id,
      fecha: pago.fecha,
      cliente: pago.cliente.nombre,
      monto: Number(pago.monto),
      tipo: formatEnumLabel(pago.tipo),
      metodo: formatEnumLabel(pago.metodo),
    }));

    const stockBajo = productos
      .filter((producto) => Number(producto.stockActual) <= Number(producto.stockMinimo))
      .slice(0, 5)
      .map((producto) => ({
        id: producto.id,
        producto: producto.nombre,
        stock: Number(producto.stockActual),
        minimo: Number(producto.stockMinimo),
      }));

    const alertas = [];

    if (stockBajo.length > 0) {
      alertas.push({ tipo: 'warning', mensaje: `${stockBajo.length} productos con stock bajo` });
    }

    const trabajosPorVencer = trabajos.filter((trabajo) => {
      if (!trabajo.fechaEntrega) {
        return false;
      }

      const entrega = new Date(trabajo.fechaEntrega);
      const now = new Date();
      const diff = entrega.getTime() - now.getTime();
      const days = diff / (1000 * 60 * 60 * 24);

      return days >= 0 && days <= 7 && trabajo.estado !== 'ENTREGADO' && trabajo.estado !== 'CANCELADO';
    }).length;

    if (trabajosPorVencer > 0) {
      alertas.push({ tipo: 'info', mensaje: `${trabajosPorVencer} trabajos por vencer esta semana` });
    }

    const pagosHoy = recentPagos.filter((pago) => new Date(pago.fecha) >= startDay).length;
    if (pagosHoy > 0) {
      alertas.push({ tipo: 'success', mensaje: `${pagosHoy} pagos registrados hoy` });
    }

    res.json({
      kpis: {
        trabajosHoy,
        trabajosPendientes,
        trabajosTerminadosMes,
        trabajosCanceladosMes,
        ingresosDia,
        gastosDia,
        saldoCaja,
        stockBajo: stockBajo.length,
      },
      chartData: monthlyBuckets.map(({ key, ...item }) => item),
      recentTrabajos,
      recentPagos,
      stockBajo,
      alertas,
    });
  } catch (error) {
    console.error('Error al cargar dashboard:', error);
    res.status(500).json({ message: 'No se pudo cargar el dashboard.' });
  }
});

app.get('/api/productos', async (_req, res) => {
  try {
    const productos = await fetchProductos();
    res.json(productos);
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({ message: 'No se pudieron cargar los productos.' });
  }
});

app.get('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        movimientos: {
          orderBy: {
            fecha: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    res.json({
      ...mapProducto(producto),
      movimientos: producto.movimientos.map(mapMovimientoInventario),
    });
  } catch (error) {
    console.error('Error al obtener detalle del producto:', error);
    res.status(500).json({ message: 'No se pudo cargar el detalle del producto.' });
  }
});

app.get('/api/cotizaciones', async (_req, res) => {
  try {
    const cotizaciones = await fetchCotizaciones();
    res.json(cotizaciones);
  } catch (error) {
    console.error('Error al listar cotizaciones:', error);
    res.status(500).json({ message: 'No se pudieron cargar las cotizaciones.' });
  }
});

app.post('/api/cotizaciones', async (req, res) => {
  try {
    const {
      clienteId,
      fechaVigencia,
      descripcion,
      manoObra,
      descuento,
      observaciones,
      items,
    } = req.body ?? {};

    if (!clienteId || !fechaVigencia || !descripcion || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cliente, vigencia, descripcion e items son obligatorios.' });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true },
    });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    const parsedItems = items
      .map((item, index) => {
        const cantidad = Number(item.cantidad || 0);
        const precioUnitario = Number(item.precioUnitario || 0);

        return {
          descripcion: String(item.descripcion || '').trim(),
          cantidad,
          unidad: String(item.unidad || '').trim(),
          precioUnitario,
          total: cantidad * precioUnitario,
          orden: index,
        };
      })
      .filter((item) => item.descripcion && item.unidad && item.cantidad > 0 && item.precioUnitario >= 0);

    if (parsedItems.length === 0) {
      return res.status(400).json({ message: 'Debes registrar al menos un item valido.' });
    }

    const manoObraNumero = Number(manoObra || 0);
    const descuentoNumero = Number(descuento || 0);
    const subtotal = parsedItems.reduce((sum, item) => sum + item.total, 0) + manoObraNumero;
    const total = Math.max(subtotal - descuentoNumero, 0);

    const cotizacion = await prisma.$transaction(async (tx) => {
      const numero = await generateCotizacionNumero(tx);

      return tx.cotizacion.create({
        data: {
          numero,
          clienteId,
          fechaVigencia: new Date(fechaVigencia),
          descripcion: String(descripcion).trim(),
          manoObra: manoObraNumero,
          subtotal,
          descuento: descuentoNumero,
          total,
          observaciones: observaciones ? String(observaciones).trim() : null,
          items: {
            create: parsedItems,
          },
        },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });
    });

    res.status(201).json(mapCotizacion(cotizacion));
  } catch (error) {
    console.error('Error al crear cotizacion:', error);
    res.status(500).json({ message: 'No se pudo crear la cotizacion.' });
  }
});

app.put('/api/cotizaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      clienteId,
      fechaVigencia,
      descripcion,
      manoObra,
      descuento,
      observaciones,
      items,
    } = req.body ?? {};

    if (!clienteId || !fechaVigencia || !descripcion || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cliente, vigencia, descripcion e items son obligatorios.' });
    }

    const cotizacionExistente = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        trabajo: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!cotizacionExistente) {
      return res.status(404).json({ message: 'Cotizacion no encontrada.' });
    }

    if (cotizacionExistente.trabajoConvertido || cotizacionExistente.trabajo) {
      return res.status(409).json({ message: 'No se puede editar una cotizacion ya convertida en trabajo.' });
    }

    if (cotizacionExistente.estado === 'ANULADA') {
      return res.status(409).json({ message: 'No se puede editar una cotizacion anulada.' });
    }

    const parsedItems = items
      .map((item, index) => {
        const cantidad = Number(item.cantidad || 0);
        const precioUnitario = Number(item.precioUnitario || 0);

        return {
          descripcion: String(item.descripcion || '').trim(),
          cantidad,
          unidad: String(item.unidad || '').trim(),
          precioUnitario,
          total: cantidad * precioUnitario,
          orden: index,
        };
      })
      .filter((item) => item.descripcion && item.unidad && item.cantidad > 0 && item.precioUnitario >= 0);

    if (parsedItems.length === 0) {
      return res.status(400).json({ message: 'Debes registrar al menos un item valido.' });
    }

    const manoObraNumero = Number(manoObra || 0);
    const descuentoNumero = Number(descuento || 0);
    const subtotal = parsedItems.reduce((sum, item) => sum + item.total, 0) + manoObraNumero;
    const total = Math.max(subtotal - descuentoNumero, 0);

    const cotizacion = await prisma.$transaction(async (tx) => {
      await tx.cotizacionItem.deleteMany({
        where: { cotizacionId: id },
      });

      return tx.cotizacion.update({
        where: { id },
        data: {
          clienteId,
          fechaVigencia: new Date(fechaVigencia),
          descripcion: String(descripcion).trim(),
          manoObra: manoObraNumero,
          subtotal,
          descuento: descuentoNumero,
          total,
          observaciones: observaciones ? String(observaciones).trim() : null,
          items: {
            create: parsedItems,
          },
        },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });
    });

    res.json(mapCotizacion(cotizacion));
  } catch (error) {
    console.error('Error al actualizar cotizacion:', error);
    res.status(500).json({ message: 'No se pudo actualizar la cotizacion.' });
  }
});

app.get('/api/cotizaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
            direccion: true,
          },
        },
        items: {
          orderBy: {
            orden: 'asc',
          },
        },
        trabajo: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return res.status(404).json({ message: 'Cotizacion no encontrada.' });
    }

    res.json(mapCotizacionDetalle(cotizacion));
  } catch (error) {
    console.error('Error al obtener detalle de cotizacion:', error);
    res.status(500).json({ message: 'No se pudo cargar la cotizacion.' });
  }
});

app.patch('/api/cotizaciones/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body ?? {};
    const estadosValidos = new Set(['PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA', 'ANULADA']);

    if (!estado || !estadosValidos.has(estado)) {
      return res.status(400).json({ message: 'El estado es obligatorio.' });
    }

    const cotizacionExistente = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        trabajo: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!cotizacionExistente) {
      return res.status(404).json({ message: 'Cotizacion no encontrada.' });
    }

    if (cotizacionExistente.estado === 'ANULADA') {
      return res.status(409).json({ message: 'No se puede cambiar el estado de una cotizacion anulada.' });
    }

    if (cotizacionExistente.trabajoConvertido || cotizacionExistente.trabajo) {
      if (estado === 'PENDIENTE' || estado === 'RECHAZADA') {
        return res.status(409).json({ message: 'La cotizacion ya fue usada en un trabajo y no puede volver a pendiente o rechazada.' });
      }
    }

    await prisma.cotizacion.update({
      where: { id },
      data: { estado },
    });

    const cotizaciones = await fetchCotizaciones();
    const cotizacion = cotizaciones.find((item) => item.id === id);
    res.json(cotizacion);
  } catch (error) {
    console.error('Error al actualizar cotizacion:', error);
    res.status(500).json({ message: 'No se pudo actualizar la cotizacion.' });
  }
});

app.post('/api/cotizaciones/:id/convertir', async (req, res) => {
  try {
    const { id } = req.params;

    const trabajo = await prisma.$transaction(async (tx) => {
      const cotizacion = await tx.cotizacion.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: {
              orden: 'asc',
            },
          },
          trabajo: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!cotizacion) {
        throw new Error('Cotizacion no encontrada.');
      }

      if (cotizacion.trabajoConvertido || cotizacion.trabajo) {
        throw new Error('Esta cotizacion ya fue convertida.');
      }

      if (cotizacion.estado === 'ANULADA') {
        throw new Error('No se puede convertir una cotizacion anulada.');
      }

      const numero = await generateTrabajoNumero(tx);
      const trabajoCreado = await tx.trabajo.create({
        data: {
          numero,
          clienteId: cotizacion.clienteId,
          cotizacionId: cotizacion.id,
          descripcion: cotizacion.descripcion,
          observaciones: cotizacion.observaciones,
          total: cotizacion.total,
          adelanto: 0,
          saldo: cotizacion.total,
        },
      });

      await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: {
          estado: 'APROBADA',
          trabajoConvertido: true,
        },
      });

      return trabajoCreado;
    });

    res.status(201).json({ trabajoId: trabajo.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo convertir la cotizacion.';
    const status = message.includes('no encontrada') ? 404 : 400;
    console.error('Error al convertir cotizacion:', error);
    res.status(status).json({ message });
  }
});

app.post('/api/cotizaciones/:id/anular', async (req, res) => {
  try {
    const { id } = req.params;

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        trabajo: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return res.status(404).json({ message: 'Cotizacion no encontrada.' });
    }

    const puedeEliminar =
      cotizacion.estado === 'PENDIENTE' &&
      !cotizacion.trabajoConvertido &&
      !cotizacion.trabajo;

    if (puedeEliminar) {
      return res.status(409).json({ message: 'Esta cotizacion aun puede eliminarse. Usa eliminar en lugar de anular.' });
    }

    if (cotizacion.estado === 'ANULADA') {
      return res.status(409).json({ message: 'La cotizacion ya se encuentra anulada.' });
    }

    await prisma.cotizacion.update({
      where: { id },
      data: {
        estado: 'ANULADA',
      },
    });

    const cotizaciones = await fetchCotizaciones();
    const cotizacionActualizada = cotizaciones.find((item) => item.id === id);
    res.json(cotizacionActualizada);
  } catch (error) {
    console.error('Error al anular cotizacion:', error);
    res.status(500).json({ message: 'No se pudo anular la cotizacion.' });
  }
});

app.delete('/api/cotizaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        trabajo: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return res.status(404).json({ message: 'Cotizacion no encontrada.' });
    }

    const puedeEliminar =
      cotizacion.estado === 'PENDIENTE' &&
      !cotizacion.trabajoConvertido &&
      !cotizacion.trabajo;

    if (!puedeEliminar) {
      return res.status(409).json({ message: 'Solo se puede eliminar una cotizacion pendiente y sin trabajo asociado.' });
    }

    await prisma.cotizacion.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar cotizacion:', error);
    res.status(500).json({ message: 'No se pudo eliminar la cotizacion.' });
  }
});

app.get('/api/trabajos', async (_req, res) => {
  try {
    const trabajos = await fetchTrabajos();
    res.json(trabajos);
  } catch (error) {
    console.error('Error al listar trabajos:', error);
    res.status(500).json({ message: 'No se pudieron cargar los trabajos.' });
  }
});

app.post('/api/trabajos', async (req, res) => {
  try {
    const {
      clienteId,
      descripcion,
      total,
      adelantoInicial,
      fechaEntrega,
      tipoTrabajo,
      direccionInstalacion,
      observaciones,
      comprobanteNumero,
      metodoPago,
    } = req.body ?? {};

    const totalNumero = Number(total || 0);
    const adelantoNumero = Number(adelantoInicial || 0);

    if (!clienteId || !descripcion || totalNumero <= 0) {
      return res.status(400).json({ message: 'Cliente, descripcion y total valido son obligatorios.' });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
      },
    });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    const trabajo = await prisma.$transaction(async (tx) => {
      const tipoTrabajoId = await ensureTipoTrabajo(tipoTrabajo);
      const numero = await generateTrabajoNumero(tx);

      const nuevoTrabajo = await tx.trabajo.create({
        data: {
          numero,
          clienteId,
          tipoTrabajoId,
          descripcion: String(descripcion).trim(),
          total: totalNumero,
          adelanto: 0,
          saldo: totalNumero,
          fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null,
          direccionInstalacion: direccionInstalacion ? String(direccionInstalacion).trim() : null,
          observaciones: observaciones ? String(observaciones).trim() : null,
          comprobanteNumero: comprobanteNumero ? String(comprobanteNumero).trim() : null,
        },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
            },
          },
          pagos: {
            select: {
              monto: true,
            },
          },
        },
      });

      if (adelantoNumero > 0) {
        const nuevoPago = await tx.pago.create({
          data: {
            clienteId,
            trabajoId: nuevoTrabajo.id,
            monto: adelantoNumero,
            metodo: metodoPago || 'EFECTIVO',
            tipo: 'ADELANTO',
          },
        });

        await tx.movimientoCaja.create({
          data: {
            pagoId: nuevoPago.id,
            trabajoId: nuevoTrabajo.id,
            tipo: 'INGRESO',
            descripcion: `Pago de trabajo - ${nuevoTrabajo.descripcion}`,
            monto: adelantoNumero,
            referencia: nuevoTrabajo.id,
          },
        });

        await syncTrabajoFinancials(tx, nuevoTrabajo.id);
      }

      const trabajoActualizado = await tx.trabajo.findUnique({
        where: { id: nuevoTrabajo.id },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
            },
          },
          pagos: {
            select: {
              monto: true,
            },
          },
        },
      });

      return mapTrabajo(trabajoActualizado);
    });

    res.status(201).json(trabajo);
  } catch (error) {
    console.error('Error al crear trabajo:', error);
    res.status(500).json({ message: 'No se pudo crear el trabajo.' });
  }
});

app.put('/api/trabajos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      clienteId,
      descripcion,
      total,
      fechaEntrega,
      tipoTrabajo,
      direccionInstalacion,
      observaciones,
      comprobanteNumero,
    } = req.body ?? {};

    const totalNumero = Number(total || 0);

    if (!clienteId || !descripcion || totalNumero <= 0) {
      return res.status(400).json({ message: 'Cliente, descripcion y total valido son obligatorios.' });
    }

    const trabajoExistente = await prisma.trabajo.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!trabajoExistente) {
      return res.status(404).json({ message: 'Trabajo no encontrado.' });
    }

    const trabajo = await prisma.$transaction(async (tx) => {
      const tipoTrabajoId = await ensureTipoTrabajo(tipoTrabajo);

      await tx.trabajo.update({
        where: { id },
        data: {
          clienteId,
          tipoTrabajoId,
          descripcion: String(descripcion).trim(),
          total: totalNumero,
          fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null,
          direccionInstalacion: direccionInstalacion ? String(direccionInstalacion).trim() : null,
          observaciones: observaciones ? String(observaciones).trim() : null,
          comprobanteNumero: comprobanteNumero ? String(comprobanteNumero).trim() : null,
        },
      });

      await syncTrabajoFinancials(tx, id);

      const trabajoActualizado = await tx.trabajo.findUnique({
        where: { id },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
            },
          },
          pagos: {
            select: {
              monto: true,
            },
          },
        },
      });

      return mapTrabajo(trabajoActualizado);
    });

    res.json(trabajo);
  } catch (error) {
    console.error('Error al actualizar trabajo:', error);
    res.status(500).json({ message: 'No se pudo actualizar el trabajo.' });
  }
});

app.get('/api/trabajos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const trabajo = await prisma.trabajo.findUnique({
      where: { id },
      include: {
        cliente: true,
        tipoTrabajo: true,
        materiales: {
          include: {
            producto: {
              select: {
                nombre: true,
              },
            },
          },
        },
        pagos: {
          orderBy: {
            fecha: 'desc',
          },
          select: {
            id: true,
            fecha: true,
            monto: true,
            tipo: true,
            metodo: true,
          },
        },
      },
    });

    if (!trabajo) {
      return res.status(404).json({ message: 'Trabajo no encontrado.' });
    }

    res.json(mapTrabajoDetalle(trabajo));
  } catch (error) {
    console.error('Error al obtener detalle del trabajo:', error);
    res.status(500).json({ message: 'No se pudo cargar el detalle del trabajo.' });
  }
});

app.patch('/api/trabajos/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body ?? {};

    if (!estado) {
      return res.status(400).json({ message: 'El estado es obligatorio.' });
    }

    await prisma.trabajo.update({
      where: { id },
      data: { estado },
    });

    const trabajos = await fetchTrabajos();
    const trabajo = trabajos.find((item) => item.id === id);

    res.json(trabajo);
  } catch (error) {
    console.error('Error al cambiar el estado del trabajo:', error);
    res.status(500).json({ message: 'No se pudo actualizar el estado del trabajo.' });
  }
});

app.get('/api/pagos', async (_req, res) => {
  try {
    const pagos = await prisma.pago.findMany({
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
          },
        },
        trabajo: {
          select: {
            id: true,
            descripcion: true,
          },
        },
      },
      orderBy: {
        fecha: 'desc',
      },
    });

    res.json(pagos.map(mapPago));
  } catch (error) {
    console.error('Error al listar pagos:', error);
    res.status(500).json({ message: 'No se pudieron cargar los pagos.' });
  }
});

app.get('/api/gastos', async (_req, res) => {
  try {
    const gastos = await fetchGastos();
    res.json(gastos);
  } catch (error) {
    console.error('Error al listar gastos:', error);
    res.status(500).json({ message: 'No se pudieron cargar los gastos.' });
  }
});

app.post('/api/gastos', async (req, res) => {
  try {
    const { fecha, descripcion, categoria, monto, referencia, observacion } = req.body ?? {};
    const montoNumero = Number(monto || 0);

    if (!descripcion || montoNumero <= 0) {
      return res.status(400).json({ message: 'Descripcion y monto valido son obligatorios.' });
    }

    const categoriaId = await ensureCategoriaGasto(categoria);

    const gasto = await prisma.$transaction(async (tx) => {
      const nuevoGasto = await tx.gasto.create({
        data: {
          fecha: fecha ? new Date(fecha) : new Date(),
          descripcion: String(descripcion).trim(),
          categoriaId,
          monto: montoNumero,
          referencia: referencia ? String(referencia).trim() : null,
          observacion: observacion ? String(observacion).trim() : null,
        },
        include: {
          categoria: true,
        },
      });

      await tx.movimientoCaja.create({
        data: {
          gastoId: nuevoGasto.id,
          tipo: 'SALIDA',
          descripcion: nuevoGasto.descripcion,
          monto: montoNumero,
          referencia: nuevoGasto.referencia,
          fecha: nuevoGasto.fecha,
        },
      });

      return nuevoGasto;
    });

    res.status(201).json(mapGasto(gasto));
  } catch (error) {
    console.error('Error al registrar gasto:', error);
    res.status(500).json({ message: 'No se pudo registrar el gasto.' });
  }
});

app.put('/api/gastos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, descripcion, categoria, monto, referencia, observacion } = req.body ?? {};
    const montoNumero = Number(monto || 0);

    if (!descripcion || montoNumero <= 0) {
      return res.status(400).json({ message: 'Descripcion y monto valido son obligatorios.' });
    }

    const gastoExistente = await prisma.gasto.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!gastoExistente) {
      return res.status(404).json({ message: 'Gasto no encontrado.' });
    }

    const categoriaId = await ensureCategoriaGasto(categoria);

    const gasto = await prisma.$transaction(async (tx) => {
      const gastoActualizado = await tx.gasto.update({
        where: { id },
        data: {
          fecha: fecha ? new Date(fecha) : new Date(),
          descripcion: String(descripcion).trim(),
          categoriaId,
          monto: montoNumero,
          referencia: referencia ? String(referencia).trim() : null,
          observacion: observacion ? String(observacion).trim() : null,
        },
        include: {
          categoria: true,
        },
      });

      await tx.movimientoCaja.update({
        where: { gastoId: gastoActualizado.id },
        data: {
          fecha: gastoActualizado.fecha,
          descripcion: gastoActualizado.descripcion,
          monto: montoNumero,
          referencia: gastoActualizado.referencia,
        },
      });

      return gastoActualizado;
    });

    res.json(mapGasto(gasto));
  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    res.status(500).json({ message: 'No se pudo actualizar el gasto.' });
  }
});

app.get('/api/caja/movimientos', async (_req, res) => {
  try {
    const movimientos = await prisma.movimientoCaja.findMany({
      orderBy: {
        fecha: 'desc',
      },
    });

    res.json(movimientos.map(mapMovimientoCaja));
  } catch (error) {
    console.error('Error al listar movimientos de caja:', error);
    res.status(500).json({ message: 'No se pudo cargar la caja.' });
  }
});

app.get('/api/reportes', async (req, res) => {
  try {
    const periodo = String(req.query.periodo || 'mes');
    const desde = req.query.desde ? String(req.query.desde) : '';
    const hasta = req.query.hasta ? String(req.query.hasta) : '';
    const { start: startDate, end: endDate } = getDateRange(periodo, desde, hasta);
    const whereFecha = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
    const series = periodo === 'personalizado'
      ? createCustomSeriesBuckets(startDate, endDate)
      : createSeriesBuckets(periodo);
    const seriesMap = new Map(series.map((item) => [item.key, item]));

    const [movimientos, trabajos, clientes, materiales] = await Promise.all([
      prisma.movimientoCaja.findMany({
        where: {
          fecha: whereFecha,
        },
        orderBy: {
          fecha: 'asc',
        },
      }),
      prisma.trabajo.findMany({
        where: {
          fechaRegistro: whereFecha,
        },
        select: {
          id: true,
          estado: true,
        },
      }),
      prisma.cliente.findMany({
        include: {
          trabajos: {
            select: {
              saldo: true,
            },
          },
        },
      }),
      prisma.trabajoMaterial.findMany({
        where: {
          trabajo: {
            fechaRegistro: {
              ...whereFecha,
            },
          },
        },
        include: {
          producto: {
            select: {
              nombre: true,
            },
          },
        },
      }),
    ]);

    let totalIngresos = 0;
    let totalGastos = 0;

    for (const movimiento of movimientos) {
      const bucket = seriesMap.get(getBucketKey(movimiento.fecha, periodo === 'personalizado' ? 'dia' : periodo));

      if (!bucket) {
        continue;
      }

      if (movimiento.tipo === 'INGRESO') {
        bucket.ingresos += Number(movimiento.monto);
        totalIngresos += Number(movimiento.monto);
      } else {
        bucket.gastos += Number(movimiento.monto);
        totalGastos += Number(movimiento.monto);
      }
    }

    const trabajosPorEstadoMap = new Map();

    for (const trabajo of trabajos) {
      trabajosPorEstadoMap.set(
        trabajo.estado,
        (trabajosPorEstadoMap.get(trabajo.estado) || 0) + 1,
      );
    }

    const trabajosPorEstado = Array.from(trabajosPorEstadoMap.entries()).map(([estado, cantidad]) => ({
      estado,
      cantidad,
    }));

    const clientesConSaldo = clientes
      .map((cliente) => ({
        cliente: cliente.nombre,
        saldo: cliente.trabajos.reduce((sum, trabajo) => sum + Number(trabajo.saldo || 0), 0),
      }))
      .filter((cliente) => cliente.saldo > 0)
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 5);

    const productosMap = new Map();

    for (const material of materiales) {
      productosMap.set(
        material.producto.nombre,
        (productosMap.get(material.producto.nombre) || 0) + Number(material.cantidad),
      );
    }

    const productosUsados = Array.from(productosMap.entries())
      .map(([producto, cantidad]) => ({ producto, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    res.json({
      totalIngresos,
      totalGastos,
      utilidadNeta: totalIngresos - totalGastos,
      trabajosRealizados: trabajos.length,
      ingresosVsGastos: series.map(({ key, ...item }) => item),
      trabajosPorEstado,
      clientesConSaldo,
      productosUsados,
    });
  } catch (error) {
    console.error('Error al cargar reportes:', error);
    res.status(500).json({ message: 'No se pudieron cargar los reportes.' });
  }
});

app.post('/api/pagos', async (req, res) => {
  try {
    const { trabajoId, monto, metodo, tipo, observacion } = req.body ?? {};
    const montoNumero = Number(monto || 0);

    if (!trabajoId || !metodo || !tipo || montoNumero <= 0) {
      return res.status(400).json({ message: 'Trabajo, monto, método y tipo son obligatorios.' });
    }

    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      select: {
        id: true,
        clienteId: true,
        descripcion: true,
      },
    });

    if (!trabajo) {
      return res.status(404).json({ message: 'Trabajo no encontrado.' });
    }

    const pago = await prisma.$transaction(async (tx) => {
      const nuevoPago = await tx.pago.create({
        data: {
          clienteId: trabajo.clienteId,
          trabajoId: trabajo.id,
          monto: montoNumero,
          metodo,
          tipo,
          observacion: observacion ? String(observacion).trim() : null,
        },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
            },
          },
          trabajo: {
            select: {
              id: true,
              descripcion: true,
            },
          },
        },
      });

      await tx.movimientoCaja.create({
        data: {
          pagoId: nuevoPago.id,
          trabajoId: trabajo.id,
          tipo: 'INGRESO',
          descripcion: `Pago de trabajo - ${trabajo.descripcion}`,
          monto: montoNumero,
          referencia: trabajo.id,
        },
      });

      await syncTrabajoFinancials(tx, trabajo.id);

      return nuevoPago;
    });

    res.status(201).json(mapPago(pago));
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ message: 'No se pudo registrar el pago.' });
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const {
      nombre,
      categoria,
      unidad,
      stockInicial,
      stockMinimo,
      costoUnitario,
      proveedor,
      observacion,
    } = req.body ?? {};

    if (!nombre || !unidad) {
      return res.status(400).json({ message: 'Nombre y unidad son obligatorios.' });
    }

    const categoriaId = await ensureCategoriaInventario(categoria);

    const producto = await prisma.producto.create({
      data: {
        nombre: String(nombre).trim(),
        categoriaId,
        unidad: String(unidad).trim(),
        stockActual: Number(stockInicial || 0),
        stockMinimo: Number(stockMinimo || 0),
        costoUnitario: Number(costoUnitario || 0),
        proveedor: proveedor ? String(proveedor).trim() : null,
        observacion: observacion ? String(observacion).trim() : null,
      },
      include: {
        categoria: true,
      },
    });

    res.status(201).json(mapProducto(producto));
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ message: 'No se pudo crear el producto.' });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      categoria,
      unidad,
      stockMinimo,
      costoUnitario,
      proveedor,
      observacion,
    } = req.body ?? {};

    if (!nombre || !unidad) {
      return res.status(400).json({ message: 'Nombre y unidad son obligatorios.' });
    }

    const productoExistente = await prisma.producto.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!productoExistente) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    const categoriaId = await ensureCategoriaInventario(categoria);

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        nombre: String(nombre).trim(),
        categoriaId,
        unidad: String(unidad).trim(),
        stockMinimo: Number(stockMinimo || 0),
        costoUnitario: Number(costoUnitario || 0),
        proveedor: proveedor ? String(proveedor).trim() : null,
        observacion: observacion ? String(observacion).trim() : null,
      },
      include: {
        categoria: true,
      },
    });

    res.json(mapProducto(producto));
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ message: 'No se pudo actualizar el producto.' });
  }
});

app.post('/api/productos/:id/movimientos', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tipo,
      motivo,
      cantidad,
      costoUnitario,
      proveedor,
      referencia,
      observacion,
      fecha,
    } = req.body ?? {};

    const cantidadNumero = Number(cantidad || 0);

    if (!tipo || !motivo || cantidadNumero <= 0) {
      return res.status(400).json({ message: 'Tipo, motivo y cantidad válida son obligatorios.' });
    }

    const producto = await prisma.producto.findUnique({
      where: { id },
      select: {
        id: true,
        stockActual: true,
      },
    });

    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    const stockActual = Number(producto.stockActual);
    const nuevoStock =
      tipo === 'ENTRADA' ? stockActual + cantidadNumero : stockActual - cantidadNumero;

    if (tipo === 'SALIDA' && nuevoStock < 0) {
      return res.status(400).json({ message: 'No hay stock suficiente para registrar esta salida.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimientoInventario.create({
        data: {
          productoId: id,
          tipo,
          motivo,
          cantidad: cantidadNumero,
          costoUnitario: costoUnitario == null || costoUnitario === '' ? null : Number(costoUnitario),
          proveedor: proveedor ? String(proveedor).trim() : null,
          referencia: referencia ? String(referencia).trim() : null,
          observacion: observacion ? String(observacion).trim() : null,
          fecha: fecha ? new Date(fecha) : new Date(),
        },
      });

      const productoActualizado = await tx.producto.update({
        where: { id },
        data: {
          stockActual: nuevoStock,
          ...(costoUnitario != null && costoUnitario !== ''
            ? { costoUnitario: Number(costoUnitario) }
            : {}),
          ...(proveedor ? { proveedor: String(proveedor).trim() } : {}),
        },
        include: {
          categoria: true,
        },
      });

      return {
        producto: mapProducto(productoActualizado),
        movimiento: mapMovimientoInventario(movimiento),
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error al registrar movimiento de inventario:', error);
    res.status(500).json({ message: 'No se pudo registrar el movimiento.' });
  }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const { nombre, telefono, direccion, documento, observacion } = req.body ?? {};

    if (!nombre || !telefono || !direccion) {
      return res.status(400).json({ message: 'Nombre, teléfono y dirección son obligatorios.' });
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre: String(nombre).trim(),
        telefono: String(telefono).trim(),
        direccion: String(direccion).trim(),
        documento: documento ? String(documento).trim() : null,
        observacion: observacion ? String(observacion).trim() : null,
      },
      include: {
        trabajos: {
          select: {
            saldo: true,
          },
        },
        _count: {
          select: {
            trabajos: true,
          },
        },
      },
    });

    res.status(201).json(mapCliente(cliente));
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ message: 'No se pudo crear el cliente.' });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, direccion, documento, observacion } = req.body ?? {};

    if (!nombre || !telefono || !direccion) {
      return res.status(400).json({ message: 'Nombre, teléfono y dirección son obligatorios.' });
    }

    const clienteExistente = await prisma.cliente.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!clienteExistente) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nombre: String(nombre).trim(),
        telefono: String(telefono).trim(),
        direccion: String(direccion).trim(),
        documento: documento ? String(documento).trim() : null,
        observacion: observacion ? String(observacion).trim() : null,
      },
      include: {
        trabajos: {
          select: {
            saldo: true,
          },
        },
        _count: {
          select: {
            trabajos: true,
          },
        },
      },
    });

    res.json(mapCliente(cliente));
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ message: 'No se pudo actualizar el cliente.' });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const clienteExistente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            cotizaciones: true,
            trabajos: true,
            pagos: true,
          },
        },
      },
    });

    if (!clienteExistente) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    const tieneRelacion =
      clienteExistente._count.cotizaciones > 0 ||
      clienteExistente._count.trabajos > 0 ||
      clienteExistente._count.pagos > 0;

    if (tieneRelacion) {
      return res.status(409).json({
        message: 'No se puede eliminar un cliente con cotizaciones, trabajos o pagos asociados.',
      });
    }

    await prisma.cliente.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ message: 'No se pudo eliminar el cliente.' });
  }
});

export default app;

if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`API lista en http://localhost:${port}`);
  });
}
