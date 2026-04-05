"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, Star, Scissors, ChevronRight, Link2, SlidersHorizontal, X, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { Barber } from "@/types";
import { useFavorites } from "@/hooks/useFavorites";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

const SERVICE_TYPES = ["Corte", "Barba", "Degradê", "Navalhado", "Pigmentação", "Sobrancelha"];

export default function HomePage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [serviceFilter, setServiceFilter] = useState("");
  const [minRating, setMinRating] = useState(0);
  const { toggle, isFavorite } = useFavorites();

  useEffect(() => {
    api.getBarbers().then(setBarbers).finally(() => setLoading(false));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    api.getBarbers(search, {
      service: serviceFilter || undefined,
      minRating: minRating > 0 ? minRating : undefined,
    }).then(setBarbers).finally(() => setLoading(false));
  }

  function clearFilters() {
    setServiceFilter("");
    setMinRating(0);
    setSearch("");
    setLoading(true);
    api.getBarbers().then(setBarbers).finally(() => setLoading(false));
  }

  const hasFilters = serviceFilter || minRating > 0;

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
          className="mx-auto mt-10 max-w-lg"
        >
          <div className="flex gap-2">
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
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-bold active:scale-95 transition-transform ${
                hasFilters
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-white/10 bg-zinc-900 text-zinc-400 hover:border-amber-500/30 hover:text-white"
              }`}
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-black hover:bg-amber-400 active:scale-95 transition-transform"
            >
              <Search size={16} />
              Buscar
            </button>
          </div>

          {/* Filtros expandidos */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <div className="mb-3">
                    <p className="mb-2 text-xs font-semibold text-zinc-500">Tipo de serviço</p>
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_TYPES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setServiceFilter(serviceFilter === s ? "" : s)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                            serviceFilter === s
                              ? "bg-amber-500 text-black"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-zinc-500">
                      Avaliação mínima: {minRating > 0 ? `${minRating}+ estrelas` : "Qualquer"}
                    </p>
                    <div className="flex gap-2">
                      {[0, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setMinRating(r)}
                          className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                            minRating === r
                              ? "bg-amber-500 text-black"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                          }`}
                        >
                          {r === 0 ? "Todos" : <><Star size={10} fill="currentColor" /> {r}+</>}
                        </button>
                      ))}
                    </div>
                  </div>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-3 flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition"
                    >
                      <X size={12} /> Limpar filtros
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-900">
                <div className="h-44 w-full animate-pulse bg-zinc-800" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-2/3 animate-pulse rounded-lg bg-zinc-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded-lg bg-zinc-800" />
                  <div className="h-3 w-full animate-pulse rounded-lg bg-zinc-800" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 animate-pulse rounded-lg bg-zinc-800" />
                    <div className="h-6 w-20 animate-pulse rounded-lg bg-zinc-800" />
                  </div>
                  <div className="flex justify-between pt-1">
                    <div className="h-4 w-16 animate-pulse rounded-lg bg-zinc-800" />
                    <div className="h-4 w-16 animate-pulse rounded-lg bg-zinc-800" />
                  </div>
                </div>
              </div>
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
                  <div className="amber-glow overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/70 backdrop-blur-md transition hover:border-amber-500/40" style={{ transition: "box-shadow 0.3s, border-color 0.3s" }}>
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.preventDefault(); toggle(barber.id); }}
                            className={`transition ${isFavorite(barber.id) ? "text-amber-500" : "text-zinc-600 hover:text-amber-400"}`}
                            aria-label="Favoritar"
                          >
                            <Heart size={16} fill={isFavorite(barber.id) ? "currentColor" : "none"} />
                          </button>
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
                          {barber.averageRating != null
                            ? <span className="text-xs font-semibold">{barber.averageRating.toFixed(1)} ({barber.totalReviews})</span>
                            : <span className="text-xs font-semibold">Novo</span>
                          }
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
