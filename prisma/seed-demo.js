import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const shouldReset = process.argv.includes('--reset');
const now = new Date();

function hashPassword(password) {
  return crypto.scryptSync(password, 'vidrieria-salt', 64).toString('hex');
}

function relativeDate({ months = 0, days = 0, hours = 0 } = {}) {
  const date = new Date(now);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  return date;
}

async function ensureBaseUsers() {
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@vidrieria.com' },
    update: {
      nombre: 'Administrador',
      telefono: '999999999',
      activo: true,
      rol: 'ADMIN',
    },
    create: {
      nombre: 'Administrador',
      email: 'admin@vidrieria.com',
      telefono: '999999999',
      passwordHash: hashPassword('admin123'),
      rol: 'ADMIN',
      activo: true,
    },
  });

  const operador = await prisma.usuario.upsert({
    where: { email: 'operador@vidrieria.com' },
    update: {
      nombre: 'Operador Demo',
      telefono: '988777666',
      activo: true,
      rol: 'OPERADOR',
    },
    create: {
      nombre: 'Operador Demo',
      email: 'operador@vidrieria.com',
      telefono: '988777666',
      passwordHash: hashPassword('operador123'),
      rol: 'OPERADOR',
      activo: true,
    },
  });

  return { admin, operador };
}

async function ensureConfiguracion() {
  const data = {
    nombreComercial: 'Vidrieria Cristal Demo',
    telefono: '987654321',
    email: 'contacto@vidrieriacristal.com',
    direccion: 'Av. Principal 245, Lima',
    moneda: 'PEN',
    stockMinimoPorDefecto: 5,
  };

  const existing = await prisma.configuracionNegocio.findFirst();

  if (existing) {
    await prisma.configuracionNegocio.update({
      where: { id: existing.id },
      data,
    });
    return;
  }

  await prisma.configuracionNegocio.create({
    data,
  });
}

async function assertDatabaseReady() {
  const [clientes, trabajos, productos, pagos, gastos] = await Promise.all([
    prisma.cliente.count(),
    prisma.trabajo.count(),
    prisma.producto.count(),
    prisma.pago.count(),
    prisma.gasto.count(),
  ]);

  const total = clientes + trabajos + productos + pagos + gastos;

  if (total > 0 && !shouldReset) {
    throw new Error('La base ya tiene datos. Usa "npm run demo:seed:reset" para reemplazarlos por la demo.');
  }
}

async function resetBusinessData() {
  await prisma.$transaction([
    prisma.movimientoCaja.deleteMany(),
    prisma.pago.deleteMany(),
    prisma.trabajoMaterial.deleteMany(),
    prisma.movimientoInventario.deleteMany(),
    prisma.gasto.deleteMany(),
    prisma.trabajo.deleteMany(),
    prisma.cotizacionItem.deleteMany(),
    prisma.cotizacion.deleteMany(),
    prisma.producto.deleteMany(),
    prisma.categoriaInventario.deleteMany(),
    prisma.categoriaGasto.deleteMany(),
    prisma.tipoTrabajo.deleteMany(),
    prisma.cliente.deleteMany(),
  ]);
}

async function createCatalogs() {
  const categoriaInventarioNames = ['Vidrios', 'Accesorios', 'Selladores', 'Perfiles', 'Espejos'];
  const categoriaGastoNames = ['Materiales', 'Transporte', 'Servicios', 'Herramientas', 'Operativos'];
  const tipoTrabajoNames = ['Mampara', 'Puerta de vidrio', 'Espejo', 'Baranda', 'Ventana'];

  const categoriasInventario = {};
  for (const nombre of categoriaInventarioNames) {
    categoriasInventario[nombre] = await prisma.categoriaInventario.create({ data: { nombre } });
  }

  const categoriasGasto = {};
  for (const nombre of categoriaGastoNames) {
    categoriasGasto[nombre] = await prisma.categoriaGasto.create({ data: { nombre } });
  }

  const tiposTrabajo = {};
  for (const nombre of tipoTrabajoNames) {
    tiposTrabajo[nombre] = await prisma.tipoTrabajo.create({ data: { nombre } });
  }

  return { categoriasInventario, categoriasGasto, tiposTrabajo };
}

