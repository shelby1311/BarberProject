import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/api/barbers/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error();
    const barber = await res.json();
    const city = barber.location ? ` em ${barber.location}` : "";
    const title = `${barber.name} — Barbeiro${city} | BarberFlow`;
    const description = barber.bio || `Agende seu corte com ${barber.name}${city}. Veja serviços, preços e horários disponíveis.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "profile" },
      keywords: [`barbeiro${city}`, barber.name, "agendamento", "corte de cabelo", barber.location].filter(Boolean),
    };
  } catch {
    return { title: "Barbeiro | BarberFlow" };
  }
}

export default function BarberLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
