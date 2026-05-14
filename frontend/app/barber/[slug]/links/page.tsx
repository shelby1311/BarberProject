import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, MessageCircle, MapPin, Instagram, Star } from "lucide-react";
import { ShareButton } from "./ShareButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getBarber(slug: string) {
  const res = await fetch(`${API_URL}/api/barbers/${slug}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const barber = await getBarber(slug);
  if (!barber) return { title: "Barbeiro não encontrado" };
  const description = barber.bio || `Agende seu horário com ${barber.name} pelo BarberFlow.`;
  const image = barber.avatarUrl || null;
  return {
    title: `${barber.name} | BarberFlow`,
    description,
    openGraph: {
      title: `${barber.name} | BarberFlow`,
      description,
      type: "profile",
      ...(image && { images: [{ url: image, width: 400, height: 400, alt: barber.name }] }),
    },
    twitter: {
      card: "summary",
      title: `${barber.name} | BarberFlow`,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default async function BarberLinksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const barber = await getBarber(slug);
  if (!barber) notFound();

  const whatsappMsg = encodeURIComponent(
    `Olá ${barber.name}, vi seu perfil no BarberFlow e gostaria de agendar um horário!`
  );
  const whatsappUrl = barber.phone
    ? `https://wa.me/55${barber.phone.replace(/\D/g, "")}?text=${whatsappMsg}`
    : null;
  const instagramUrl = barber.instagram
    ? `https://instagram.com/${barber.instagram.replace("@", "")}`
    : null;
  const mapsUrl = barber.location
    ? `https://www.google.com/maps/search/${encodeURIComponent(barber.location)}`
    : null;

  const links = [
    {
      href: `/barber/${slug}`,
      icon: <CalendarCheck size={20} />,
      label: "Agendar Agora",
      accent: "bg-amber-500 text-black hover:bg-amber-400",
      primary: true,
    },
    whatsappUrl && {
      href: whatsappUrl,
      icon: <MessageCircle size={20} />,
      label: "WhatsApp",
      accent: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
      external: true,
    },
    instagramUrl && {
      href: instagramUrl,
      icon: <Instagram size={20} />,
      label: barber.instagram,
      accent: "border border-pink-500/30 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20",
      external: true,
    },
    mapsUrl && {
      href: mapsUrl,
      icon: <MapPin size={20} />,
      label: barber.location,
      accent: "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10",
      external: true,
    },
  ].filter(Boolean) as {
    href: string; icon: React.ReactNode; label: string;
    accent: string; primary?: boolean; external?: boolean;
  }[];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 py-16">
      {/* Avatar */}
      <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-3xl border-2 border-white/10 bg-zinc-800">
        {barber.avatarUrl ? (
          <Image src={barber.avatarUrl} fill sizes="96px" className="object-cover" alt={barber.name} />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl font-black text-zinc-600">
            {barber.name[0]}
          </div>
        )}
      </div>

      {/* Nome e rating */}
      <h1 className="text-xl font-black text-white">{barber.name}</h1>
      {barber.averageRating != null && (
        <div className="mt-1 flex items-center gap-1.5 text-sm text-zinc-400">
          <Star size={13} className="text-amber-400" fill="currentColor" />
          <span>{barber.averageRating.toFixed(1)}</span>
          <span className="text-zinc-600">({barber.totalReviews} avaliações)</span>
        </div>
      )}
      {barber.bio && (
        <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-zinc-500">{barber.bio}</p>
      )}

      {/* Links */}
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-bold transition active:scale-95 ${link.accent}`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
        <ShareButton
          name={`${barber.name} | BarberFlow`}
          description={barber.bio || `Agende seu horário com ${barber.name} pelo BarberFlow.`}
          url={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/barber/${slug}/links`}
        />
      </div>

      {/* Rodapé */}
      <p className="mt-12 text-xs text-zinc-700">
        Powered by{" "}
        <Link href="/" className="text-amber-500/60 hover:text-amber-500 transition">
          BarberFlow
        </Link>
      </p>
    </div>
  );
}
