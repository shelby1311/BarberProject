"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Appointment } from "@/types";
import {
  Inbox, Check, X, User, Calendar, Clock,
  Loader2, CheckCheck, Trash2, AlertCircle, CheckCircle
} from "lucide-react";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function CaixaDeEntradaPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; priceInCents: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  function showFeedback(ok: boolean, msg: string) {
    setFeedback({ ok, msg });
    setTimeout(() => setFeedback(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const d = await api.getDashboard();
      setAppointments(d.appointments ?? []);
      setServices(d.services ?? []);
    } catch {
      showFeedback(false, "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const pendingAppointments = useCallback(
    () => appointments.filter((a) => a.status === "pending" && new Date(a.startsAt) >= new Date()),
    [appointments]
  );

  const historyAppointments = useCallback(
    () => appointments.filter((a) => a.status !== "pending" || new Date(a.startsAt) < new Date()),
    [appointments]
  );

  async function handleConfirm(id: string) {
    try {
      await api.updateBookingStatus(id, "confirmed");
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "confirmed" } : a)));
      showFeedback(true, "Agendamento confirmado!");
    } catch {
      showFeedback(false, "Erro ao confirmar");
    }
  }

  async function handleReject(id: string) {
    setRejecting(id);
    try {
      await api.rejectBooking(id);
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
      showFeedback(true, "Agendamento rejeitado");
    } catch {
      showFeedback(false, "Erro ao rejeitar");
    } finally {
      setRejecting(null);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBatchConfirm() {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      await api.batchConfirmAppointments(Array.from(selectedIds));
      setAppointments((prev) =>
        prev.map((a) => (selectedIds.has(a.id) ? { ...a, status: "confirmed" } : a))
      );
      setSelectedIds(new Set());
      showFeedback(true, `${selectedIds.size} agendamento(s) confirmado(s)!`);
    } catch {
      showFeedback(false, "Erro ao confirmar em lote");
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleCleanup() {
    try {
      await api.cleanupCancelledAppointments();
      setAppointments((prev) => prev.filter((a) => a.status !== "cancelled"));
      showFeedback(true, "Agendamentos cancelados removidos");
    } catch {
      showFeedback(false, "Erro ao limpar");
    }
  }

  const pending = pendingAppointments();
  const history = historyAppointments();

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <div className="mx-auto max-w-4xl px-3 sm:px-6 py-6 w-full">
        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`mb-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
                feedback.ok
                  ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                  : "border-red-500/30 bg-red-950/20 text-red-400"
              }`}
            >
              {feedback.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {feedback.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30">
              <Inbox size={20} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Caixa de Entrada</h1>
              <p className="text-sm text-zinc-500">
                {pending.length} agendamento{pending.length !== 1 ? "s" : ""} pendente{pending.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchConfirm}
                disabled={batchLoading}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition disabled:opacity-50"
              >
                {batchLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
                Confirmar {selectedIds.size}
              </button>
            )}
            <button
              onClick={handleCleanup}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:border-red-500/30 hover:text-red-400 transition"
            >
              <Trash2 size={14} />
              Limpar cancelados
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-zinc-600" />
          </div>
        ) : (
          <>
            {/* Pendentes */}
            <section className="mb-8">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-3">
                <Clock size={14} />
                Pendentes
                {pending.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-black">
                    {pending.length}
                  </span>
                )}
              </h2>

              {pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600 rounded-3xl border border-white/5 bg-zinc-900/30">
                  <Inbox size={40} className="mb-3 opacity-30" />
                  <p className="font-medium">Nenhum agendamento pendente</p>
                  <p className="text-sm">Todos os agendamentos foram processados</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {pending.map((a) => {
                    const service = services.find((s) => s.id === a.serviceId);
                    const isSelected = selectedIds.has(a.id);
                    return (
                      <motion.div
                        key={a.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl border transition ${
                          isSelected
                            ? "border-amber-500/40 bg-amber-500/10"
                            : "border-white/5 bg-zinc-900/50 hover:border-amber-500/20"
                        }`}
                      >
                        <div className="flex items-center gap-3 px-4 py-3">
                          <button
                            onClick={() => toggleSelect(a.id)}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                              isSelected
                                ? "border-amber-500 bg-amber-500 text-black"
                                : "border-white/10 hover:border-amber-500/40"
                            }`}
                          >
                            {isSelected && <Check size={12} />}
                          </button>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                            <User size={15} className="text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{a.clientName}</p>
                            <p className="text-xs text-zinc-500">{service?.name ?? "Serviço"}</p>
                            <p className="text-xs text-zinc-500">
                              {dateLabel(a.startsAt)} às {timeLabel(a.startsAt)}
                              {service && <> &middot; {brl(service.priceInCents)}</>}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => handleConfirm(a.id)}
                              className="flex items-center gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-transform"
                            >
                              <Check size={13} /> Confirmar
                            </button>
                            <button
                              onClick={() => handleReject(a.id)}
                              disabled={rejecting === a.id}
                              className="flex items-center gap-1 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 active:scale-95 transition-transform disabled:opacity-60"
                            >
                              <X size={13} /> {rejecting === a.id ? "..." : "Rejeitar"}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Histórico */}
            <section>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-3">
                <Calendar size={14} />
                Histórico
              </h2>

              {history.length === 0 ? (
                <p className="text-sm text-zinc-600 py-8 text-center">Nenhum agendamento no histórico.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {history.map((a) => {
                    const service = services.find((s) => s.id === a.serviceId);
                    const statusColors: Record<string, string> = {
                      confirmed: "text-emerald-400",
                      completed: "text-blue-400",
                      cancelled: "text-red-400",
                      no_show: "text-zinc-500",
                    };
                    const statusLabels: Record<string, string> = {
                      confirmed: "Confirmado",
                      completed: "Concluído",
                      cancelled: "Cancelado",
                      no_show: "Faltou",
                    };
                    return (
                      <div
                        key={a.id}
                        className="rounded-2xl border border-white/5 bg-zinc-900/30 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
                            <User size={15} className="text-zinc-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{a.clientName}</p>
                            <p className="text-xs text-zinc-500">{service?.name ?? "Serviço"}</p>
                            <p className="text-xs text-zinc-600">
                              {dateLabel(a.startsAt)} às {timeLabel(a.startsAt)}
                            </p>
                          </div>
                          <span className={`text-xs font-medium ${statusColors[a.status] ?? "text-zinc-500"}`}>
                            {statusLabels[a.status] ?? a.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