async function createClients() {
  const clientesData = [
    ['Juan Perez', '987654321', 'Av. Los Olivos 123 - Lima', '45879632'],
    ['Pepito Ramos', '999111222', 'Jr. Las Flores 850 - Lima', '70654321'],
    ['Maria Quispe', '955666777', 'Mz. B Lt. 7 - San Juan de Lurigancho', '46891234'],
    ['Carlos Huaman', '944222111', 'Av. Universitaria 4500 - Los Olivos', '43125789'],
    ['Inversiones Salazar SAC', '014522110', 'Av. Javier Prado 1200 - San Isidro', '20547896541'],
    ['Rosa Delgado', '977333888', 'Calle Los Pinos 240 - Surco', '49221567'],
    ['Hotel Costa Azul', '012365478', 'Malecón 560 - Miraflores', '20659874123'],
    ['Lucia Torres', '966111444', 'Av. Túpac Amaru 1020 - Comas', '47852369'],
  ];

  const clientes = [];
  for (const [nombre, telefono, direccion, documento] of clientesData) {
    clientes.push(await prisma.cliente.create({
      data: {
        nombre,
        telefono,
        direccion,
        documento,
      },
    }));
  }

  return clientes;
}

async function createProducts(catalogs) {
  const products = {};
  const productsData = [
    { nombre: 'Vidrio templado 8 mm', categoria: 'Vidrios', unidad: 'm2', stockActual: 14, stockMinimo: 5, costoUnitario: 120, proveedor: 'Cristales del Peru' },
    { nombre: 'Vidrio laminado 6 mm', categoria: 'Vidrios', unidad: 'm2', stockActual: 4, stockMinimo: 6, costoUnitario: 95, proveedor: 'Cristales del Peru' },
    { nombre: 'Espejo 4 mm', categoria: 'Espejos', unidad: 'm2', stockActual: 8, stockMinimo: 4, costoUnitario: 75, proveedor: 'Espejos Lima' },
    { nombre: 'Kit de herrajes para mampara', categoria: 'Accesorios', unidad: 'juego', stockActual: 3, stockMinimo: 4, costoUnitario: 140, proveedor: 'Herrajes Master' },
    { nombre: 'Bisagra para puerta de vidrio', categoria: 'Accesorios', unidad: 'unidad', stockActual: 12, stockMinimo: 6, costoUnitario: 35, proveedor: 'Herrajes Master' },
    { nombre: 'Silicona transparente', categoria: 'Selladores', unidad: 'tubo', stockActual: 7, stockMinimo: 8, costoUnitario: 18, proveedor: 'Sika Peru' },
    { nombre: 'Perfil de aluminio negro', categoria: 'Perfiles', unidad: 'ml', stockActual: 26, stockMinimo: 10, costoUnitario: 22, proveedor: 'Aluminios SAC' },
    { nombre: 'Jalador acero inoxidable', categoria: 'Accesorios', unidad: 'unidad', stockActual: 9, stockMinimo: 4, costoUnitario: 28, proveedor: 'Herrajes Master' },
  ];

  for (const item of productsData) {
    const producto = await prisma.producto.create({
      data: {
        nombre: item.nombre,
        categoriaId: catalogs.categoriasInventario[item.categoria].id,
        unidad: item.unidad,
        stockActual: item.stockActual,
        stockMinimo: item.stockMinimo,
        costoUnitario: item.costoUnitario,
        proveedor: item.proveedor,
      },
    });

    products[item.nombre] = producto;
  }

  return products;
}

