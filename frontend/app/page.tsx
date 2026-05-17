"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, Star, Scissors, ChevronRight, Link2, SlidersHorizontal, X, Heart, Navigation, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [userCity, setUserCity] = useState<string | null>(null);
  const { toggle, isFavorite } = useFavorites();

  useEffect(() => {
    api.getBarbers().then(setBarbers).finally(() => setLoading(false));
  }, []);

  // Detectar localização do usuário
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=pt`,
            { headers: { "User-Agent": "BarberFlow/1.0" } }
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality;
          if (city) {
            setUserCity(city);
            setSearch(city);
            setLoading(true);
            api.getBarbers(city, {
              service: serviceFilter || undefined,
              minRating: minRating > 0 ? minRating : undefined,
            }).then(setBarbers).finally(() => setLoading(false));
          }
        } catch {
          // fallback silencioso
        } finally {
          setDetectingLocation(false);
        }
      },
      () => setDetectingLocation(false),
      { timeout: 10000 }
    );
  }, [serviceFilter, minRating]);

  function handleSearch(e: React.FormEvent) {
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
    setUserCity(null);
    setLoading(true);
    api.getBarbers().then(setBarbers).finally(() => setLoading(false));
  }

  const hasFilters = serviceFilter || minRating > 0;

  return (
    <div className="min-h-screen w-full bg-zinc-950 overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-8 sm:py-16 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.10)_0%,_transparent_60%)]" />
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-semibold text-amber-400 uppercase tracking-widest">
          <Scissors size={12} /> Plataforma de Agendamento
        </span>
        <h1 className="mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-white leading-tight">
          Seu corte perfeito<br />
          <span className="text-amber-500">a um clique</span>
        </h1>
        <p className="mx-auto mt-3 sm:mt-4 max-w-xl text-sm sm:text-base text-zinc-400 px-2">
          Encontre os melhores barbeiros da sua região e agende sem complicação.
        </p>

        {/* Busca */}
        <form onSubmit={handleSearch} className="mx-auto mt-6 sm:mt-8 max-w-2xl px-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por cidade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-900 py-3 sm:py-3.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 rounded-2xl border px-3 sm:px-4 py-3 sm:py-3.5 text-sm font-bold active:scale-95 transition-transform shrink-0 ${
                  hasFilters
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-white/10 bg-zinc-900 text-zinc-400 hover:border-amber-500/30 hover:text-white"
                }`}
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>
            <div className="flex gap-2 sm:gap-0">
              <button
                type="button"
                onClick={detectLocation}
                disabled={detectingLocation}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-zinc-900 px-3 sm:px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-medium text-zinc-400 hover:border-amber-500/30 hover:text-amber-400 active:scale-95 transition-transform disabled:opacity-50"
              >
                {detectingLocation ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Navigation size={15} />
                )}
                <span className="hidden sm:inline">{detectingLocation ? "Detectando..." : "Minha região"}</span>
              </button>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 sm:px-6 py-3 sm:py-3.5 text-sm font-bold text-black hover:bg-amber-400 active:scale-95 transition-transform flex-1 sm:flex-initial"
              >
                <Search size={16} />
                <span className="sm:hidden">Buscar</span>
                <span className="hidden sm:inline">Buscar</span>
              </button>
            </div>
          </div>

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
                    <div className="flex gap-2 flex-wrap">
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
        </form>
      </section>

      {/* Lista de barbeiros */}
      <section className="mx-auto max-w-6xl px-3 sm:px-6 pb-16">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {search ? `Resultados para "${search}"` : "Barbeiros disponíveis"}
            </h2>
            {userCity && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                <Navigation size={10} />
                {userCity}
              </span>
            )}
          </div>
          <span className="text-xs sm:text-sm text-zinc-500">{barbers.length} encontrado{barbers.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-900">
                <div className="h-44 w-full animate-pulse bg-zinc-800" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-2/3 animate-pulse rounded-lg bg-zinc-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded-lg bg-zinc-800" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 animate-pulse rounded-lg bg-zinc-800" />
                    <div className="h-6 w-20 animate-pulse rounded-lg bg-zinc-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : barbers.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <Scissors size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm sm:text-base">Nenhum barbeiro encontrado nessa região.</p>
            <button onClick={clearFilters} className="mt-3 text-xs text-amber-500 hover:text-amber-400 transition">
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {barbers.map((barber) => (
              <div key={barber.id} className="group">
                <div className="isolate overflow-hidden rounded-3xl border border-white/5 bg-zinc-900 hover:border-amber-500/40 transition-colors">
                  <Link href={`/barber/${barber.slug}`} className="block" prefetch={false}>
                    {/* Capa */}
                    <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-zinc-800">
                      {barber.coverUrl ? (
                        <Image
                          src={barber.coverUrl}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          alt={barber.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Scissors size={40} className="text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                    </div>

                    {/* Avatar com margem negativa */}
                    {barber.avatarUrl ? (
                      <div className="relative -mt-10 mb-2 ml-4 z-10">
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-zinc-900 overflow-hidden shadow-lg shadow-black/40">
                          <Image
                            src={barber.avatarUrl}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                            alt={barber.name}
                            loading="lazy"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative -mt-10 mb-2 ml-4 z-10">
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-zinc-900 bg-zinc-800 flex items-center justify-center shadow-lg shadow-black/40">
                          <span className="text-xl sm:text-2xl font-bold text-amber-500">
                            {barber.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )}
                  </Link>

                  <div className="p-4 pt-1">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/barber/${barber.slug}`} className="flex-1 min-w-0" prefetch={false}>
                        <h3 className="truncate font-bold text-white group-hover:text-amber-400 transition-colors text-sm sm:text-base">{barber.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 truncate">
                          <MapPin size={11} className="shrink-0" /> {barber.location || "Localização não informada"}
                        </p>
                      </Link>
                      <div className="flex shrink-0 items-center gap-2">
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
                            className="text-zinc-500 hover:text-pink-400 transition hidden sm:block"
                          >
                            <Link2 size={16} />
                          </a>
                        )}
                      </div>
                    </div>

                    {barber.services.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {barber.services.slice(0, 2).map((s) => (
                          <span key={s.id} className="rounded-lg bg-zinc-800 px-2 py-1 text-[11px] sm:text-xs text-zinc-400">
                            {s.name} · {brl(s.priceInCents)}
                          </span>
                        ))}
                        {barber.services.length > 2 && (
                          <span className="rounded-lg bg-zinc-800/50 px-2 py-1 text-[11px] text-zinc-600">
                            +{barber.services.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star size={12} fill="currentColor" />
                        {barber.averageRating != null
                          ? <span className="text-xs font-semibold">{barber.averageRating.toFixed(1)} ({barber.totalReviews})</span>
                          : <span className="text-xs font-semibold text-zinc-500">Novo</span>
                        }
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                        Agendar <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
