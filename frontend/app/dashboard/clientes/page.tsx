"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { ClientProfile } from "@/types";
import {
  Search, User, Phone, Mail, Star, AlertTriangle,
  ShieldOff, TrendingUp, Calendar, Clock, Loader2,
  CheckCircle, X, ChevronDown, Filter, Crown
} from "lucide-react";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

const TAG_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  VIP:        { label: "VIP",        color: "text-amber-400", bg: "bg-amber-500/10", icon: <Crown size={12} /> },
  Recorrente: { label: "Recorrente", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: <CheckCircle size={12} /> },
  Risco:      { label: "Risco",      color: "text-red-400",    bg: "bg-red-500/10",    icon: <AlertTriangle size={12} /> },
  Bloqueado:  { label: "Bloqueado",  color: "text-zinc-500",   bg: "bg-zinc-500/10",   icon: <ShieldOff size={12} /> },
  "Alto Gasto": { label: "Alto Gasto", color: "text-purple-400", bg: "bg-purple-500/10", icon: <TrendingUp size={12} /> },
};

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getClients()
      .then(setClients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = clients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q)
      );
    }
    if (tagFilter) {
      list = list.filter((c) => c.tags.includes(tagFilter));
    }
    return list;
  }, [clients, search, tagFilter]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [clients]);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-6 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30">
              <User size={20} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Clientes</h1>
              <p className="text-sm text-zinc-500">
                {clients.length} cliente{clients.length !== 1 ? "s" : ""} cadastrado{clients.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full rounded-xl border border-white/10 bg-zinc-800/50 pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40 transition"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setTagFilter(null)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                tagFilter === null
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                  : "border-white/10 text-zinc-500 hover:border-white/20"
              }`}
            >
              Todos
            </button>
            {allTags.map((tag) => {
              const cfg = TAG_CONFIG[tag];
              return (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition flex items-center gap-1 ${
                    tagFilter === tag
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-white/10 text-zinc-500 hover:border-white/20"
                  }`}
                >
                  {cfg?.icon}
                  {cfg?.label ?? tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-zinc-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <User size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm">Clientes aparecerão aqui após realizarem agendamentos</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client) => (
              <motion.div
                key={client.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedClient(client)}
                className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-5 hover:border-amber-500/20 transition cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 text-sm font-bold">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{client.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {client.tags.map((tag) => {
                        const cfg = TAG_CONFIG[tag];
                        return cfg ? (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-0.5 rounded-full ${cfg.bg} px-1.5 py-0.5 text-[10px] font-medium ${cfg.color}`}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} />
                        {client.totalAppointments} agendamento{client.totalAppointments !== 1 ? "s" : ""}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={11} />
                        Total: {brl(client.totalSpentInCents)}
                      </div>
                      {client.lastVisit && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} />
                          Última visita: {new Date(client.lastVisit).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Slide-over do cliente */}
        <AnimatePresence>
          {selectedClient && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40"
                onClick={() => setSelectedClient(null)}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-full w-full max-w-md z-50 border-l border-white/5 bg-zinc-900 shadow-2xl overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white">Detalhes do Cliente</h2>
                    <button
                      onClick={() => setSelectedClient(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Avatar e nome */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 text-xl font-bold">
                      {selectedClient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{selectedClient.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedClient.tags.map((tag) => {
                          const cfg = TAG_CONFIG[tag];
                          return cfg ? (
                            <span
                              key={tag}
                              className={`inline-flex items-center gap-0.5 rounded-full ${cfg.bg} px-2 py-0.5 text-xs font-medium ${cfg.color}`}
                            >
                              {cfg.icon}
                              {cfg.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="space-y-3 mb-6">
                    {selectedClient.email && (
                      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-800/40 px-3 py-2.5">
                        <Mail size={15} className="text-zinc-500" />
                        <span className="text-sm text-zinc-300">{selectedClient.email}</span>
                      </div>
                    )}
                    {selectedClient.phone && (
                      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-800/40 px-3 py-2.5">
                        <Phone size={15} className="text-zinc-500" />
                        <span className="text-sm text-zinc-300">{selectedClient.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-2xl border border-white/5 bg-zinc-800/40 p-3 text-center">
                      <p className="text-2xl font-bold text-white">{selectedClient.totalAppointments}</p>
                      <p className="text-xs text-zinc-500">Agendamentos</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-zinc-800/40 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-400">{brl(selectedClient.totalSpentInCents)}</p>
                      <p className="text-xs text-zinc-500">Total gasto</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-zinc-800/40 p-3 text-center">
                      <p className="text-2xl font-bold text-amber-400">{selectedClient.points}</p>
                      <p className="text-xs text-zinc-500">Pontos fidelidade</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-zinc-800/40 p-3 text-center">
                      <p className="text-2xl font-bold text-red-400">{selectedClient.noShowCount}</p>
                      <p className="text-xs text-zinc-500">Faltas</p>
                    </div>
                  </div>

                  {/* Status */}
                  {selectedClient.isBlocked && (
                    <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-950/10 px-4 py-3 text-sm text-red-400">
                      <ShieldOff size={16} />
                      Cliente bloqueado
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
