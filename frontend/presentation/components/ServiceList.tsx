'use client';
import { motion } from 'framer-motion';
import { Clock, DollarSign } from 'lucide-react';
import { Service } from '@/types';

const brl = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export function ServiceListSkeleton() {
  return (
    <div className="px-4 py-6">
      <div className="mb-4 h-4 w-32 animate-pulse rounded-lg bg-zinc-800" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}

export function ServiceList({ services }: { services: ReadonlyArray<Service> }) {
  return (
    <div className="px-4 py-6">
      <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
        <DollarSign size={13} className="text-amber-500 shrink-0" /> Tabela de Preços
      </h2>

      <div className="flex flex-col gap-2">
        {services.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/5 bg-zinc-900 px-4 py-3"
          >
            {/* Linha 1: nome */}
            <p className="text-sm font-semibold text-white">{s.name}</p>
            {/* Linha 2: duração + preço */}
            <div className="mt-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock size={11} className="shrink-0" />
                {s.durationMinutes} min
              </span>
              <span className="text-sm font-black text-amber-400">
                {brl(s.priceInCents)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
