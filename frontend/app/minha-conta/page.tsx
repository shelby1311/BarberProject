"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Star, X, CheckCircle2, Clock, Scissors, AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Appointment, AppointmentStatus } from "@/types";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

const STATUS_LABELS: Record<AppointmentStatus, { label: string; color: string }> = {
  pending:   { label: "Pendente",   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  confirmed: { label: "Confirmado", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  completed: { label: "Finalizado", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  cancelled: { label: "Cancelado",  color: "text-red-400 bg-red-400/10 border-red-400/20" },
  no_show:   { label: "Faltou",     color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20" },
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition"
        >
          <Star
            size={24}
            className={(hover || value) >= i ? "text-amber-400" : "text-zinc-700"}
            fill={(hover || value) >= i ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}

// Retorna true se ainda é possível cancelar (faltam mais de 2h)
function canCancelNow(startsAt: string) {
  return new Date(startsAt).getTime() - Date.now() > 2 * 60 * 60 * 1000;
}

export default function MinhaContaPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de avaliação
  const [reviewModal, setReviewModal] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal de cancelamento
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");

  useEffect(() => {
    if (!authLoading && (!user || role !== "client")) router.push("/login");
  }, [user, role, authLoading, router]);

  useEffect(() => {
    if (!user || role !== "client") return;
    api.getMyBookings()
      .then(setAppointments)
      .finally(() => setLoading(false));
  }, [user, role]);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  // Reagendamento inteligente: salva serviceId + barberId no localStorage e redireciona
  function handleReschedule(a: Appointment) {
    if (!a.barber || !a.service) return;
    localStorage.setItem(
      "pending_booking",
      JSON.stringify({ serviceId: a.service.id, date: new Date().toISOString(), slot: "" })
    );
    router.push(`/barber/${a.barber.slug}`);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.cancelBooking(cancelTarget.id);
      setAppointments((prev) =>
        prev.map((a) => a.id === cancelTarget.id ? { ...a, status: "cancelled" } : a)
      );
      showFeedback("Agendamento cancelado com sucesso.", true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      showFeedback(e?.message ?? "Erro ao cancelar agendamento.", false);
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  }

  async function handleReview() {
    if (!reviewModal || rating === 0) return;
    setSubmitting(true);
    try {
      const review = await api.submitReview(reviewModal.id, { rating, comment });
      setAppointments((prev) =>
        prev.map((a) => a.id === reviewModal.id ? { ...a, review } : a)
      );
      setReviewModal(null);
      setRating(5);
      setComment("");
      showFeedback("Avaliação enviada! Obrigado.", true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      showFeedback(e?.message ?? "Erro ao enviar avaliação.", false);
    } finally {
      setSubmitting(false);
    }
  }

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => new Date(a.startsAt) >= now && a.status !== "cancelled"
  );
  const history = appointments.filter(
    (a) => new Date(a.startsAt) < now || a.status === "cancelled"
  );
  const displayed = tab === "upcoming" ? upcoming : history;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-10 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-900" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

      {/* Modal de avaliação */}
      <AnimatePresence>
        {reviewModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-white">Avaliar atendimento</h3>
                <button onClick={() => setReviewModal(null)} className="text-zinc-500 hover:text-white transition">
                  <X size={18} />
                </button>
              </div>
              <p className="mb-4 text-sm text-zinc-400">
                {reviewModal.service?.name} com{" "}
                <span className="font-semibold text-white">{reviewModal.barber?.name}</span>
              </p>
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold text-zinc-500">Sua nota</p>
                <StarPicker value={rating} onChange={setRating} />
              </div>
              <textarea
                rows={3}
                placeholder="Deixe um comentário (opcional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
              />
              <button
                onClick={handleReview}
                disabled={submitting || rating === 0}
                className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-bold text-black hover:bg-amber-400 transition disabled:opacity-60"
              >
                {submitting ? "Enviando..." : "Enviar avaliação"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmação de cancelamento */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => !cancelling && setCancelTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Cancelar agendamento?</p>
                  <p className="text-xs text-zinc-500">Esta ação não pode ser desfeita.</p>
                </div>
              </div>

              <div className="mb-5 rounded-xl border border-white/5 bg-zinc-800 px-4 py-3 text-sm">
                <p className="font-semibold text-white">{cancelTarget.service?.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {new Date(cancelTarget.startsAt).toLocaleDateString("pt-BR", {
                    weekday: "long", day: "2-digit", month: "long",
                  })}{" "}
                  às{" "}
                  {new Date(cancelTarget.startsAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCancelTarget(null)}
                  disabled={cancelling}
                  className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-zinc-400 hover:text-white transition disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelling}
                  className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-400 transition disabled:opacity-60"
                >
                  {cancelling ? "Cancelando..." : "Confirmar cancelamento"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Minha Conta</h1>
          <p className="text-sm text-zinc-500">Olá, <span className="font-semibold text-zinc-300">{user?.name}</span></p>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
                feedback.ok
                  ? "border-emerald-500/20 bg-emerald-950/40 text-emerald-400"
                  : "border-red-500/20 bg-red-950/40 text-red-400"
              }`}
            >
              {feedback.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {feedback.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 rounded-2xl border border-white/5 bg-zinc-900 p-1">
          {(["upcoming", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                tab === t ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              {t === "upcoming" ? `Próximos (${upcoming.length})` : `Histórico (${history.length})`}
            </button>
          ))}
        </div>

        {displayed.length === 0 ? (
          <div className="py-16 text-center text-zinc-600">
            <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
            <p>{tab === "upcoming" ? "Nenhum agendamento futuro." : "Nenhum histórico ainda."}</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition">
              <Scissors size={14} /> Encontrar barbeiros
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map((a) => {
              const date = new Date(a.startsAt);
              const st = STATUS_LABELS[a.status] ?? STATUS_LABELS.pending;
              const isActive = ["pending", "confirmed"].includes(a.status) && date > now;
              const canCancel = isActive && canCancelNow(a.startsAt);
              const tooLateToCancel = isActive && !canCancelNow(a.startsAt);
              const canReview = a.status === "completed" && !a.review;
              const canReschedule = ["cancelled", "completed", "no_show"].includes(a.status) && !!a.barber;

              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border border-white/5 bg-zinc-900 p-4 transition ${
                    ["cancelled", "no_show"].includes(a.status) ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                        <Scissors size={16} className="text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{a.service?.name ?? "Serviço"}</p>
                        {a.barber && (
                          <Link href={`/barber/${a.barber.slug}`} className="text-xs text-zinc-500 hover:text-amber-400 transition">
                            {a.barber.name}
                          </Link>
                        )}
                      </div>
                    </div>
                    <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} />
                      {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {a.service && (
                      <span className="font-semibold text-amber-400">{brl(a.service.priceInCents)}</span>
                    )}
                  </div>

                  {/* Aviso: janela de cancelamento encerrada */}
                  {tooLateToCancel && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-400">
                      <AlertTriangle size={12} className="shrink-0" />
                      Cancelamento indisponível — faltam menos de 2h para o horário.
                    </div>
                  )}

                  {a.review && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/5 bg-zinc-800/50 px-3 py-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} size={11} className={i <= a.review!.rating ? "text-amber-400" : "text-zinc-700"} fill={i <= a.review!.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                      {a.review.comment && <p className="text-xs text-zinc-500 truncate">{a.review.comment}</p>}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    {canReview && (
                      <button
                        onClick={() => { setReviewModal(a); setRating(5); setComment(""); }}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition"
                      >
                        <Star size={12} /> Avaliar
                      </button>
                    )}
                    {canReschedule && (
                      <button
                        onClick={() => handleReschedule(a)}
                        className="flex items-center gap-1.5 rounded-xl bg-zinc-700/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
                      >
                        <RefreshCw size={12} /> Reagendar
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => setCancelTarget(a)}
                        className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                      >
                        <X size={12} /> Cancelar
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
