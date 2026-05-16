"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Crown, Shield, Clock, Users, CreditCard, Check, AlertTriangle,
  ChevronDown, ArrowUpRight, Calendar, FileText, Download, Zap,
  Star, Sparkles, BarChart3, RefreshCw, CheckCircle2, XCircle,
  Hourglass, TrendingUp, UserPlus, Building2
} from "lucide-react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Barber, Barbershop, SubscriptionPlan } from "@/types";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

const PLAN_LABELS: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  ESSENTIAL: { label: "ESSENTIAL", color: "text-zinc-400", icon: Shield },
  PRO: { label: "PRO", color: "text-amber-500", icon: Crown },
  ELITE: { label: "ELITE", color: "text-purple-400", icon: Star },
};

const PLAN_FEATURES: Record<string, string[]> = {
  ESSENTIAL: [
    "Perfil público com vitrine",
    "Agenda online com agendamento",
    "Gerenciamento de serviços",
    "1 barbeiro",
  ],
  PRO: [
    "Tudo do ESSENTIAL",
    "Até 5 barbeiros na equipe",
    "Fila de espera (até 15 clientes)",
    "Status em tempo real",
    "Central de Solicitações",
    "Relatórios financeiros",
  ],
  ELITE: [
    "Tudo do PRO",
    "Até 15 barbeiros na equipe",
    "Fila de espera ilimitada",
    "Métricas avançadas",
    "Suporte prioritário",
    "Personalização completa da vitrine",
  ],
};

interface StaffMember {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string;
  status: string;
}

interface Invoice {
  id: string;
  planType: string;
  amountInCents: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string;
}