async function createInventoryHistory(productos, adminId) {
  const movimientos = [
    { producto: 'Vidrio templado 8 mm', tipo: 'ENTRADA', motivo: 'COMPRA', cantidad: 20, costoUnitario: 120, fecha: relativeDate({ months: -2, days: 2 }), referencia: 'FAC-00125' },
    { producto: 'Vidrio laminado 6 mm', tipo: 'ENTRADA', motivo: 'COMPRA', cantidad: 12, costoUnitario: 95, fecha: relativeDate({ months: -2, days: 4 }), referencia: 'FAC-00126' },
    { producto: 'Espejo 4 mm', tipo: 'ENTRADA', motivo: 'COMPRA', cantidad: 10, costoUnitario: 75, fecha: relativeDate({ months: -1, days: -10 }), referencia: 'FAC-00140' },
    { producto: 'Kit de herrajes para mampara', tipo: 'ENTRADA', motivo: 'COMPRA', cantidad: 6, costoUnitario: 140, fecha: relativeDate({ months: -1, days: -7 }), referencia: 'FAC-00141' },
    { producto: 'Silicona transparente', tipo: 'ENTRADA', motivo: 'COMPRA', cantidad: 15, costoUnitario: 18, fecha: relativeDate({ months: -1, days: -4 }), referencia: 'FAC-00142' },
    { producto: 'Perfil de aluminio negro', tipo: 'ENTRADA', motivo: 'COMPRA', cantidad: 40, costoUnitario: 22, fecha: relativeDate({ months: -1, days: 0 }), referencia: 'FAC-00143' },
    { producto: 'Vidrio laminado 6 mm', tipo: 'SALIDA', motivo: 'USO_EN_TRABAJO', cantidad: 8, fecha: relativeDate({ days: -12 }), referencia: 'Trabajo demo 2' },
    { producto: 'Kit de herrajes para mampara', tipo: 'SALIDA', motivo: 'USO_EN_TRABAJO', cantidad: 3, fecha: relativeDate({ days: -8 }), referencia: 'Trabajo demo 5' },
    { producto: 'Silicona transparente', tipo: 'SALIDA', motivo: 'USO_EN_TRABAJO', cantidad: 8, fecha: relativeDate({ days: -4 }), referencia: 'Instalaciones varias' },
  ];

  for (const movimiento of movimientos) {
    await prisma.movimientoInventario.create({
      data: {
        productoId: productos[movimiento.producto].id,
        usuarioId: adminId,
        tipo: movimiento.tipo,
        motivo: movimiento.motivo,
        cantidad: movimiento.cantidad,
        costoUnitario: movimiento.costoUnitario ?? null,
        referencia: movimiento.referencia,
        fecha: movimiento.fecha,
      },
    });
  }
}

