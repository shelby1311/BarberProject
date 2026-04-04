"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, Star, Scissors, ChevronRight, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { Barber } from "@/types";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

export default function HomePage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBarbers().then(setBarbers).finally(() => setLoading(false));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    api.getBarbers(search).then(setBarbers).finally(() => setLoading(false));
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.12)_0%,_transparent_60%)]" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400 uppercase tracking-widest">
            <Scissors size={12} /> Plataforma de Agendamento
          </span>
          <h1 className="mt-4 text-5xl font-black tracking-tighter text-white md:text-7xl">
            Seu corte perfeito<br />
            <span className="text-amber-500">a um clique</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
            Encontre os melhores barbeiros da sua região e agende sem complicação.
          </p>
        </motion.div>

        {/* Busca */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-auto mt-10 flex max-w-lg gap-2"
        >
          <div className="relative flex-1">
            <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por cidade... ex: São Paulo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-900 py-3.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-black hover:bg-amber-400 transition"
          >
            <Search size={16} />
            Buscar
          </button>
        </motion.form>
      </section>

      {/* Lista de barbeiros */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {search ? `Resultados para "${search}"` : "Barbeiros disponíveis"}
          </h2>
          <span className="text-sm text-zinc-500">{barbers.length} encontrado{barbers.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-3xl bg-zinc-900" />
            ))}
          </div>
        ) : barbers.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <Scissors size={40} className="mx-auto mb-4 opacity-30" />
            <p>Nenhum barbeiro encontrado nessa região.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((barber, i) => (
              <motion.div
                key={barber.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="group block">
                  <div className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-900 transition hover:border-amber-500/30">
                    {/* Cover */}
                    <Link href={`/barber/${barber.slug}`} className="block">
                    <div className="relative h-44 w-full bg-zinc-800">
                      {barber.coverUrl ? (
                        <Image src={barber.coverUrl} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition group-hover:scale-105" alt={barber.name} />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Scissors size={40} className="text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                    </div>
                    </Link>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/barber/${barber.slug}`} className="flex-1">
                          <h3 className="font-bold text-white group-hover:text-amber-400 transition">{barber.name}</h3>
                          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                            <MapPin size={11} /> {barber.location || "Localização não informada"}
                          </p>
                        </Link>
                        {barber.instagram && (
                          <a
                            href={`https://instagram.com/${barber.instagram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-pink-400 transition"
                          >
                            <Link2 size={16} />
                          </a>
                        )}
                      </div>

                      {barber.bio && (
                        <p className="mt-3 line-clamp-2 text-xs text-zinc-500">{barber.bio}</p>
                      )}

                      {barber.services.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {barber.services.slice(0, 3).map((s) => (
                            <span key={s.id} className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                              {s.name} · {brl(s.priceInCents)}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star size={13} fill="currentColor" />
                          <span className="text-xs font-semibold">Novo</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-500 group-hover:gap-2 transition-all">
                          Agendar <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
