"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import {
  Clock, Check, X, ChevronLeft, ChevronRight, User, Calendar,
  AlertTriangle, ShieldOff, Star, MessageCircle, Loader2,
  CheckCheck, Trash2, ExternalLink, Inbox, Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Appointment, BarberStatus } from "@/types";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pendente",   color: "text-amber-400",  bg: "bg-amber-500/10" },
  confirmed: { label: "Confirmado", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  completed: { label: "Concluído",  color: "text-blue-400",   bg: "bg-blue-500/10" },
  cancelled: { label: "Cancelado",  color: "text-red-400",    bg: "bg-red-500/10" },
  no_show:   { label: "Faltou",     color: "text-zinc-500",   bg: "bg-zinc-500/10" },
};

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

// ─── Slide-over Panel ───────────────────────────────────────────────────────
function SlideOver({
  appointment,
  onClose,
  onConfirm,
  onReject,
}: {
  appointment: any;
  onClose: () => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAppointmentDetails(appointment.id).then(setDetails).catch(() => {}).finally(() => setLoading(false));
  }, [appointment.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-md border-l border-white/5 bg-zinc-900 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-zinc-900/90 backdrop-blur-md px-6 py-4">
          <h2 className="text-lg font-bold text-white">Detalhes da Solicitação</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-zinc-500 hover:bg-white/5 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-amber-500" />
          </div>
        ) : details ? (
          <div className="p-6 space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_CONFIG[details.status]?.bg} ${STATUS_CONFIG[details.status]?.color}`}>
                {STATUS_CONFIG[details.status]?.label}
              </span>
              <span className="text-xs text-zinc-500">{dateLabel(details.startsAt)}</span>
            </div>

            {/* Mini-Ficha do Cliente */}
            <section className="rounded-2xl border border-white/5 bg-zinc-800/50 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <User size={14} className="text-amber-500" /> Ficha do Cliente
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-zinc-500">Nome</p>
                  <p className="text-sm font-medium text-white">{details.clientName}</p>
                </div>
                {details.clientEmail && (
                  <div>
                    <p className="text-xs text-zinc-500">E-mail</p>
                    <p className="text-sm text-zinc-300">{details.clientEmail}</p>
                  </div>
                )}
                {details.client?.user?.email && !details.clientEmail && (
                  <div>
                    <p className="text-xs text-zinc-500">E-mail (cadastro)</p>
                    <p className="text-sm text-zinc-300">{details.client.user.email}</p>
                  </div>
                )}
              </div>

              {/* Histórico do Cliente */}
              {details.clientHistory && (
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Agendamentos anteriores</span>
                    <span className="text-sm font-bold text-white">{details.clientHistory.totalAppointments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Faltas (no-show)</span>
                    <span className={`text-sm font-bold ${details.clientHistory.noShowCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {details.clientHistory.noShowCount}
                    </span>
                  </div>
                  {details.clientHistory.isRecurring && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2">
                      <Star size={14} className="text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-400">Cliente recorrente</span>
                    </div>
                  )}
                  {details.clientHistory.isBlocked && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2">
                      <ShieldOff size={14} className="text-red-400" />
                      <span className="text-xs font-medium text-red-400">Cliente bloqueado</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Serviço */}
            <section className="rounded-2xl border border-white/5 bg-zinc-800/50 p-4 space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Clock size={14} className="text-amber-500" /> Serviço
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{details.service?.name ?? "—"}</span>
                <span className="text-sm font-bold text-amber-400">
                  {details.service ? brl(details.service.priceInCents) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Horário</span>
                <span className="text-sm font-medium text-white">{timeLabel(details.startsAt)}</span>
              </div>
              {details.service && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Duração</span>
                  <span className="text-sm text-zinc-300">{details.service.durationMinutes} min</span>
                </div>
              )}
            </section>

            {/* Ações */}
            {details.status === "pending" && (
              <div className="flex gap-3">
                <button
                  onClick={() => { onConfirm(details.id); onClose(); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 active:scale-95 transition"
                >
                  <Check size={16} /> Confirmar
                </button>
                <button
                  onClick={() => { onReject(details.id); onClose(); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600/80 py-3 text-sm font-bold text-white hover:bg-red-500 active:scale-95 transition"
                >
                  <X size={16} /> Rejeitar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-zinc-500">
            <p>Erro ao carregar detalhes.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Página Principal ───────────────────────────────────────────────────────
export default function SolicitacoesPage() {
  const { barber: authBarber, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<"pending" | "all">("pending");

  useEffect(() => {
    if (!authLoading && !authBarber) router.push("/login");
  }, [authBarber, authLoading, router]);

  const loadData = useCallback(() => {
    if (!authBarber) return;
    api.getDashboard().then((d) => {
      setData(d);
      // Filtra apenas agendamentos futuros
      const now = new Date();
      const future = (d.appointments ?? []).filter((a: Appointment) => new Date(a.startsAt) >= now);
      setData((prev: any) => ({ ...prev, appointments: future }));
    }).finally(() => setLoading(false));
  }, [authBarber]);

  useEffect(() => { loadData(); }, [loadData]);

  // Socket para atualizações em tempo real
  useEffect(() => {
    if (!authBarber) return;
    const socket = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001");
    socket.emit("join:barber", authBarber.id);
    if (authBarber.barbershopId) socket.emit("join:barbershop", authBarber.barbershopId);

    socket.on("booking:new", () => { loadData(); });
    socket.on("booking:rejected", () => { loadData(); });

    return () => { socket.disconnect(); };
  }, [authBarber, loadData]);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(""), 4000);
  }

  async function handleConfirm(id: string) {
    try {
      await api.updateBookingStatus(id, "confirmed");
      showFeedback("Agendamento confirmado!", true);
      loadData();
    } catch { showFeedback("Erro ao confirmar.", false); }
  }

  async function handleReject(id: string) {
    try {
      await api.rejectBooking(id);
      showFeedback("Agendamento rejeitado.", true);
      loadData();
    } catch { showFeedback("Erro ao rejeitar.", false); }
  }

  async function handleBatchConfirm() {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      const result = await api.batchConfirmAppointments(Array.from(selectedIds));
      showFeedback(`${result.updatedCount} agendamento(s) confirmado(s)!`, true);
      setSelectedIds(new Set());
      loadData();
    } catch { showFeedback("Erro ao confirmar em lote.", false); }
    finally { setBatchLoading(false); }
  }

  async function handleCleanupCancelled() {
    try {
      const result = await api.cleanupCancelledAppointments();
      showFeedback(`${result.deletedCount} cancelado(s) antigo(s) removido(s).`, true);
      loadData();
    } catch { showFeedback("Erro ao limpar cancelados.", false); }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectNextPending(count: number) {
    const pending = pendingAppointments();
    const ids = pending.slice(0, count).map((a) => a.id);
    setSelectedIds(new Set(ids));
  }

  function pendingAppointments(): Appointment[] {
    return (data?.appointments ?? []).filter((a: Appointment) => a.status === "pending");
  }

  function allAppointments(): Appointment[] {
    return data?.appointments ?? [];
  }

  const displayAppointments = filterTab === "pending" ? pendingAppointments() : allAppointments();

  // Agrupa por data
  const grouped = displayAppointments.reduce((acc: Record<string, Appointment[]>, a: Appointment) => {
    const key = new Date(a.startsAt).toLocaleDateString("pt-BR");
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, Appointment[]>);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Header />
        <div className="flex items-center justify-center py-40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const pendingCount = pendingAppointments().length;

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden w-full">
      <Header />

      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-medium shadow-xl ${
              feedbackOk ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-over */}
      <AnimatePresence>
        {selectedAppointment && (
          <SlideOver
            appointment={selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
            onConfirm={handleConfirm}
            onReject={handleReject}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-6 w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Central de Solicitações</h1>
          <p className="text-sm text-zinc-500">
            {pendingCount > 0
              ? `${pendingCount} solicitação(ões) pendente(s)`
              : "Nenhuma solicitação pendente"}
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => selectNextPending(3)}
            disabled={pendingCount === 0}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 active:scale-95 transition disabled:opacity-40"
          >
            <CheckCheck size={14} /> Confirmar Próximos 3
          </button>
          <button
            onClick={handleBatchConfirm}
            disabled={selectedIds.size === 0 || batchLoading}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95 transition disabled:opacity-40"
          >
            {batchLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Confirmar Selecionados ({selectedIds.size})
          </button>
          <button
            onClick={handleCleanupCancelled}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:border-red-500/30 hover:text-red-400 active:scale-95 transition"
          >
            <Trash2 size={14} /> Limpar Cancelados
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilterTab("pending")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              filterTab === "pending"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-zinc-800 text-zinc-400 border border-white/5 hover:border-white/20"
            }`}
          >
            Pendentes {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            onClick={() => setFilterTab("all")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              filterTab === "all"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-zinc-800 text-zinc-400 border border-white/5 hover:border-white/20"
            }`}
          >
            Todos
          </button>
        </div>

        {/* Timeline */}
        {displayAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Inbox size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum agendamento encontrado</p>
            <p className="text-sm">Os agendamentos futuros aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([dateKey, apps]) => (
              <div key={dateKey}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-400">
                  <Calendar size={14} className="text-amber-500" />
                  {dateKey}
                  <span className="text-xs text-zinc-600">— {apps.length} agendamento(s)</span>
                </h3>
                <div className="relative space-y-2 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-white/5">
                  {apps.map((a: Appointment) => {
                    const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pending;
                    const isPending = a.status === "pending";
                    const isSelected = selectedIds.has(a.id);

                    return (
                      <motion.div
                        key={a.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative rounded-2xl border p-4 cursor-pointer transition-all ${
                          isSelected
                            ? "border-amber-500/40 bg-amber-500/5"
                            : isPending
                            ? "border-amber-500/20 bg-zinc-900 hover:border-amber-500/30 animate-pulse-soft"
                            : "border-white/5 bg-zinc-900/50 hover:border-white/10"
                        }`}
                        onClick={() => {
                          if (isPending) toggleSelect(a.id);
                          setSelectedAppointment(a);
                        }}
                      >
                        {/* Timeline dot */}
                        <div className={`absolute -left-[18px] top-5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-950 ${
                          isPending ? "bg-amber-400" : cfg.color.replace("text-", "bg-")
                        }`} />

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white truncate">{a.clientName}</span>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {timeLabel(a.startsAt)}
                              </span>
                              {a.service && (
                                <span>{a.service.name}</span>
                              )}
                            </div>
                          </div>

                          {/* Checkbox para seleção (apenas pendentes) */}
                          {isPending && (
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                              isSelected ? "border-amber-500 bg-amber-500" : "border-white/20"
                            }`}>
                              {isSelected && <Check size={12} className="text-black" />}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
