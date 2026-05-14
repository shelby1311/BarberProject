"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, Star, Scissors, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useFavorites } from "@/hooks/useFavorites";
import { Barber } from "@/types";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

export default function FavoritosPage() {
  const { favorites, toggle, isFavorite } = useFavorites();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBarbers().then((all) => {
      setBarbers(all.filter((b) => favorites.includes(b.id)));
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <Heart size={20} className="text-amber-500" fill="currentColor" />
          <h1 className="text-2xl font-black text-white">Meus Favoritos</h1>
          <span className="text-sm text-zinc-500">{favorites.length} salvo{favorites.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-900">
                <div className="h-44 w-full animate-pulse bg-zinc-800" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-2/3 animate-pulse rounded-lg bg-zinc-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded-lg bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : barbers.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <Heart size={40} className="mx-auto mb-4 opacity-30" />
            <p className="mb-2">Nenhum barbeiro salvo ainda.</p>
            <Link href="/" className="text-sm text-amber-500 hover:text-amber-400 transition">
              Explorar barbeiros →
            </Link>
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
                <div className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-900 transition hover:border-amber-500/30">
                  <Link href={`/barber/${barber.slug}`} className="block">
                    <div className="relative h-44 w-full bg-zinc-800">
                      {barber.coverUrl ? (
                        <Image src={barber.coverUrl} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" alt={barber.name} />
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
                        <h3 className="font-bold text-white hover:text-amber-400 transition">{barber.name}</h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                          <MapPin size={11} /> {barber.location || "Localização não informada"}
                        </p>
                      </Link>
                      <button
                        onClick={() => toggle(barber.id)}
                        className="text-amber-500 hover:text-zinc-400 transition"
                        aria-label="Remover dos favoritos"
                      >
                        <Heart size={18} fill={isFavorite(barber.id) ? "currentColor" : "none"} />
                      </button>
                    </div>

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
                      <Link href={`/barber/${barber.slug}`} className="flex items-center gap-1 text-xs font-semibold text-amber-500 hover:gap-2 transition-all">
                        Agendar <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
