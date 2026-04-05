"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, Link2, Phone, Clock, Star, X, ChevronLeft, ChevronRight, Share2, MessageCircle, CalendarCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { ServiceList } from "@/presentation/components/ServiceList";
import { BookingCalendar } from "@/presentation/components/BookingCalendar";
import { api } from "@/lib/api";
import { Barber, Review } from "@/types";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={i <= rating ? "text-amber-400" : "text-zinc-700"}
          fill={i <= rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function Lightbox({ images, index, onClose, onPrev, onNext }: {
  images: { url: string; caption: string }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition">
        <X size={20} />
      </button>
      {index > 0 && (
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition">
          <ChevronLeft size={20} />
        </button>
      )}
      {index < images.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition">
          <ChevronRight size={20} />
        </button>
      )}
      <div className="relative max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image
          src={images[index].url}
          width={800}
          height={800}
          className="max-h-[85vh] w-auto rounded-2xl object-contain"
          alt={images[index].caption || "Corte"}
        />
        {images[index].caption && (
          <p className="mt-2 text-center text-sm text-zinc-400">{images[index].caption}</p>
        )}
        <p className="mt-1 text-center text-xs text-zinc-600">{index + 1} / {images.length}</p>
      </div>
    </motion.div>
  );
}

export default function BarberPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [barber, setBarber] = useState<Barber | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const bookingRef = typeof window !== "undefined" ? null : null;

  function scrollToBooking() {
    document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    Promise.all([
      api.getBarber(slug),
    ]).then(async ([b]) => {
      setBarber(b);
      const today = new Date().toISOString().split("T")[0];
      const s = await api.getSlots(b.id, today).catch(() => []);
      setSlots(s);
    }).catch(() => {
      notFound();
    }).finally(() => setLoading(false));
  }, [slug]);

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Header />
        <div className="flex items-center justify-center py-40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!barber) return null;

  const reviews = barber.reviews ?? [];

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={barber.gallery}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}
            onNext={() => setLightboxIndex((i) => Math.min(barber.gallery.length - 1, (i ?? 0) + 1))}
          />
        )}
      </AnimatePresence>

      {/* Cover */}
      <div className="relative h-64 w-full bg-zinc-900 md:h-80">
        {barber.coverUrl ? (
          <Image src={barber.coverUrl} fill sizes="100vw" className="object-cover" alt={barber.name} priority />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-2xl px-6">
        {/* Info do barbeiro */}
        <div className="-mt-16 mb-8 flex items-end gap-5">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-zinc-950 bg-zinc-800">
            {barber.avatarUrl ? (
              <Image src={barber.avatarUrl} fill sizes="112px" className="object-cover" alt={barber.name} />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl font-black text-zinc-600">
                {barber.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-2xl font-black text-white">{barber.name}</h1>
                {barber.averageRating !== null && barber.averageRating !== undefined && (
                  <div className="mt-1 flex items-center gap-2">
                    <StarRating rating={Math.round(barber.averageRating)} />
                    <span className="text-xs text-zinc-400">
                      {barber.averageRating.toFixed(1)} ({barber.totalReviews} avaliações)
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-amber-500/30 hover:text-white transition"
              >
                <Share2 size={12} />
                {copied ? "Copiado!" : "Compartilhar"}
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              {barber.location && (
                <span className="flex items-center gap-1"><MapPin size={13} />{barber.location}</span>
              )}
              {barber.instagram && (
                <a
                  href={`https://instagram.com/${barber.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-pink-400 transition"
                >
                  <Link2 size={13} />{barber.instagram}
                </a>
              )}
              {barber.phone && (
                <a
                  href={`https://wa.me/55${barber.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${barber.name}, vi seu perfil no BarberFlow e gostaria de agendar um horário!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition"
                >
                  <MessageCircle size={13} />{barber.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {barber.bio && (
          <p className="mb-8 text-sm leading-relaxed text-zinc-400">{barber.bio}</p>
        )}

        {/* Galeria com lightbox */}
        {barber.gallery.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">Galeria</h2>
            <div className="grid grid-cols-3 gap-2">
              {barber.gallery.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setLightboxIndex(i)}
                  className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <Image
                    src={img.url}
                    fill
                    sizes="(max-width: 672px) 33vw, 224px"
                    className="object-cover transition hover:scale-105"
                    alt={img.caption || "Corte"}
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Serviços e agendamento */}
        <div id="booking-section" className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-xl mb-8">
          {barber.services.length > 0 && <ServiceList services={barber.services} />}

          {/* Quadro de horários */}
          {barber.workingHours && barber.workingHours.length > 0 && (
            <div className="border-t border-white/5 px-6 py-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-zinc-400">
                <Clock size={14} className="text-amber-500" /> Horários de Atendimento
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {barber.workingHours
                  .slice()
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                  .map((wh) => (
                    <div key={wh.dayOfWeek} className="rounded-xl border border-white/5 bg-zinc-900 px-4 py-3">
                      <p className="text-xs font-semibold text-amber-400">{DAYS[wh.dayOfWeek]}</p>
                      <p className="mt-0.5 text-sm text-zinc-300">{wh.startTime} – {wh.endTime}</p>
                      {wh.breakStart && wh.breakEnd && (
                        <p className="mt-0.5 text-xs text-zinc-600">Intervalo: {wh.breakStart}–{wh.breakEnd}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {barber.services.length > 0 && (
            <>
              <div className="border-t border-white/5" />
              <BookingCalendar
                barberId={barber.id}
                services={barber.services}
                initialSlots={slots}
              />
            </>
          )}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-zinc-500">
              <Star size={14} className="text-amber-500" fill="currentColor" />
              Avaliações ({reviews.length})
            </h2>
            <div className="flex flex-col gap-3">
              {reviews.map((r: Review) => (
                <div key={r.id} className="rounded-2xl border border-white/5 bg-zinc-900/50 px-5 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-400">
                        {r.client?.user.name?.[0] ?? "?"}
                      </div>
                      <span className="text-sm font-semibold text-white">{r.client?.user.name ?? "Cliente"}</span>
                    </div>
                    <StarRating rating={r.rating} />
                  </div>
                  {r.comment && <p className="text-sm text-zinc-400">{r.comment}</p>}
                  <p className="mt-2 text-xs text-zinc-600">
                    {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botão flutuante — Agendar Agora */}
      {barber.services.length > 0 && (
        <button
          onClick={scrollToBooking}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-sm font-bold text-black shadow-[0_0_24px_rgba(245,158,11,0.4)] hover:shadow-[0_0_32px_rgba(245,158,11,0.6)] active:scale-95 transition-all select-none touch-target"
          style={{ paddingBottom: `calc(0.875rem + env(safe-area-inset-bottom))` }}
        >
          <CalendarCheck size={16} />
          Agendar Agora
        </button>
      )}
    </div>
  );
}
