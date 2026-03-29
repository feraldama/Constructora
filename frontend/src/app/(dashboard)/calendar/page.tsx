"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { useCalendarEvents } from "@/hooks/useDashboard";
import type { CalendarEvent } from "@/lib/api/dashboard";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const TYPE_LABEL: Record<string, string> = {
  PAYMENT_DUE: "Vencimiento",
  PAYMENT_PAID: "Pago realizado",
  CERTIFICATE: "Certificación",
  PROJECT_START: "Inicio obra",
  PROJECT_END: "Fin obra",
};

function fmt(n: number): string {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday = 0, Sunday = 6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Prev month fill
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }

  // Next month fill to complete 6 rows
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }

  return days;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const { projectId, project } = useProject();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const from = new Date(year, month - 1, 1).toISOString();
  const to = new Date(year, month + 2, 0).toISOString();

  const { data: events, isLoading } = useCalendarEvents(projectId ?? undefined, from, to);

  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    if (!events) return map;
    for (const ev of events) {
      const key = dateKey(new Date(ev.date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const todayKey = dateKey(today);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendario de obra</h1>
        <p className="text-sm text-gray-500 mt-1">
          {project ? project.name : "Vencimientos, pagos y certificaciones"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_NAMES.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const key = dateKey(day.date);
              const dayEvents = eventsByDate.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(key === selectedDate ? null : key)}
                  className={`min-h-[80px] sm:min-h-[100px] p-1.5 border-b border-r border-gray-100 cursor-pointer transition-colors ${
                    !day.isCurrentMonth ? "bg-gray-50/50" : ""
                  } ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${
                      isToday
                        ? "bg-blue-600 text-white font-bold"
                        : day.isCurrentMonth
                        ? "text-gray-900"
                        : "text-gray-300"
                    }`}
                  >
                    {day.date.getDate()}
                  </span>

                  {/* Event dots */}
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate text-white font-medium"
                        style={{ backgroundColor: ev.color }}
                        title={ev.title}
                      >
                        <span className="hidden sm:inline">{ev.title}</span>
                        <span className="sm:hidden">&bull;</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 3} más</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: selected day events or upcoming */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon size={18} className="text-gray-400" />
            <h3 className="font-semibold text-gray-900">
              {selectedDate
                ? new Date(selectedDate + "T12:00:00").toLocaleDateString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "Próximos eventos"}
            </h3>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : selectedDate && selectedEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          ) : selectedDate ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin eventos este día</p>
          ) : events && events.length > 0 ? (
            <div className="space-y-2">
              {events
                .filter((e) => new Date(e.date) >= today)
                .slice(0, 8)
                .map((ev) => (
                  <EventCard key={ev.id} event={ev} showDate />
                ))}
              {events.filter((e) => new Date(e.date) >= today).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Sin eventos próximos</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Sin eventos en este período</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, showDate }: { event: CalendarEvent; showDate?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: event.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-gray-400">{TYPE_LABEL[event.type] ?? event.type}</span>
          {showDate && (
            <span className="text-[11px] text-gray-400">
              {new Date(event.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
            </span>
          )}
          {event.meta?.amount != null && (
            <span className="text-[11px] font-medium text-gray-600">{fmt(event.meta.amount as number)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
