# Datos Demo

## Comandos

Para cargar datos demo en una base vacia:

```bash
cmd /c npm run demo:seed
```

Para borrar los datos actuales del negocio y reemplazarlos por la demo:

```bash
cmd /c npm run demo:seed:reset
```

## Que crea

La demo crea informacion realista para probar:

- dashboard
- trabajos
- pagos
- inventario
- gastos
- caja
- reportes
- calendario

Incluye aproximadamente:

- 8 clientes
- 8 productos
- 12 trabajos
- pagos en distintos meses
- gastos en distintos meses
- productos con stock bajo
- movimientos de caja
- movimientos de inventario
- materiales usados en trabajos

## Usuarios demo

- `admin@vidrieria.com` / `admin123`
- `operador@vidrieria.com` / `operador123`

## Nota

El modulo de cotizaciones ya no forma parte del flujo visible de la app. La demo esta enfocada en:

`Cliente -> Trabajo -> Pago -> Caja -> Reportes`
