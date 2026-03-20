import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { formatDate } from '../lib/utils';
import { getTrabajos, type Trabajo } from '../lib/trabajos-api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

function getEstadoBadgeVariant(estado: string) {
  if (estado === 'TERMINADO' || estado === 'ENTREGADO') {
    return 'success';
  }

  if (estado === 'EN_PROCESO') {
    return 'info';
  }

  if (estado === 'CANCELADO') {
    return 'danger';
  }

  return 'warning';
}

function formatEstado(estado: string) {
  return estado
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Calendario() {
  const navigate = useNavigate();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTrabajos() {
      try {
        const data = await getTrabajos();

        if (isMounted) {
          setTrabajos(data.filter((trabajo) => trabajo.fechaEntrega));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el calendario.');
      }
    }

    void loadTrabajos();

    return () => {
      isMounted = false;
    };
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const days = [];
  for (let index = 0; index < startingDayOfWeek; index += 1) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(day);
  }

  const trabajosPorFecha = useMemo(() => {
    return trabajos.reduce<Record<string, Trabajo[]>>((accumulator, trabajo) => {
      if (!trabajo.fechaEntrega) {
        return accumulator;
      }

      const key = new Date(trabajo.fechaEntrega).toISOString().slice(0, 10);
      accumulator[key] = [...(accumulator[key] || []), trabajo];
      return accumulator;
    }, {});
  }, [trabajos]);

  function getTrabajosForDate(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return trabajosPorFecha[dateStr] || [];
  }

  const selectedDateEvents = selectedDate ? trabajosPorFecha[selectedDate] || [] : [];
  const proximosEventos = [...trabajos]
    .filter((trabajo) => trabajo.fechaEntrega && trabajo.estado !== 'ENTREGADO' && trabajo.estado !== 'CANCELADO')
    .sort((a, b) => {
      return new Date(a.fechaEntrega || a.fecha).getTime() - new Date(b.fechaEntrega || b.fecha).getTime();
    })
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="text-sm text-gray-600 mt-1">Agenda de entregas e instalaciones</p>
        </div>
        <Button onClick={() => navigate('/dashboard/trabajos')}>
          <Plus className="w-4 h-4" />
          Programar trabajo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {monthNames[month]} {year}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map((dayName) => (
                <div key={dayName} className="text-center text-xs font-medium text-gray-600 p-2">
                  {dayName}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={index} className="p-2" />;
                }

                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const eventosDelDia = getTrabajosForDate(day);
                const today = new Date().toISOString().slice(0, 10);
                const isToday = dateStr === today;
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      p-2 min-h-20 border rounded-lg text-left transition-all hover:border-[var(--brand-600)]
                      ${isToday ? 'border-[var(--brand-600)] bg-[var(--brand-50)]' : 'border-gray-200'}
                      ${isSelected ? 'ring-2 ring-[var(--brand-600)] bg-[var(--brand-50)]' : ''}
                    `}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-[var(--brand-600)]' : 'text-gray-900'}`}>
                      {day}
                    </div>
                    {eventosDelDia.length > 0 ? (
                      <div className="space-y-1">
                        {eventosDelDia.slice(0, 2).map((evento) => (
                          <div
                            key={evento.id}
                            className="truncate rounded px-1.5 py-0.5 text-xs bg-[var(--brand-100)] text-[var(--brand-700)]"
                          >
                            {evento.cliente}
                          </div>
                        ))}
                        {eventosDelDia.length > 2 ? (
                          <div className="text-xs text-gray-500">+{eventosDelDia.length - 2} más</div>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? `Eventos del ${formatDate(selectedDate)}` : 'Próximos eventos'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((evento) => (
                    <div
                      key={evento.id}
                      className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-colors hover:border-[var(--brand-600)]"
                      onClick={() => navigate(`/dashboard/trabajos/${evento.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{evento.cliente}</h4>
                        <Badge variant={getEstadoBadgeVariant(evento.estado)}>
                          {formatEstado(evento.estado)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{evento.descripcion}</p>
                      <p className="text-xs text-gray-500">Entrega: {evento.fechaEntrega ? formatDate(evento.fechaEntrega) : '-'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No hay eventos para esta fecha</p>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {proximosEventos.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Todavía no hay trabajos programados</p>
                  </div>
                ) : (
                  proximosEventos.map((evento) => (
                    <div
                      key={evento.id}
                      className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-colors hover:border-[var(--brand-600)]"
                      onClick={() => setSelectedDate(new Date(evento.fechaEntrega || evento.fecha).toISOString().slice(0, 10))}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{evento.cliente}</h4>
                        <Badge variant={getEstadoBadgeVariant(evento.estado)}>
                          {formatEstado(evento.estado)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{evento.descripcion}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {evento.fechaEntrega ? formatDate(evento.fechaEntrega) : formatDate(evento.fecha)}
                        </span>
                        <span className="text-xs font-medium text-[var(--brand-600)]">Ver día</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
