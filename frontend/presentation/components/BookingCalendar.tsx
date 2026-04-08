"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, AlertCircle, CheckCircle2, ChevronRight, QrCode, Scissors } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Service } from "@/types";
import { useAuth } from "@/context/AuthContext";

const fmt = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const fmtDate = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

function nextDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

type Step = "service" | "datetime" | "confirm" | "done";

interface Props {
  barberId: string;
  barberSlug: string;
  services: Service[];
  initialSlots: string[];
  pendingSlot?: Date | null;
  onPendingConsumed?: () => void;
}

export function BookingCalendar({ barberId, barberSlug, services, initialSlots, pendingSlot, onPendingConsumed }: Props) {
  const days = useMemo(() => nextDays(7), []);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [slots, setSlots] = useState<Date[]>(initialSlots.map((s) => new Date(s)));
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [clientName, setClientName] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pixInfo, setPixInfo] = useState<{ key: string; message: string; price: number } | null>(null);

  // Rehydrate pending booking after login redirect
  useEffect(() => {
    if (!pendingSlot || !onPendingConsumed) return;
    const raw = localStorage.getItem("pending_booking");
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { serviceId: string; date: string; slot: string };
      const service = services.find((s) => s.id === pending.serviceId);
      if (!service) return;
      const day = new Date(pending.date);
      day.setHours(0, 0, 0, 0);
      setSelectedService(service);
      setSelectedDay(day);
      setSelectedSlot(pendingSlot);
      setStep("confirm");
      onPendingConsumed();
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSlot]);

  function handleDaySelect(day: Date) {
    setSelectedDay(day);
    setSelectedSlot(null);
    setLoading(true);
    api.getSlots(barberId, day.toISOString().split("T")[0])
      .then((raw) => setSlots(raw.map((s) => new Date(s))))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }

  function handleGoToConfirm(slot?: Date) {
    const activeSlot = slot ?? selectedSlot;
    if (!activeSlot || !selectedService) return;
    if (!user && !authLoading) {
      localStorage.setItem(
        "pending_booking",
        JSON.stringify({
          serviceId: selectedService.id,
          date: selectedDay.toISOString(),
          slot: activeSlot.toISOString(),
        })
      );
      router.push(`/login?callbackUrl=/barber/${barberSlug}&action=finalize`);
      return;
    }
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!selectedSlot || !clientName.trim() || !selectedService) return;
    setFeedback(null);
    setLoading(true);
    try {
      const result = await api.createBooking({
        barberId,
        serviceId: selectedService.id,
        clientName: clientName.trim(),
        startTime: selectedSlot.toISOString(),
        useOnlineDiscount: true,
      });
      if (result.success) {
        setPixInfo({ key: result.pixKey, message: result.pixMessage, price: result.finalPriceInCents });
        setStep("done");
      } else {
        setFeedback({ type: "error", message: result.message ?? "Erro ao confirmar agendamento." });
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Erro ao confirmar agendamento.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  const stepLabels: Record<Step, string> = {
    service: "1. Serviço",
    datetime: "2. Data & Hora",
    confirm: "3. Confirmação",
    done: "✓ Agendado",
  };

  return (
    <div className="px-6 pb-12">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-widest">
        <CalendarDays size={14} className="text-amber-500" /> Agendar
      </h2>

      {/* Steps indicator */}
      {step !== "done" && (
        <div className="mb-6 flex gap-2">
          {(["service", "datetime", "confirm"] as Step[]).map((s) => (
            <div
              key={s}
              className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition ${
                step === s
                  ? "bg-amber-500 text-black"
                  : ["datetime", "confirm"].includes(s) && ["service"].includes(step)
                  ? "bg-zinc-800 text-zinc-600"
                  : step === "confirm" && s === "datetime"
                  ? "bg-zinc-700 text-zinc-400"
                  : "bg-zinc-700 text-zinc-400"
              }`}
            >
              {stepLabels[s]}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: Serviço */}
        {step === "service" && (
          <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <p className="mb-3 text-xs text-zinc-500">Selecione o serviço desejado:</p>
            <div className="flex flex-col gap-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s); setStep("datetime"); }}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition hover:border-amber-500/40 hover:bg-amber-500/5 ${
                    selectedService?.id === s.id ? "border-amber-500 bg-amber-500/10" : "border-white/5 bg-zinc-900/40"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    <p className="text-xs text-zinc-500"><Clock size={10} className="mr-1 inline" />{s.durationMinutes} min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-amber-400">{brl(s.priceInCents)}</span>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 2: Data & Hora */}
        {step === "datetime" && (
          <motion.div key="datetime" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                Serviço: <span className="font-semibold text-amber-400">{selectedService?.name}</span>
              </p>
              <button onClick={() => setStep("service")} className="text-xs text-zinc-500 hover:text-white transition">
                Trocar
              </button>
            </div>

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
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-zinc-800" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-zinc-600">Nenhum horário disponível neste dia.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s.toISOString()}
                    onClick={() => { setSelectedSlot(s); handleGoToConfirm(s); }}
                    className="flex items-center justify-center gap-1 rounded-xl border border-white/5 bg-zinc-900/40 py-2.5 text-sm font-medium text-zinc-400 transition hover:border-amber-500/30 hover:text-white"
                  >
                    <Clock size={12} />
                    {fmt(s)}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 3: Confirmação */}
        {step === "confirm" && selectedSlot && selectedService && (
          <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-400"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {feedback.message}
              </motion.div>
            )}

            <div className="mb-5 rounded-2xl border border-white/5 bg-zinc-900/60 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Resumo do agendamento</p>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Serviço</span>
                  <span className="font-semibold text-white">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Data</span>
                  <span className="font-semibold text-white">{fmtDate(selectedDay)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Horário</span>
                  <span className="font-semibold text-amber-400">{fmt(selectedSlot)}</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2">
                  <span className="text-zinc-400">Total (c/ desconto online)</span>
                  <span className="font-black text-amber-400">{brl(Math.round(selectedService.priceInCents * 0.9))}</span>
                </div>
              </div>
            </div>

            <input
              type="text"
              placeholder="Seu nome completo"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="mb-3 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />

            <div className="mb-4 flex gap-2">
              <button
                onClick={() => { setStep("datetime"); setFeedback(null); }}
                className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-zinc-400 hover:text-white transition"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !clientName.trim()}
                className="flex-1 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition disabled:opacity-60"
              >
                {loading ? "Confirmando..." : "Confirmar agendamento"}
              </button>
            </div>
          </motion.div>
        )}

        {/* DONE: Confirmado + Pix */}
        {step === "done" && pixInfo && selectedSlot && selectedService && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-6 text-center">
              <CheckCircle2 size={40} className="text-emerald-400" />
              <p className="text-lg font-black text-white">Agendamento confirmado!</p>
              <p className="text-sm text-zinc-400">
                {selectedService.name} às <span className="font-bold text-amber-400">{fmt(selectedSlot)}</span> em {fmtDate(selectedDay)}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-400">
                <QrCode size={16} /> Pagamento via Pix (opcional)
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">{pixInfo.message}</p>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2">
                <span className="flex-1 text-xs font-mono text-zinc-300">{pixInfo.key}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(pixInfo.key)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
                >
                  Copiar
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-600">O pagamento no local também é aceito.</p>
            </div>

            <button
              onClick={() => { setStep("service"); setSelectedService(null); setSelectedSlot(null); setClientName(""); setPixInfo(null); }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-zinc-400 hover:text-white transition"
            >
              <Scissors size={14} /> Fazer outro agendamento
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
