"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { WeeklySlot } from "@/types";
import {
  ChevronLeft, ChevronRight, Calendar, Clock,
  CheckCircle, XCircle, AlertCircle, Loader2,
  User, Scissors
} from "lucide-react";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const SLOT_STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  available: { label: "Disponível", color: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
  booked:    { label: "Agendado",   color: "text-amber-400",  bg: "bg-amber-500/10",  dot: "bg-amber-400" },
  blocked:   { label: "Bloqueado",  color: "text-red-400",    bg: "bg-red-500/10",    dot: "bg-red-400" },
  past:      { label: "Passado",    color: "text-zinc-600",   bg: "bg-zinc-500/10",   dot: "bg-zinc-600" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function AgendaPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [schedule, setSchedule] = useState<WeeklySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<WeeklySlot["slots"][0] | null>(null);

  const weekDays = useMemo(() => {
    const start = new Date(weekStart + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getWeeklySchedule(weekStart);
      setSchedule(data);
    } catch {
      console.error("Erro ao carregar agenda");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  function prevWeek() {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() - 7);
    setWeekStart(getWeekStart(d));
    setSelectedDay(null);
    setSelectedSlot(null);
  }

  function nextWeek() {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() + 7);
    setWeekStart(getWeekStart(d));
    setSelectedDay(null);
    setSelectedSlot(null);
  }

  function goToday() {
    setWeekStart(getWeekStart(new Date()));
    setSelectedDay(null);
    setSelectedSlot(null);
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Agrupar slots por dia
  const daySlots = useMemo(() => {
    const map = new Map<number, WeeklySlot["slots"]>();
    schedule.forEach((day) => {
      map.set(day.dayOfWeek, day.slots);
    });
    return map;
  }, [schedule]);

  const selectedDaySlots = selectedDay !== null ? daySlots.get(selectedDay) ?? [] : [];

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-6 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30">
              <Calendar size={20} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Grade de Horários</h1>
              <p className="text-sm text-zinc-500">Visualização semanal da agenda</p>
            </div>
          </div>
          <button
            onClick={goToday}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:border-amber-500/40 hover:text-white transition"
          >
            Hoje
          </button>
        </div>

        {/* Navegação Semanal */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevWeek} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:border-amber-500/40 hover:text-white transition">
            <ChevronLeft size={16} />
            Semana anterior
          </button>
          <span className="text-sm font-medium text-zinc-300">
            {formatDate(weekDays[0].toISOString())} — {formatDate(weekDays[6].toISOString())}
          </span>
          <button onClick={nextWeek} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:border-amber-500/40 hover:text-white transition">
            Próxima semana
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Grid Semanal */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-zinc-600" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2 mb-6">
            {weekDays.map((day, i) => {
              const dateStr = day.toISOString().split("T")[0];
              const isToday = dateStr === todayStr;
              const slots = daySlots.get(i) ?? [];
              const bookedCount = slots.filter((s) => s.status === "booked").length;
              const availableCount = slots.filter((s) => s.status === "available").length;
              const isSelected = selectedDay === i;

              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedDay(isSelected ? null : i)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? "border-amber-500/40 bg-amber-500/10"
                      : isToday
                      ? "border-amber-500/20 bg-zinc-800/60"
                      : "border-white/5 bg-zinc-900/50 hover:border-white/10"
                  }`}
                >
                  <p className={`text-xs font-medium mb-1 ${isToday ? "text-amber-400" : "text-zinc-500"}`}>
                    {DAY_LABELS[i]}
                  </p>
                  <p className={`text-lg font-bold ${isToday ? "text-white" : "text-zinc-300"}`}>
                    {day.getDate()}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {bookedCount > 0 && (
                      <span className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                        {bookedCount} agend.
                      </span>
                    )}
                    {availableCount > 0 && (
                      <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                        {availableCount} disp.
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Slots do Dia Selecionado */}
        <AnimatePresence mode="wait">
          {selectedDay !== null && (
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-amber-400" />
                <h2 className="text-lg font-semibold text-white">
                  {DAY_FULL[selectedDay]} — {formatDate(weekDays[selectedDay].toISOString())}
                </h2>
              </div>

              {selectedDaySlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600 rounded-3xl border border-white/5 bg-zinc-900/30">
                  <Clock size={40} className="mb-3 opacity-30" />
                  <p className="font-medium">Nenhum horário disponível neste dia</p>
                  <p className="text-sm">Configure os horários de funcionamento no painel</p>
                </div>
              ) : (
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {selectedDaySlots.map((slot, idx) => {
                    const cfg = SLOT_STATUS[slot.status] ?? SLOT_STATUS.past;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.01 }}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-xl border ${cfg.bg} p-3 cursor-pointer hover:scale-[1.02] transition`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-white">{slot.time}</span>
                          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        </div>
                        <span className={`text-[11px] ${cfg.color}`}>{cfg.label}</span>
                        {slot.status === "booked" && slot.clientName && (
                          <div className="mt-1.5 flex items-center gap-1 text-xs text-zinc-400">
                            <User size={11} />
                            <span className="truncate">{slot.clientName}</span>
                          </div>
                        )}
                        {slot.status === "booked" && slot.serviceName && (
                          <div className="flex items-center gap-1 text-xs text-zinc-500">
                            <Scissors size={11} />
                            <span className="truncate">{slot.serviceName}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legenda */}
        <section className="mt-8 rounded-3xl border border-white/5 bg-zinc-900/30 p-4">
          <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
            {Object.entries(SLOT_STATUS).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${val.dot}`} />
                {val.label}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
