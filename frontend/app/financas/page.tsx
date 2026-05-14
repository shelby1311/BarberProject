"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, TrendingUp, TrendingDown, BarChart2, Users, Percent, Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Barber, Expense, MonthlyMetric } from "@/types";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

export default function FinancasPage() {
  const { barber: authBarber, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const [savingExpense, setSavingExpense] = useState(false);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetric[]>([]);

  useEffect(() => {
    if (!authLoading && !authBarber) router.push("/login");
  }, [authBarber, authLoading, router]);

  useEffect(() => {
    if (!authBarber) return;
    api.getDashboard().then(setData).finally(() => setLoading(false));
    api.getExpenses(currentMonth).then(setExpenses).catch(() => {});
    api.getMonthlyMetrics().then(setMonthlyMetrics).catch(() => {});
  }, [authBarber, currentMonth]);

  async function addExpense() {
    if (!newExpense.description || !newExpense.amount || !newExpense.date) return;
    setSavingExpense(true);
    try {
      const expense = await api.addExpense({
        description: newExpense.description,
        amountInCents: Math.round(parseFloat(newExpense.amount) * 100),
        date: newExpense.date,
      });
      setExpenses((prev) => [expense, ...prev]);
      setNewExpense({ description: "", amount: "", date: new Date().toISOString().split("T")[0] });
    } finally {
      setSavingExpense(false);
    }
  }

  async function removeExpense(id: string) {
    await api.deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
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

  const revenue = data.metrics?.monthlyRevenueInCents ?? 0;
  const totalExpenses = expenses.reduce((s, e) => s + e.amountInCents, 0);
  const net = revenue - totalExpenses;
  const commission = (data as Barber & { commissionPct?: number }).commissionPct;

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden w-full">
      <Header />
      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-6 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Finanças</h1>
          <p className="text-sm text-zinc-500">Acompanhe seu faturamento e despesas</p>
        </div>

        <div className="grid gap-6">
          {/* Visão Geral do Mês */}
          {data.metrics && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
                <BarChart2 size={16} className="text-amber-500" /> Visão Geral do Mês
              </h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md p-5 col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Faturamento Mensal</p>
                  <p className="mt-2 text-3xl font-black text-emerald-400">{brl(data.metrics.monthlyRevenueInCents)}</p>
                  {data.metrics.topServices.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs text-zinc-600">Top Serviços</p>
                      <div className="flex flex-col gap-1.5">
                        {data.metrics.topServices.slice(0, 3).map((s) => (
                          <div key={s.name} className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">{s.name}</span>
                            <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">{s.count}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Clientes</p>
                  <div className="mt-2 flex items-end gap-2">
                    <p className="text-3xl font-black text-white">{data.metrics.totalCompleted}</p>
                    <Users size={18} className="mb-1 text-zinc-600" />
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">atendimentos concluídos</p>
                </div>
                <div className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Avaliação</p>
                  <div className="mt-2 flex items-end gap-2">
                    <p className="text-3xl font-black text-amber-400">
                      {data.metrics.averageRating != null ? data.metrics.averageRating.toFixed(1) : "—"}
                    </p>
                    <span className="mb-1 text-xs text-zinc-600">/ 5.0</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{data.metrics.totalReviews} avaliações</p>
                </div>
              </div>
            </section>
          )}

          {/* Gráfico 6 meses */}
          {monthlyMetrics.length > 0 && (
            <section className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-6">
              <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
                <TrendingUp size={16} className="text-amber-500" /> Faturamento vs Despesas (6 meses)
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyMetrics} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "#a1a1aa" }}
                    formatter={(value: number, name: string) => [brl(value), name === "revenue" ? "Faturamento" : "Despesas"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} fill="url(#gradRevenue)" dot={false} />
                  <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#gradExpenses)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center gap-4 justify-end">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="h-2 w-4 rounded-full bg-emerald-400" />Faturamento</span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="h-2 w-4 rounded-full bg-red-400" />Despesas</span>
              </div>
            </section>
          )}

          {/* Calculadora de Ganhos */}
          {commission != null && (
            <section className="rounded-3xl border border-amber-500/20 bg-amber-950/10 p-4 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
                <Percent size={16} className="text-amber-500" /> Calculadora de Ganhos
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/5 bg-zinc-900 px-4 py-3">
                  <p className="text-xs text-zinc-500">Faturamento Total</p>
                  <p className="mt-1 text-base font-bold text-white">{brl(revenue)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 px-4 py-3">
                  <p className="text-xs text-zinc-500">Minha parte ({commission}%)</p>
                  <p className="mt-1 text-base font-bold text-emerald-400">{brl(Math.round(revenue * (commission / 100)))}</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-zinc-900 px-4 py-3">
                  <p className="text-xs text-zinc-500">Parte do dono</p>
                  <p className="mt-1 text-base font-bold text-zinc-400">{brl(revenue - Math.round(revenue * (commission / 100)))}</p>
                </div>
              </div>
            </section>
          )}

          {/* Fluxo de Caixa */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-4 sm:p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-white">
              <DollarSign size={16} className="text-amber-500" /> Fluxo de Caixa
            </h2>
            <p className="mb-5 text-xs text-zinc-500">{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-zinc-800 px-4 py-3">
                <p className="text-xs text-zinc-500">Faturamento</p>
                <p className="mt-1 text-base font-bold text-emerald-400">{brl(revenue)}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-zinc-800 px-4 py-3">
                <p className="text-xs text-zinc-500">Despesas</p>
                <p className="mt-1 text-base font-bold text-red-400">{brl(totalExpenses)}</p>
              </div>
              <div className={`rounded-2xl border px-4 py-3 ${net >= 0 ? "border-emerald-500/20 bg-emerald-950/30" : "border-red-500/20 bg-red-950/30"}`}>
                <p className="text-xs text-zinc-500">Saldo Líquido</p>
                <p className={`mt-1 text-base font-bold ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {net >= 0 ? <TrendingUp size={14} className="mr-1 inline" /> : <TrendingDown size={14} className="mr-1 inline" />}
                  {brl(Math.abs(net))}
                </p>
              </div>
            </div>

            {expenses.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-800 px-4 py-2.5">
                    <div>
                      <p className="text-sm text-white">{e.description}</p>
                      <p className="text-xs text-zinc-500">{new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-red-400">{brl(e.amountInCents)}</span>
                      <button onClick={() => removeExpense(e.id)} className="text-zinc-600 hover:text-red-400 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <input
                placeholder="Descrição (ex: Aluguel)"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  placeholder="Valor (R$)"
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  inputMode="decimal"
                  className="flex-1 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                />
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="flex-1 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                />
                <button
                  onClick={addExpense}
                  disabled={savingExpense}
                  className="flex items-center gap-1 rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-600 active:scale-95 transition-transform disabled:opacity-60"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
