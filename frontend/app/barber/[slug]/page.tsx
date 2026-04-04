import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, Link2, Phone, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { ServiceList } from "@/presentation/components/ServiceList";
import { BookingCalendar } from "@/presentation/components/BookingCalendar";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function BarberPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let barber;
  try {
    barber = await api.getBarber(slug);
  } catch {
    notFound();
  }

  const today = new Date().toISOString().split("T")[0];
  const slots = await api.getSlots(barber.id, today).catch(() => []);
  const firstService = barber.services[0];

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

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
          <div className="pb-1">
            <h1 className="text-2xl font-black text-white">{barber.name}</h1>
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
                <span className="flex items-center gap-1"><Phone size={13} />{barber.phone}</span>
              )}
            </div>
          </div>
        </div>

        {barber.bio && (
          <p className="mb-8 text-sm leading-relaxed text-zinc-400">{barber.bio}</p>
        )}

        {/* Galeria */}
        {barber.gallery.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">Galeria</h2>
            <div className="grid grid-cols-3 gap-2">
              {barber.gallery.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-800">
                  <Image src={img.url} fill sizes="(max-width: 672px) 33vw, 224px" className="object-cover hover:scale-105 transition" alt={img.caption || "Corte"} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Serviços e agendamento */}
        <div className="rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-xl mb-12">
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
                    </div>
                  ))}
              </div>
            </div>
          )}

          {firstService && (
            <>
              <div className="border-t border-white/5" />
              <BookingCalendar
                barberId={barber.id}
                serviceId={firstService.id}
                priceInCents={firstService.priceInCents}
                initialSlots={slots}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
