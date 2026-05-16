"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LoyaltyReward } from "@/types";
import {
  Gift, Plus, Trash2, Star, Award, Loader2, X,
  CheckCircle, AlertCircle, Coins, Zap
} from "lucide-react";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

export default function FidelidadePage() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Novo reward
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsCost, setPointsCost] = useState(0);
  const [saving, setSaving] = useState(false);

  function showFeedback(ok: boolean, msg: string) {
    setFeedback({ ok, msg });
    setTimeout(() => setFeedback(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const data = await api.getLoyaltyRewards();
      setRewards(data);
    } catch {
      showFeedback(false, "Erro ao carregar recompensas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || pointsCost < 1) return;
    setSaving(true);
    try {
      const r = await api.addLoyaltyReward({ name: name.trim(), description: description.trim(), pointsCost });
      setRewards((prev) => [...prev, r]);
      setName("");
      setDescription("");
      setPointsCost(0);
      setShowForm(false);
      showFeedback(true, "Recompensa criada com sucesso!");
    } catch {
      showFeedback(false, "Erro ao criar recompensa");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteLoyaltyReward(id);
      setRewards((prev) => prev.filter((r) => r.id !== id));
      showFeedback(true, "Recompensa removida");
    } catch {
      showFeedback(false, "Erro ao remover recompensa");
    }
  }

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
              <Award size={20} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Programa de Fidelidade</h1>
              <p className="text-sm text-zinc-500">Gerencie recompensas para seus clientes</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancelar" : "Nova Recompensa"}
          </button>
        </div>

        {/* Formulário */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAdd}
              className="overflow-hidden mb-6"
            >
              <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-zinc-900 to-amber-950/10 p-4 sm:p-6 space-y-4">
                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  <Gift size={16} />
                  Nova Recompensa
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Nome da recompensa</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Corte VIP Grátis"
                      className="w-full rounded-xl border border-white/10 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Custo em pontos</label>
                    <input
                      type="number"
                      min={1}
                      value={pointsCost}
                      onChange={(e) => setPointsCost(Number(e.target.value))}
                      placeholder="100"
                      className="w-full rounded-xl border border-white/10 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40 transition"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Descrição <span className="text-zinc-600">(opcional)</span></label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva os detalhes da recompensa..."
                    rows={2}
                    className="w-full rounded-xl border border-white/10 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40 transition resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || !name.trim() || pointsCost < 1}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    Criar Recompensa
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Lista de Recompensas */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-zinc-600" />
          </div>
        ) : rewards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Gift size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhuma recompensa cadastrada</p>
            <p className="text-sm">Crie recompensas para engajar seus clientes</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rewards.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-5 hover:border-amber-500/20 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{r.name}</h3>
                    {r.description && (
                      <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{r.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                        <Coins size={12} />
                        {r.pointsCost} pontos
                      </div>
                      <span className={`text-xs ${r.active ? "text-emerald-400" : "text-zinc-600"}`}>
                        {r.active ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Como funciona */}
        <section className="mt-8 rounded-3xl border border-white/5 bg-zinc-900/30 p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-4">
            <Zap size={15} />
            Como funciona
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="rounded-2xl border border-white/5 bg-zinc-800/40 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-2">
                <Star size={16} />
              </div>
              <p className="font-medium text-white">Acumule Pontos</p>
              <p className="text-zinc-500 text-xs mt-1">Clientes ganham 1 ponto a cada R$1 gasto em serviços</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-zinc-800/40 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-2">
                <Gift size={16} />
              </div>
              <p className="font-medium text-white">Resgate</p>
              <p className="text-zinc-500 text-xs mt-1">Clientes trocam pontos por recompensas no app</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-zinc-800/40 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-2">
                <Award size={16} />
              </div>
              <p className="font-medium text-white">Fidelize</p>
              <p className="text-zinc-500 text-xs mt-1">Aumente a retenção e incentive visitas recorrentes</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
