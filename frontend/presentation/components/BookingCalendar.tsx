"use client";

import { useState, useMemo } from "react";
import { CalendarDays, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

const fmt = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const fmtDate = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

function nextDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

interface Props {
  barberId: string;
  serviceId: string;
  priceInCents: number;
  initialSlots: string[];
}

export function BookingCalendar({ barberId, serviceId, priceInCents, initialSlots }: Props) {
  const days = useMemo(() => nextDays(7), []);
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [slots, setSlots] = useState<Date[]>(initialSlots.map((s) => new Date(s)));
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [clientName, setClientName] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function handleDaySelect(day: Date) {
    setSelectedDay(day);
    setSelectedSlot(null);
    setFeedback(null);
    setLoading(true);
    const dateStr = day.toISOString().split("T")[0];
    api.getSlots(barberId, dateStr)
      .then((raw) => setSlots(raw.map((s) => new Date(s))))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }

  function handleConfirm() {
    if (!selectedSlot || !clientName.trim()) return;
    setFeedback(null);
    setLoading(true);
    const slotCopy = selectedSlot;
    api.createBooking({
      barberId,
      serviceId,
      clientName: clientName.trim(),
      startTime: slotCopy.toISOString(),
      useOnlineDiscount: true,
    }).then((result) => {
      if (result.success) {
        setFeedback({ type: "success", message: `Agendado para as ${fmt(slotCopy)}! ✓` });
        setSelectedSlot(null);
        setClientName("");
        const dateStr = selectedDay.toISOString().split("T")[0];
        api.getSlots(barberId, dateStr)
          .then((raw) => setSlots(raw.map((s) => new Date(s))))
          .catch(() => {});
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    }).catch(() => {
      setFeedback({ type: "error", message: "Erro ao confirmar agendamento." });
    }).finally(() => setLoading(false));
  }

  return (
    <div className="px-6 pb-12">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-widest">
        <CalendarDays size={14} className="text-amber-500" /> Agendar
      </h2>

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${
            feedback.type === "error"
              ? "bg-red-950/40 text-red-400 border-red-500/20"
              : "bg-emerald-950/40 text-emerald-400 border-emerald-500/20"
          }`}
        >
          {feedback.type === "error"
            ? <AlertCircle size={16} className="mt-0.5 shrink-0" />
            : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
          {feedback.message}
        </motion.div>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => (
          <button
            key={d.toISOString()}
            onClick={() => handleDaySelect(d)}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition border ${
              d.getTime() === selectedDay.getTime()
                ? "bg-amber-500 text-black border-amber-500 font-bold"
                : "bg-zinc-900/40 text-zinc-400 border-white/5 hover:border-amber-500/30 hover:text-white"
            }`}
          >
            {fmtDate(d)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : slots.length === 0 ? (
        <p className="text-sm text-zinc-600">Nenhum horário disponível neste dia.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => (
            <button
              key={s.toISOString()}
              onClick={() => { setSelectedSlot(s); setFeedback(null); }}
              className={`flex items-center justify-center gap-1 rounded-xl border py-2.5 text-sm font-medium transition ${
                selectedSlot?.getTime() === s.getTime()
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-white/5 bg-zinc-900/40 text-zinc-400 hover:border-amber-500/30 hover:text-white"
              }`}
            >
              <Clock size={12} />
              {fmt(s)}
            </button>
          ))}
        </div>
      )}

      {selectedSlot && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex flex-col gap-3"
        >
          <input
            type="text"
            placeholder="Seu nome"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
          />
          <button
            onClick={handleConfirm}
            disabled={loading || !clientName.trim()}
            className="w-full rounded-2xl bg-amber-500 py-3.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition disabled:opacity-60"
          >
            {loading ? "Confirmando..." : `Confirmar às ${fmt(selectedSlot)}`}
          </button>
        </motion.div>
      )}
    </div>
  );
}
