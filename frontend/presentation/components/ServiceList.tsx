'use client';
import { motion } from 'framer-motion';
import { Clock, DollarSign } from 'lucide-react';
import { Service } from '@/types';

const brl = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export function ServiceListSkeleton() {
  return (
    <div className="px-6 py-8">
      <div className="mb-4 h-4 w-32 animate-pulse rounded-lg bg-zinc-800" />
      <div className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/5 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 bg-zinc-900/40 px-4 py-3.5">
            <div className="h-4 w-28 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-3 w-12 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-4 w-14 animate-pulse rounded-lg bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServiceList({ services }: { services: ReadonlyArray<Service> }) {
  return (
    <div className="px-6 py-8">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-widest">
        <DollarSign size={14} className="text-amber-500" /> Tabela de Preços
      </h2>

      {/* Cabeçalho */}
      <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-4 px-4 text-xs font-semibold uppercase tracking-widest text-zinc-600">
        <span>Serviço</span>
        <span className="text-center">Duração</span>
        <span className="text-right">Preço</span>
      </div>

      <div className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/5 overflow-hidden">
        {services.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-4 bg-zinc-900/40 px-4 py-3.5 hover:bg-zinc-800/60 transition"
          >
            <span className="text-sm font-medium text-white">{s.name}</span>
            <span className="flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap">
              <Clock size={11} /> {s.durationMinutes} min
            </span>
            <span className="text-right text-sm font-black text-amber-400 whitespace-nowrap">{brl(s.priceInCents)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
