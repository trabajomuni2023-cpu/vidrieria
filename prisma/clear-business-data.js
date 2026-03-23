import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearBusinessData() {
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

async function main() {
  await clearBusinessData();
  console.log('Datos operativos eliminados correctamente. Usuarios y configuración se conservaron.');
}

main()
  .catch((error) => {
    console.error('No se pudo limpiar la base:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
