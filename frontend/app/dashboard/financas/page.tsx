"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign, TrendingUp, TrendingDown, BarChart2, Users, Percent,
  Plus, Trash2, Download, PieChart, ArrowUpRight, ArrowDownRight,
  CreditCard, Banknote, Receipt, CalendarRange, Filter, ChevronDown,
  SplitSquareHorizontal, FileSpreadsheet, RefreshCw
} from "lucide-react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Barber, Expense, MonthlyMetric } from "@/types";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart as RePieChart, Pie, Cell, Legend
} from "recharts";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const PIE_COLORS = ["#D4AF37", "#34d399", "#f87171", "#60a5fa", "#a78bfa", "#fbbf24"];

export default function FinancasDashboardPage() {
  const { barber: authBarber, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState({
    description: "", amount: "", date: now.toISOString().split("T")[0],
  });
  const [savingExpense, setSavingExpense] = useState(false);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetric[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  useEffect(() => {
    if (!authLoading && !authBarber) router.push("/login");
  }, [authBarber, authLoading, router]);

  useEffect(() => {
    if (!authBarber) return;
    api.getDashboard().then(setData).finally(() => setLoading(false));
    api.getExpenses(selectedMonth).then(setExpenses).catch(() => {});
    api.getMonthlyMetrics().then(setMonthlyMetrics).catch(() => {});
  }, [authBarber, selectedMonth]);

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
      setNewExpense({ description: "", amount: "", date: now.toISOString().split("T")[0] });
      setShowExpenseForm(false);
    } finally {
      setSavingExpense(false);
    }
  }

  async function removeExpense(id: string) {
    await api.deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const url = api.exportAgenda(selectedMonth);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financeiro-${selectedMonth}.csv`;
      a.click();
    } finally {
      setTimeout(() => setExporting(false), 1000);
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

  const revenue = data.metrics?.monthlyRevenueInCents ?? 0;
  const totalExpenses = expenses.reduce((s, e) => s + e.amountInCents, 0);
  const net = revenue - totalExpenses;
  const commission = (data as Barber & { commissionPct?: number }).commissionPct ?? 0;
  const commissionAmount = Math.round(revenue * (commission / 100));
  const ownerPart = revenue - commissionAmount;
  const netAfterCommission = net - commissionAmount;
  const netAfterCommissionAbs = Math.abs(netAfterCommission);

  // Dados para gráfico de pizza (distribuição)
  const pieData = [
    { name: "Sua Comissão", value: commissionAmount, color: "#D4AF37" },
    { name: "Parte do Dono", value: ownerPart, color: "#34d399" },
  ];
  if (totalExpenses > 0) {
    pieData.push({ name: "Despesas", value: totalExpenses, color: "#f87171" });
  }

  // Categorias de despesa (simuladas pelo description)
  const expenseCategories = (() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      const cat = e.description.split(" ")[0];
      map.set(cat, (map.get(cat) ?? 0) + e.amountInCents);
    });
    return Array.from(map.entries()).map(([name, value], i) => ({
      name,
      value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  })();

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split("-");
    return `${MONTHS[parseInt(m) - 1]} ${y}`;
  })();

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden w-full">
      <Header />
      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-6 w-full">
        {/* Cabeçalho */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <BarChart2 className="text-amber-500" size={24} />
              Centro de Inteligência Financeira
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Análise completa de faturamento, comissões e despesas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 pr-8 text-sm text-white focus:border-amber-500/50 focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const val = d.toISOString().slice(0, 7);
                  const lbl = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
                  return <option key={val} value={val}>{lbl}</option>;
                })}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-amber-500/40 hover:text-white transition disabled:opacity-50"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>
        </div>

        <div className="grid gap-6">
          {/* ─── KPI Cards ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Faturamento</p>
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-400">{brl(revenue)}</p>
              <p className="mt-1 text-xs text-zinc-600">{monthLabel}</p>
            </div>
            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Despesas</p>
                <TrendingDown size={16} className="text-red-400" />
              </div>
              <p className="mt-2 text-2xl font-black text-red-400">{brl(totalExpenses)}</p>
              <p className="mt-1 text-xs text-zinc-600">{expenses.length} lançamentos</p>
            </div>
            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Saldo Líquido</p>
                {net >= 0 ? <ArrowUpRight size={16} className="text-emerald-400" /> : <ArrowDownRight size={16} className="text-red-400" />}
              </div>
              <p className={`mt-2 text-2xl font-black ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {brl(Math.abs(net))}
              </p>
              <p className="mt-1 text-xs text-zinc-600">{net >= 0 ? "positivo" : "negativo"}</p>
            </div>
            <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-zinc-900 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Clientes</p>
                <Users size={16} className="text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-white">{data.metrics?.totalCompleted ?? 0}</p>
              <p className="mt-1 text-xs text-zinc-600">atendimentos concluídos</p>
            </div>
          </div>

          {/* ─── Gráfico 6 meses ─── */}
          {monthlyMetrics.length > 0 && (
            <section className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-6">
              <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
                <TrendingUp size={16} className="text-amber-500" /> Faturamento vs Despesas (6 meses)
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyMetrics} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
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
                    formatter={(value: any, name: any) => [brl(Number(value) || 0), name === "revenue" ? "Faturamento" : "Despesas"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} fill="url(#gradRev)" dot={false} />
                  <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#gradExp)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center gap-4 justify-end">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="h-2 w-4 rounded-full bg-emerald-400" />Faturamento
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="h-2 w-4 rounded-full bg-red-400" />Despesas
                </span>
              </div>
            </section>
          )}

          {/* ─── Grid: Comissão + Gráfico Pizza ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calculadora de Ganhos / Split */}
            <section className="rounded-3xl border border-amber-500/20 bg-amber-950/10 p-4 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
                <SplitSquareHorizontal size={16} className="text-amber-500" /> Split de Comissão
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-2xl border border-white/5 bg-zinc-900 px-4 py-3">
                  <p className="text-xs text-zinc-500">Faturamento Total</p>
                  <p className="mt-1 text-lg font-bold text-white">{brl(revenue)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">Sua Comissão ({commission}%)</p>
                    <Percent size={14} className="text-emerald-400" />
                  </div>
                  <p className="mt-1 text-lg font-bold text-emerald-400">{brl(commissionAmount)}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">Parte da Barbearia</p>
                    <Banknote size={14} className="text-amber-400" />
                  </div>
                  <p className="mt-1 text-lg font-bold text-amber-400">{brl(ownerPart)}</p>
                </div>
                <div className={`rounded-2xl border px-4 py-3 ${netAfterCommission >= 0 ? "border-emerald-500/10 bg-zinc-900" : "border-red-500/10 bg-red-950/20"}`}>
                  <p className="text-xs text-zinc-500">Seu Líquido (comissão - despesas)</p>
                  <p className={`mt-1 text-lg font-bold ${netAfterCommission >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {netAfterCommission >= 0 ? "" : "-"}{brl(netAfterCommissionAbs)}
                  </p>
                </div>
              </div>
            </section>

            {/* Gráfico Pizza - Distribuição */}
            <section className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
                <PieChart size={16} className="text-amber-500" /> Distribuição Financeira
              </h2>
              {revenue > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <RePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12, fontSize: 12 }}
                      formatter={(value: any) => brl(Number(value) || 0) as any}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
                      formatter={(value: string) => <span style={{ color: "#a1a1aa" }}>{value}</span>}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[240px] text-zinc-600 text-sm">
                  Nenhum dado financeiro neste mês
                </div>
              )}
            </section>
          </div>

          {/* ─── Gráfico de Barras: Categorias de Despesa ─── */}
          {expenseCategories.length > 0 && (
            <section className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-6">
              <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
                <Receipt size={16} className="text-amber-500" /> Despesas por Categoria
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={expenseCategories} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12, fontSize: 12 }}
                    formatter={(value: any) => brl(Number(value) || 0) as any}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {expenseCategories.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* ─── Fluxo de Caixa ─── */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="flex items-center gap-2 font-bold text-white">
                <DollarSign size={16} className="text-amber-500" /> Fluxo de Caixa
              </h2>
              <button
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition"
              >
                <Plus size={13} />
                Nova Despesa
              </button>
            </div>
            <p className="mb-5 text-xs text-zinc-500">{monthLabel}</p>

            {/* Mini resumo */}
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

            {/* Formulário de nova despesa */}
            {showExpenseForm && (
              <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4">
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
                      className="flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-400 active:scale-95 transition-transform disabled:opacity-60"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de despesas */}
            {expenses.length > 0 ? (
              <div className="flex flex-col gap-2">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-800 px-4 py-2.5 hover:border-red-500/20 transition">
                    <div>
                      <p className="text-sm text-white">{e.description}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR")}
                      </p>
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
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
                <Receipt size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Nenhuma despesa lançada neste mês</p>
              </div>
            )}
          </section>

          {/* ─── Top Serviços ─── */}
          {data.metrics && data.metrics.topServices.length > 0 && (
            <section className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
                <BarChart2 size={16} className="text-amber-500" /> Top Serviços
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.metrics.topServices.map((s, i) => (
                  <div key={s.name} className="rounded-2xl border border-white/5 bg-zinc-800/50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-400">
                        {i + 1}
                      </span>
                      <span className="text-sm text-white">{s.name}</span>
                    </div>
                    <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">
                      {s.count}x
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