export default function AssinaturaPage() {
  const { barber: authBarber, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<(Barber & { barbershop: Barbershop }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!authLoading && !authBarber) router.push("/login");
  }, [authBarber, authLoading, router]);

  useEffect(() => {
    if (!authBarber) return;
    Promise.all([
      api.getDashboard(),
      api.getSubscriptionPlans(),
      api.getStaff().catch(() => [] as any),
    ])
      .then(([d, p, s]) => {
        setData(d as any);
        setPlans(p);
        setStaff(s as StaffMember[]);
      })
      .finally(() => setLoading(false));
  }, [authBarber]);

  const barbershop = data?.barbershop;
  const currentPlan = barbershop?.plan ?? "ESSENTIAL";
  const planExpiration = useMemo(
    () => (barbershop?.planExpiration ? new Date(barbershop.planExpiration) : null),
    [barbershop?.planExpiration]
  );
  const maxBarbers = barbershop?.maxBarbers ?? 1;
  const staffCount = staff.length + 1; // +1 for the owner

  // Countdown
  const timeLeft = useMemo(() => {
    if (!planExpiration) return null;
    const now = new Date();
    const diff = planExpiration.getTime() - now.getTime();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, totalHours: 0, expired: true };
    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, totalHours, expired: false };
  }, [planExpiration]);

  // Progresso circular do countdown (30 dias = 100%)
  const countdownProgress = useMemo(() => {
    if (!planExpiration || !barbershop?.createdAt) return 100;
    const created = new Date(barbershop.createdAt);
    const total = planExpiration.getTime() - created.getTime();
    const elapsed = Date.now() - created.getTime();
    const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    return Math.round(pct);
  }, [planExpiration, barbershop?.createdAt]);

  // Histórico de faturas (simulado com base no plano atual)
  const invoices: Invoice[] = useMemo(() => {
    if (!barbershop) return [];
    const list: Invoice[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const plan = plans.find((p) => p.planType === currentPlan);
      list.push({
        id: `inv-${i}`,
        planType: currentPlan,
        amountInCents: plan?.priceInCents ?? 0,
        status: i === 0 ? "pending" : "paid",
        createdAt: d.toISOString(),
        paidAt: i === 0 ? null : d.toISOString(),
        expiresAt: new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString(),
      });
    }
    return list;
  }, [barbershop, currentPlan, plans]);

  async function handleSubscribe(planType: string) {
    setSubscribing(true);
    try {
      const result = await api.subscribe(planType);
      setFeedback({ ok: true, msg: `Plano alterado para ${planType} com sucesso!` });
      setShowUpgrade(false);
      // Recarrega dados
      const d = await api.getDashboard();
      setData(d as any);
    } catch (err: any) {
      setFeedback({ ok: false, msg: err?.message ?? "Erro ao alterar plano" });
    } finally {
      setSubscribing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

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

  const PlanIcon = PLAN_LABELS[currentPlan]?.icon ?? Shield;
  const planColor = PLAN_LABELS[currentPlan]?.color ?? "text-zinc-400";

  // SVG circular progress
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (countdownProgress / 100) * circumference;

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden w-full">
      <Header />

      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed top-20 right-4 z-50">
          <div className={`rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md flex items-center gap-3 ${
            feedback.ok
              ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-300"
              : "border-red-500/30 bg-red-950/80 text-red-300"
          }`}>
            {feedback.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span className="text-sm font-medium">{feedback.msg}</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-6 w-full">
        {/* Cabeçalho */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Crown className="text-amber-500" size={24} />
              Portal da Assinatura
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Gerencie seu plano, equipe e ciclo de faturamento
            </p>
          </div>
          <button
            onClick={() => setShowUpgrade(!showUpgrade)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400 transition active:scale-95"
          >
            <Zap size={15} />
            {showUpgrade ? "Fechar" : "Gerenciar Plano"}
          </button>
        </div>

        <div className="grid gap-6">
          {/* ─── Card do Plano Atual + Countdown ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plano Atual */}
            <div className="lg:col-span-2 rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <PlanIcon size={20} className={planColor} />
                    <span className={`text-lg font-black ${planColor}`}>
                      {PLAN_LABELS[currentPlan]?.label ?? currentPlan}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {barbershop?.name ?? "Barbearia"} &middot; {barbershop?.planStatus === "ACTIVE" ? "Ativo" : "Inativo"}
                  </p>
                </div>
                {barbershop?.planStatus === "ACTIVE" && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 size={12} />
                    Ativo
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/5 bg-zinc-800/50 px-4 py-3">
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <Users size={12} /> Limite de Barbeiros
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {staffCount} / {maxBarbers}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-zinc-800/50 px-4 py-3">
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <Calendar size={12} /> Expira em
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {planExpiration
                      ? planExpiration.toLocaleDateString("pt-BR")
                      : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-zinc-800/50 px-4 py-3">
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <CreditCard size={12} /> Valor Mensal
                  </p>
                  <p className="mt-1 text-lg font-bold text-amber-400">
                    {plans.find((p) => p.planType === currentPlan)?.priceInCents
                      ? brl(plans.find((p) => p.planType === currentPlan)!.priceInCents)
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Countdown Circular */}
            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-6 flex flex-col items-center justify-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1.5">
                <Hourglass size={13} className="text-amber-500" /> Tempo Restante
              </p>
              <div className="relative flex items-center justify-center">
                <svg width="130" height="130" className="-rotate-90">
                  <circle
                    cx="65" cy="65" r={radius}
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="8"
                  />
                  <circle
                    cx="65" cy="65" r={radius}
                    fill="none"
                    stroke={timeLeft?.expired ? "#ef4444" : "#D4AF37"}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {timeLeft?.expired ? (
                    <>
                      <span className="text-xl font-black text-red-400">Expirado</span>
                      <span className="text-xs text-zinc-500">Renove agora</span>
                    </>
                  ) : timeLeft ? (
                    <>
                      <span className="text-2xl font-black text-white">{timeLeft.days}</span>
                      <span className="text-xs text-zinc-500">dias restantes</span>
                    </>
                  ) : (
                    <span className="text-sm text-zinc-600">—</span>
                  )}
                </div>
              </div>
              {timeLeft && !timeLeft.expired && (
                <p className="mt-2 text-xs text-zinc-600">
                  {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
                </p>
              )}
            </div>
          </div>

          {/* ─── Upgrade / Troca de Plano ─── */}
          {showUpgrade && (
            <section className="rounded-3xl border border-amber-500/20 bg-amber-950/10 p-4 sm:p-6">
              <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
                <Sparkles size={16} className="text-amber-500" /> Escolha seu Plano
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const isCurrent = plan.planType === currentPlan;
                  const isUpgrade =
                    (plan.planType === "PRO" && currentPlan === "ESSENTIAL") ||
                    (plan.planType === "ELITE" && (currentPlan === "ESSENTIAL" || currentPlan === "PRO"));
                  const Icon = PLAN_LABELS[plan.planType]?.icon ?? Shield;
                  const color = PLAN_LABELS[plan.planType]?.color ?? "text-zinc-400";
                  const features = PLAN_FEATURES[plan.planType] ?? [];

                  return (
                    <div
                      key={plan.planType}
                      className={`rounded-2xl border p-5 transition ${
                        isCurrent
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-white/5 bg-zinc-900/50 hover:border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Icon size={18} className={color} />
                        <span className={`font-bold ${color}`}>{plan.planType}</span>
                        {isCurrent && (
                          <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
                            Atual
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-black text-white mb-1">
                        {brl(plan.priceInCents)}
                        <span className="text-xs font-normal text-zinc-500">/mês</span>
                      </p>
                      <p className="text-xs text-zinc-500 mb-4">
                        Até {plan.maxStaff} barbeiros
                      </p>
                      <ul className="mb-5 flex flex-col gap-1.5">
                        {features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                            <Check size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {!isCurrent && (
                        <button
                          onClick={() => handleSubscribe(plan.planType)}
                          disabled={subscribing}
                          className={`w-full rounded-xl py-2.5 text-sm font-bold transition active:scale-95 ${
                            isUpgrade
                              ? "bg-amber-500 text-black hover:bg-amber-400"
                              : "border border-white/10 text-zinc-300 hover:border-amber-500/40"
                          } disabled:opacity-60`}
                        >
                          {subscribing && selectedPlan === plan.planType
                            ? "Alterando..."
                            : isUpgrade
                            ? "Fazer Upgrade"
                            : "Escolher Plano"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ─── Gerenciamento de Assentos (Staff) ─── */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="flex items-center gap-2 font-bold text-white">
                <Users size={16} className="text-amber-500" /> Equipe & Assentos
              </h2>
              <span className="text-xs text-zinc-500">
                {staffCount} / {maxBarbers} ocupados
              </span>
            </div>

            {/* Barra de progresso de ocupação */}
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs text-zinc-600 mb-1.5">
                <span>Ocupação do plano</span>
                <span>{Math.round((staffCount / maxBarbers) * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    staffCount >= maxBarbers
                      ? "bg-red-500"
                      : staffCount >= maxBarbers * 0.8
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, (staffCount / maxBarbers) * 100)}%` }}
                />
              </div>
            </div>

            {/* Lista da equipe */}
            <div className="flex flex-col gap-2">
              {/* Dono (sempre presente) */}
              <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
                    {data.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white flex items-center gap-1.5">
                      {data.name}
                      <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                        Dono
                      </span>
                    </p>
                    <p className="text-xs text-zinc-600">Comissão: {data.commissionPct}%</p>
                  </div>
                </div>
                <Building2 size={16} className="text-amber-500/60" />
              </div>

              {/* Membros da equipe */}
              {staff.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-zinc-600">
                  <UserPlus size={28} className="mb-2 opacity-50" />
                  <p className="text-sm">Nenhum membro na equipe ainda</p>
                  {currentPlan !== "ESSENTIAL" && (
                    <p className="text-xs text-zinc-700 mt-1">
                      Convide barbeiros para ocupar os assentos disponíveis
                    </p>
                  )}
                </div>
              ) : (
                staff.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-800/50 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-white">{m.name}</p>
                        <p className="text-xs text-zinc-600">@{m.slug}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      m.status === "AVAILABLE"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : m.status === "BUSY"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-zinc-500/10 text-zinc-400"
                    }`}>
                      {m.status === "AVAILABLE" ? "Disponível"
                        : m.status === "BUSY" ? "Ocupado"
                        : m.status === "BREAK" ? "Pausa"
                        : "Offline"}
                    </span>
                  </div>
                ))
              )}
            </div>

            {currentPlan === "ESSENTIAL" && (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4 flex items-start gap-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Plano ESSENTIAL</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Faça upgrade para PRO ou ELITE para adicionar barbeiros à sua equipe e desbloquear fila de espera e métricas avançadas.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ─── Histórico de Faturas ─── */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-4 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
              <FileText size={16} className="text-amber-500" /> Histórico de Faturas
            </h2>

            {invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
                <FileText size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Nenhuma fatura encontrada</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-800/50 px-4 py-3 hover:border-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        inv.status === "paid"
                          ? "bg-emerald-500/10"
                          : "bg-amber-500/10"
                      }`}>
                        {inv.status === "paid"
                          ? <CheckCircle2 size={16} className="text-emerald-400" />
                          : <Clock size={16} className="text-amber-400" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {PLAN_LABELS[inv.planType]?.label ?? inv.planType} &middot; {brl(inv.amountInCents)}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {new Date(inv.createdAt).toLocaleDateString("pt-BR", {
                            month: "long", year: "numeric",
                          })}
                          {inv.paidAt && (
                            <> &middot; Pago em {new Date(inv.paidAt).toLocaleDateString("pt-BR")}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        inv.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {inv.status === "paid" ? "Pago" : "Pendente"}
                      </span>
                      <button className="rounded-lg border border-white/5 p-1.5 text-zinc-600 hover:text-zinc-300 hover:border-white/10 transition">
                        <Download size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ─── Comparativo de Planos ─── */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
              <BarChart3 size={16} className="text-amber-500" /> Comparativo de Planos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-3 px-2 text-zinc-500 font-medium">Funcionalidade</th>
                    {plans.map((p) => (
                      <th key={p.planType} className={`text-center py-3 px-2 font-bold ${
                        p.planType === currentPlan ? "text-amber-400" : "text-zinc-400"
                      }`}>
                        {p.planType}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Perfil público", e: true, p: true, el: true },
                    { label: "Agenda online", e: true, p: true, el: true },
                    { label: "Serviços ilimitados", e: true, p: true, el: true },
                    { label: "Galeria de fotos", e: true, p: true, el: true },
                    { label: "Barbeiros na equipe", e: "1", p: "Até 5", el: "Até 15" },
                    { label: "Fila de espera", e: "—", p: "15 clientes", el: "Ilimitada" },
                    { label: "Status em tempo real", e: "—", p: true, el: true },
                    { label: "Central de Solicitações", e: "—", p: true, el: true },
                    { label: "Relatórios financeiros", e: "—", p: true, el: true },
                    { label: "Métricas avançadas", e: "—", p: "—", el: true },
                    { label: "Suporte prioritário", e: "—", p: "—", el: true },
                    { label: "Vitrine personalizada", e: "—", p: "—", el: true },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-white/5 last:border-0">
                      <td className="py-3 px-2 text-zinc-300">{row.label}</td>
                      {([row.e, row.p, row.el] as const).map((val, i) => (
                        <td key={i} className="text-center py-3 px-2">
                          {val === true ? (
                            <Check size={14} className="mx-auto text-emerald-500" />
                          ) : val === "—" ? (
                            <span className="text-zinc-700">—</span>
                          ) : (
                            <span className="text-xs text-zinc-400">{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