async function createTrabajosAndFinance(clientes, productos, catalogs, users) {
  const trabajosSeed = [
    {
      numero: 'TRA-2026-0001',
      cliente: 'Juan Perez',
      tipo: 'Mampara',
      descripcion: 'Mampara corrediza de vidrio templado para bano principal',
      total: 980,
      fechaRegistro: relativeDate({ months: -2, days: 3 }),
      fechaEntrega: relativeDate({ months: -2, days: 9 }),
      estado: 'ENTREGADO',
      boleta: 'B001-1021',
      pagos: [
        { monto: 400, metodo: 'YAPE', tipo: 'ADELANTO', fecha: relativeDate({ months: -2, days: 3, hours: 1 }) },
        { monto: 580, metodo: 'TRANSFERENCIA', tipo: 'FINAL', fecha: relativeDate({ months: -2, days: 10, hours: 2 }) },
      ],
      materiales: [
        ['Vidrio templado 8 mm', 2, 'm2', 120],
        ['Kit de herrajes para mampara', 1, 'juego', 140],
        ['Silicona transparente', 2, 'tubo', 18],
      ],
    },
    {
      numero: 'TRA-2026-0002',
      cliente: 'Pepito Ramos',
      tipo: 'Puerta de vidrio',
      descripcion: 'Instalacion de puerta de vidrio para local comercial',
      total: 1450,
      fechaRegistro: relativeDate({ months: -2, days: 12 }),
      fechaEntrega: relativeDate({ months: -2, days: 18 }),
      estado: 'ENTREGADO',
      boleta: 'F001-2201',
      pagos: [
        { monto: 700, metodo: 'EFECTIVO', tipo: 'ADELANTO', fecha: relativeDate({ months: -2, days: 12, hours: 2 }) },
        { monto: 750, metodo: 'TRANSFERENCIA', tipo: 'FINAL', fecha: relativeDate({ months: -2, days: 18, hours: 4 }) },
      ],
      materiales: [
        ['Vidrio laminado 6 mm', 3, 'm2', 95],
        ['Bisagra para puerta de vidrio', 2, 'unidad', 35],
        ['Jalador acero inoxidable', 1, 'unidad', 28],
      ],
    },
    {
      numero: 'TRA-2026-0003',
      cliente: 'Maria Quispe',
      tipo: 'Espejo',
      descripcion: 'Espejo decorativo para sala con instalacion incluida',
      total: 520,
      fechaRegistro: relativeDate({ months: -1, days: -18 }),
      fechaEntrega: relativeDate({ months: -1, days: -13 }),
      estado: 'ENTREGADO',
      boleta: 'B001-1108',
      pagos: [
        { monto: 200, metodo: 'PLIN', tipo: 'ADELANTO', fecha: relativeDate({ months: -1, days: -18, hours: 1 }) },
        { monto: 320, metodo: 'EFECTIVO', tipo: 'FINAL', fecha: relativeDate({ months: -1, days: -13, hours: 3 }) },
      ],
      materiales: [
        ['Espejo 4 mm', 2.5, 'm2', 75],
        ['Perfil de aluminio negro', 6, 'ml', 22],
      ],
    },
    {
      numero: 'TRA-2026-0004',
      cliente: 'Carlos Huaman',
      tipo: 'Ventana',
      descripcion: 'Ventana fija de vidrio laminado para fachada',
      total: 860,
      fechaRegistro: relativeDate({ months: -1, days: -9 }),
      fechaEntrega: relativeDate({ months: -1, days: -3 }),
      estado: 'TERMINADO',
      boleta: 'B001-1150',
      pagos: [
        { monto: 300, metodo: 'TRANSFERENCIA', tipo: 'ADELANTO', fecha: relativeDate({ months: -1, days: -9, hours: 2 }) },
      ],
      materiales: [
        ['Vidrio laminado 6 mm', 2.8, 'm2', 95],
        ['Perfil de aluminio negro', 8, 'ml', 22],
      ],
    },
    {
      numero: 'TRA-2026-0005',
      cliente: 'Inversiones Salazar SAC',
      tipo: 'Mampara',
      descripcion: 'Mamparas de oficina en vidrio templado para sala de reuniones',
      total: 3200,
      fechaRegistro: relativeDate({ months: -1, days: -2 }),
      fechaEntrega: relativeDate({ days: 3 }),
      estado: 'EN_PROCESO',
      boleta: 'F001-2298',
      pagos: [
        { monto: 1500, metodo: 'TRANSFERENCIA', tipo: 'ADELANTO', fecha: relativeDate({ months: -1, days: -2, hours: 1 }) },
      ],
      materiales: [
        ['Vidrio templado 8 mm', 8, 'm2', 120],
        ['Kit de herrajes para mampara', 2, 'juego', 140],
        ['Silicona transparente', 3, 'tubo', 18],
      ],
    },
    {
      numero: 'TRA-2026-0006',
      cliente: 'Rosa Delgado',
      tipo: 'Espejo',
      descripcion: 'Espejo para bano con bordes pulidos',
      total: 310,
      fechaRegistro: relativeDate({ days: -20 }),
      fechaEntrega: relativeDate({ days: -16 }),
      estado: 'ENTREGADO',
      boleta: 'B001-1204',
      pagos: [
        { monto: 310, metodo: 'YAPE', tipo: 'FINAL', fecha: relativeDate({ days: -18, hours: 2 }) },
      ],
      materiales: [
        ['Espejo 4 mm', 1.2, 'm2', 75],
      ],
    },
    {
      numero: 'TRA-2026-0007',
      cliente: 'Hotel Costa Azul',
      tipo: 'Baranda',
      descripcion: 'Baranda de vidrio para terraza del segundo piso',
      total: 2800,
      fechaRegistro: relativeDate({ days: -14 }),
      fechaEntrega: relativeDate({ days: -6 }),
      estado: 'TERMINADO',
      boleta: 'F001-2315',
      pagos: [
        { monto: 1200, metodo: 'TRANSFERENCIA', tipo: 'ADELANTO', fecha: relativeDate({ days: -14, hours: 2 }) },
        { monto: 800, metodo: 'TRANSFERENCIA', tipo: 'PARCIAL', fecha: relativeDate({ days: -9, hours: 4 }) },
      ],
      materiales: [
        ['Vidrio templado 8 mm', 7, 'm2', 120],
        ['Perfil de aluminio negro', 10, 'ml', 22],
      ],
    },
    {
      numero: 'TRA-2026-0008',
      cliente: 'Lucia Torres',
      tipo: 'Puerta de vidrio',
      descripcion: 'Reemplazo de puerta de ducha templada',
      total: 760,
      fechaRegistro: relativeDate({ days: -11 }),
      fechaEntrega: relativeDate({ days: -7 }),
      estado: 'CANCELADO',
      boleta: 'B001-1219',
      pagos: [],
      materiales: [],
    },
    {
      numero: 'TRA-2026-0009',
      cliente: 'Juan Perez',
      tipo: 'Espejo',
      descripcion: 'Espejo de cuerpo completo para dormitorio',
      total: 430,
      fechaRegistro: relativeDate({ days: -7 }),
      fechaEntrega: relativeDate({ days: -2 }),
      estado: 'ENTREGADO',
      boleta: 'B001-1225',
      pagos: [
        { monto: 200, metodo: 'EFECTIVO', tipo: 'ADELANTO', fecha: relativeDate({ days: -7, hours: 1 }) },
        { monto: 230, metodo: 'YAPE', tipo: 'FINAL', fecha: relativeDate({ days: -2, hours: 2 }) },
      ],
      materiales: [
        ['Espejo 4 mm', 1.5, 'm2', 75],
      ],
    },
    {
      numero: 'TRA-2026-0010',
      cliente: 'Pepito Ramos',
      tipo: 'Ventana',
      descripcion: 'Ventana corrediza de vidrio para oficina',
      total: 1250,
      fechaRegistro: relativeDate({ days: -3 }),
      fechaEntrega: relativeDate({ days: 2 }),
      estado: 'EN_PROCESO',
      boleta: 'F001-2330',
      pagos: [
        { monto: 500, metodo: 'PLIN', tipo: 'ADELANTO', fecha: relativeDate({ days: -3, hours: 1 }) },
      ],
      materiales: [
        ['Vidrio laminado 6 mm', 3.5, 'm2', 95],
        ['Perfil de aluminio negro', 9, 'ml', 22],
      ],
    },
    {
      numero: 'TRA-2026-0011',
      cliente: 'Maria Quispe',
      tipo: 'Mampara',
      descripcion: 'Mampara batiente para bano secundario',
      total: 890,
      fechaRegistro: relativeDate({ days: 0 }),
      fechaEntrega: relativeDate({ days: 4 }),
      estado: 'PENDIENTE',
      boleta: 'B001-1239',
      pagos: [
        { monto: 300, metodo: 'YAPE', tipo: 'ADELANTO', fecha: relativeDate({ hours: -1 }) },
      ],
      materiales: [
        ['Vidrio templado 8 mm', 2.2, 'm2', 120],
        ['Kit de herrajes para mampara', 1, 'juego', 140],
      ],
    },
    {
      numero: 'TRA-2026-0012',
      cliente: 'Carlos Huaman',
      tipo: 'Puerta de vidrio',
      descripcion: 'Puerta templada para acceso de oficina',
      total: 1680,
      fechaRegistro: relativeDate({ days: 0, hours: -3 }),
      fechaEntrega: relativeDate({ days: 6 }),
      estado: 'PENDIENTE',
      boleta: 'F001-2341',
      pagos: [],
      materiales: [
        ['Vidrio templado 8 mm', 4, 'm2', 120],
        ['Bisagra para puerta de vidrio', 3, 'unidad', 35],
        ['Jalador acero inoxidable', 2, 'unidad', 28],
      ],
    },
  ];

  const trabajos = [];

  for (const item of trabajosSeed) {
    const cliente = clientes.find((entry) => entry.nombre === item.cliente);
    const totalPagado = item.pagos.reduce((sum, pago) => sum + pago.monto, 0);

    const trabajo = await prisma.trabajo.create({
      data: {
        numero: item.numero,
        clienteId: cliente.id,
        tipoTrabajoId: catalogs.tiposTrabajo[item.tipo].id,
        usuarioId: users.admin.id,
        fechaRegistro: item.fechaRegistro,
        fechaEntrega: item.fechaEntrega,
        descripcion: item.descripcion,
        direccionInstalacion: cliente.direccion,
        observaciones: `Trabajo demo para pruebas del sistema - ${item.tipo}`,
        comprobanteNumero: item.boleta,
        total: item.total,
        adelanto: totalPagado,
        saldo: Math.max(item.total - totalPagado, 0),
        estado: item.estado,
      },
    });

    for (const material of item.materiales) {
      const producto = productos[material[0]];
      await prisma.trabajoMaterial.create({
        data: {
          trabajoId: trabajo.id,
          productoId: producto.id,
          cantidad: material[1],
          unidad: material[2],
          costoUnitario: material[3],
          subtotal: Number(material[1]) * Number(material[3]),
        },
      });
    }

    for (const pagoItem of item.pagos) {
      const pago = await prisma.pago.create({
        data: {
          clienteId: cliente.id,
          trabajoId: trabajo.id,
          usuarioId: users.admin.id,
          fecha: pagoItem.fecha,
          monto: pagoItem.monto,
          metodo: pagoItem.metodo,
          tipo: pagoItem.tipo,
          observacion: 'Pago demo registrado para pruebas',
        },
      });

      await prisma.movimientoCaja.create({
        data: {
          usuarioId: users.admin.id,
          trabajoId: trabajo.id,
          pagoId: pago.id,
          fecha: pagoItem.fecha,
          tipo: 'INGRESO',
          descripcion: `Pago de trabajo - ${item.descripcion}`,
          monto: pagoItem.monto,
          referencia: trabajo.numero,
        },
      });
    }

    trabajos.push(trabajo);
  }

  return trabajos;
}

