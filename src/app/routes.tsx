import { createBrowserRouter, Navigate } from 'react-router';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RegistroRapido from './pages/RegistroRapido';
import Clientes from './pages/Clientes';
import ClienteDetalle from './pages/ClienteDetalle';
import Trabajos from './pages/Trabajos';
import TrabajoDetalle from './pages/TrabajoDetalle';
import Pagos from './pages/Pagos';
import Inventario from './pages/Inventario';
import ProductoDetalle from './pages/ProductoDetalle';
import Gastos from './pages/Gastos';
import Caja from './pages/Caja';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import Calendario from './pages/Calendario';
import RequireAuth from './components/RequireAuth';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/dashboard',
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: 'registro', Component: RegistroRapido },
          { path: 'clientes', Component: Clientes },
          { path: 'clientes/:id', Component: ClienteDetalle },
          { path: 'cotizaciones', element: <Navigate to="/dashboard/trabajos" replace /> },
          { path: 'cotizaciones/:id', element: <Navigate to="/dashboard/trabajos" replace /> },
          { path: 'trabajos', Component: Trabajos },
          { path: 'trabajos/:id', Component: TrabajoDetalle },
          { path: 'pagos', Component: Pagos },
          { path: 'inventario', Component: Inventario },
          { path: 'inventario/:id', Component: ProductoDetalle },
          { path: 'gastos', Component: Gastos },
          { path: 'caja', Component: Caja },
          { path: 'reportes', Component: Reportes },
          { path: 'configuracion', Component: Configuracion },
          { path: 'calendario', Component: Calendario },
        ],
      },
    ],
  },
]);
