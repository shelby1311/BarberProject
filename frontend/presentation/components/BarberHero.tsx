'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MapPin, Wifi, WifiOff, Coffee, Briefcase, Clock } from 'lucide-react';
import { BarberStatus } from '@/types';

interface Props {
  coverUrl: string;
  avatarUrl: string;
  name: string;
  location: string;
  bio: string;
  status?: BarberStatus;
  queueCount?: number;
  estimatedEnd?: string | null;
}

const STATUS_CONFIG: Record<BarberStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  AVAILABLE: {
    label: 'Disponível',
    icon: <Wifi size={12} />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  BUSY: {
    label: 'Ocupado',
    icon: <Briefcase size={12} />,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
  },
  BREAK: {
    label: 'Em pausa',
    icon: <Coffee size={12} />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  OFFLINE: {
    label: 'Offline',
    icon: <WifiOff size={12} />,
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10 border-zinc-500/30',
  },
};

export function BarberHero({ coverUrl, avatarUrl, name, location, bio, status, queueCount, estimatedEnd }: Props) {
  const cfg = status ? STATUS_CONFIG[status] : null;

  return (
    <section className="relative h-[65vh] w-full overflow-hidden flex items-end">
      <div className="absolute inset-0 z-0">
        {coverUrl ? (
          <Image src={coverUrl} fill className="object-cover scale-105" alt="Barbershop" priority />
        ) : (
          <div className="h-full w-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
      </div>

      <div className="w-full px-6 pb-10 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col md:flex-row items-center md:items-end gap-6"
        >
          <div className="relative group shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative h-36 w-36 rounded-full border-2 border-white/10 overflow-hidden shadow-2xl bg-zinc-800">
              {avatarUrl ? (
                <Image src={avatarUrl} fill className="object-cover" alt={name} />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl font-black text-zinc-600">
                  {name[0]}
                </div>
              )}
            </div>
          </div>

          <div className="text-center md:text-left">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-amber-500 font-medium tracking-widest uppercase text-xs"
            >
              Barbeiro de Elite
            </motion.span>
            <h1 className="text-4xl md:text-5xl font-black text-white mt-1 tracking-tighter">
              {name}
            </h1>
            <p className="mt-1 flex items-center justify-center md:justify-start gap-1 text-zinc-400 text-sm">
              <MapPin size={13} />
              {location}
            </p>

            {/* ─── Live Badge de Status ─────────────────────────────── */}
            {cfg && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${status === 'AVAILABLE' ? 'bg-emerald-400' : status === 'BUSY' ? 'bg-red-400' : status === 'BREAK' ? 'bg-amber-400' : 'bg-zinc-400'}`} />
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${status === 'AVAILABLE' ? 'bg-emerald-400' : status === 'BUSY' ? 'bg-red-400' : status === 'BREAK' ? 'bg-amber-400' : 'bg-zinc-400'}`} />
                  </span>
                  {cfg.icon}
                  {cfg.label}
                </span>

                {/* Fila de espera */}
                {typeof queueCount === 'number' && queueCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                    <Clock size={12} />
                    {queueCount} na fila
                  </span>
                )}

                {/* Tempo estimado de término */}
                {estimatedEnd && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-500/20 bg-zinc-500/10 px-3 py-1 text-xs font-semibold text-zinc-400">
                    <Clock size={12} />
                    Livre ~{new Date(estimatedEnd).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}

            <p className="text-zinc-400 mt-3 max-w-lg text-sm leading-relaxed">{bio}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