async function createGastos(catalogs, userId) {
  const gastos = [
    { fecha: relativeDate({ months: -2, days: 5 }), descripcion: 'Compra de silicona y accesorios', categoria: 'Materiales', monto: 280, referencia: 'BOL-4801' },
    { fecha: relativeDate({ months: -2, days: 14 }), descripcion: 'Flete por traslado de vidrios', categoria: 'Transporte', monto: 160, referencia: 'TR-902' },
    { fecha: relativeDate({ months: -1, days: -12 }), descripcion: 'Mantenimiento de cortadora', categoria: 'Herramientas', monto: 420, referencia: 'SER-120' },
    { fecha: relativeDate({ months: -1, days: -2 }), descripcion: 'Pago de internet y telefono', categoria: 'Servicios', monto: 190, referencia: 'REC-771' },
    { fecha: relativeDate({ days: -10 }), descripcion: 'Compra de empaques y cintas', categoria: 'Operativos', monto: 95, referencia: 'BOL-4932' },
    { fecha: relativeDate({ days: -4 }), descripcion: 'Combustible para entregas', categoria: 'Transporte', monto: 130, referencia: 'FAC-3005' },
    { fecha: relativeDate({ days: 0, hours: -2 }), descripcion: 'Compra urgente de herrajes', categoria: 'Materiales', monto: 210, referencia: 'BOL-5001' },
  ];

  for (const item of gastos) {
    const gasto = await prisma.gasto.create({
      data: {
        categoriaId: catalogs.categoriasGasto[item.categoria].id,
        usuarioId: userId,
        fecha: item.fecha,
        descripcion: item.descripcion,
        monto: item.monto,
        referencia: item.referencia,
        observacion: 'Gasto demo para pruebas',
      },
    });

    await prisma.movimientoCaja.create({
      data: {
        usuarioId: userId,
        gastoId: gasto.id,
        fecha: item.fecha,
        tipo: 'SALIDA',
        descripcion: item.descripcion,
        monto: item.monto,
        referencia: item.referencia,
      },
    });
  }
}

async function main() {
  await ensureConfiguracion();
  const users = await ensureBaseUsers();
  await assertDatabaseReady();

  if (shouldReset) {
    console.log('Limpiando datos actuales para cargar la demo...');
    await resetBusinessData();
  }

  const catalogs = await createCatalogs();
  const clientes = await createClients();
  const productos = await createProducts(catalogs);
  await createInventoryHistory(productos, users.admin.id);
  await createTrabajosAndFinance(clientes, productos, catalogs, users);
  await createGastos(catalogs, users.admin.id);

  console.log('Datos demo cargados correctamente.');
  console.log('Resumen: 8 clientes, 8 productos, 12 trabajos, pagos, gastos y movimientos para reportes.');
  console.log('Usuarios demo: admin@vidrieria.com / admin123 y operador@vidrieria.com / operador123');
}

main()
  .catch((error) => {
    console.error('No se pudo cargar la demo:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
