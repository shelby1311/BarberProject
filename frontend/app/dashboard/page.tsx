"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { io } from "socket.io-client";
import {
  Scissors, Plus, Trash2,
  Save, Image as ImageIcon, ExternalLink, Clock, Check, CalendarDays, User, Calendar, MessageCircle, ShieldOff, Copy, CheckCheck, Inbox, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { ImageUpload } from "@/components/ImageUpload";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Barber, Service, Appointment, WorkingHour, BlockedClient } from "@/types";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

// Serviços pré-definidos
const PRESET_SERVICES: { name: string; durationMinutes: number; defaultPrice: number }[] = [
  { name: "Corte Simples",         durationMinutes: 30, defaultPrice: 3000 },
  { name: "Corte Degradê",         durationMinutes: 40, defaultPrice: 4500 },
  { name: "Corte Navalhado",       durationMinutes: 40, defaultPrice: 4500 },
  { name: "Corte Infantil",        durationMinutes: 30, defaultPrice: 2500 },
  { name: "Barba Completa",        durationMinutes: 30, defaultPrice: 3000 },
  { name: "Barba Degradê",         durationMinutes: 40, defaultPrice: 3500 },
  { name: "Barba na Navalha",      durationMinutes: 30, defaultPrice: 3500 },
  { name: "Corte + Barba",         durationMinutes: 60, defaultPrice: 7000 },
  { name: "Pigmentação",           durationMinutes: 40, defaultPrice: 8000 },
  { name: "Relaxamento",           durationMinutes: 60, defaultPrice: 9000 },
  { name: "Hidratação",            durationMinutes: 30, defaultPrice: 5000 },
  { name: "Sobrancelha",           durationMinutes: 15, defaultPrice: 1500 },
  { name: "Pezinho / Acabamento",  durationMinutes: 15, defaultPrice: 1500 },
  { name: "Platinado / Descoloração", durationMinutes: 90, defaultPrice: 15000 },
  { name: "Luzes",                 durationMinutes: 90, defaultPrice: 12000 },
];

interface PresetState {
  selected: boolean;
  price: string;
  duration: string;
}

export default function DashboardPage() {
  const { barber: authBarber, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ name: "", bio: "", location: "", coverUrl: "", avatarUrl: "", instagram: "", phone: "" });
  const [newImage, setNewImage] = useState({ url: "", caption: "" });
  const [feedback, setFeedback] = useState("");
  const [savingServices, setSavingServices] = useState(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  function copyPublicLink() {
    if (!data?.slug) return;
    const url = `${window.location.origin}/barber/${data.slug}/links`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  }

  // Clientes bloqueados
  const [blockedClients, setBlockedClients] = useState<BlockedClient[]>([]);

  // Horários de trabalho
  const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const defaultHours: WorkingHour[] = [1,2,3,4,5,6].map((d) => ({ dayOfWeek: d, startTime: "08:00", endTime: "18:00" }));
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(defaultHours);
  const [savingHours, setSavingHours] = useState(false);

  // Estado dos presets: { [nome]: { selected, price, duration } }
  const [presets, setPresets] = useState<Record<string, PresetState>>(() =>
    Object.fromEntries(
      PRESET_SERVICES.map((s) => [s.name, { selected: false, price: (s.defaultPrice / 100).toFixed(2), duration: String(s.durationMinutes) }])
    )
  );

  // Serviço customizado avulso
  const [newService, setNewService] = useState({ name: "", priceInCents: "", durationMinutes: "" });

  useEffect(() => {
    if (!authLoading && !authBarber) router.push("/login");
  }, [authBarber, authLoading, router]);

  // Socket.io — atualizações em tempo real no dashboard
  useEffect(() => {
    if (!authBarber?.id) return;
    const socket = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001", {
      transports: ["websocket"],
    });
    socket.emit("join:barber", authBarber.id);
    socket.on("booking:new", (payload: { clientName: string; serviceName: string; startsAt: string }) => {
      const time = new Date(payload.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setLiveToast(`📅 Novo agendamento: ${payload.clientName} — ${payload.serviceName} às ${time}`);
      setTimeout(() => setLiveToast(null), 6000);
      api.getDashboard().then((d) => setData(d));
    });
    socket.on("booking:rejected", ({ appointmentId }: { appointmentId: string }) => {
      setData((d) => d ? {
        ...d,
        appointments: d.appointments!.map((a) => a.id === appointmentId ? { ...a, status: "cancelled" as const } : a),
      } : d);
    });
    return () => { socket.disconnect(); };
  }, [authBarber?.id]);

  useEffect(() => {
    if (!authBarber) return;
    api.getDashboard().then((d) => {
      setData(d);
      setProfile({
        name: d.name ?? "", bio: d.bio ?? "", location: d.location ?? "",
        coverUrl: d.coverUrl ?? "", avatarUrl: d.avatarUrl ?? "",
        instagram: d.instagram ?? "", phone: d.phone ?? "",
      });
      setPresets((prev) => {
        const next = { ...prev };
        d.services.forEach((s: Service) => {
          if (next[s.name]) {
            next[s.name] = {
              selected: true,
              price: (s.priceInCents / 100).toFixed(2),
              duration: String(s.durationMinutes),
            };
          }
        });
        return next;
      });
      if (d.workingHours && d.workingHours.length > 0) setWorkingHours(d.workingHours);
    }).finally(() => setLoading(false));
    api.getBlockedClients().then(setBlockedClients).catch(() => {});
  }, [authBarber, currentMonth]);

  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await api.updateProfile(profile);
      setData((d) => d ? { ...d, ...updated } : d);
      setFeedback("Perfil salvo com sucesso!");
      setTimeout(() => setFeedback(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function savePresetServices() {
    if (!data) return;
    setSavingServices(true);
    try {
      // Remove todos os serviços que são presets e estão desmarcados
      const toRemove = data.services.filter(
        (s) => PRESET_SERVICES.some((p) => p.name === s.name) && !presets[s.name]?.selected
      );
      for (const s of toRemove) await api.deleteService(s.id);

      // Adiciona os presets marcados que ainda não existem
      const existingNames = data.services.map((s) => s.name);
      const toAdd = PRESET_SERVICES.filter(
        (p) => presets[p.name]?.selected && !existingNames.includes(p.name)
      );
      const added: Service[] = [];
      for (const p of toAdd) {
        const s = await api.addService({
          name: p.name,
          priceInCents: Math.round(parseFloat(presets[p.name].price) * 100),
          durationMinutes: parseInt(presets[p.name].duration),
        });
        added.push(s);
      }

      setData((d) => {
        if (!d) return d;
        const remaining = d.services.filter((s) => !toRemove.some((r) => r.id === s.id));
        return { ...d, services: [...remaining, ...added] };
      });

      setFeedback("Serviços salvos com sucesso!");
      setTimeout(() => setFeedback(""), 3000);
    } finally {
      setSavingServices(false);
    }
  }

  async function addCustomService() {
    if (!newService.name || !newService.priceInCents || !newService.durationMinutes) return;
    const s = await api.addService({
      name: newService.name,
      priceInCents: Math.round(parseFloat(newService.priceInCents) * 100),
      durationMinutes: parseInt(newService.durationMinutes),
    });
    setData((d) => d ? { ...d, services: [...d.services, s] } : d);
    setNewService({ name: "", priceInCents: "", durationMinutes: "" });
  }

  async function removeService(id: string) {
    await api.deleteService(id);
    setData((d) => d ? { ...d, services: d.services.filter((s) => s.id !== id) } : d);
  }

  async function addImage() {
    if (!newImage.url) return;
    const img = await api.addGalleryImage(newImage);
    setData((d) => d ? { ...d, gallery: [...d.gallery, img] } : d);
    setNewImage({ url: "", caption: "" });
  }

  async function removeImage(id: string) {
    await api.deleteGalleryImage(id);
    setData((d) => d ? { ...d, gallery: d.gallery.filter((g) => g.id !== id) } : d);
  }

  function toggleDay(day: number) {
    setWorkingHours((prev) => {
      const exists = prev.find((h) => h.dayOfWeek === day);
      if (exists) return prev.filter((h) => h.dayOfWeek !== day);
      return [...prev, { dayOfWeek: day, startTime: "08:00", endTime: "18:00" }].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    });
  }

  function updateHour(day: number, field: "startTime" | "endTime", value: string) {
    setWorkingHours((prev) => prev.map((h) => h.dayOfWeek === day ? { ...h, [field]: value } : h));
  }

  async function saveWorkingHours() {
    setSavingHours(true);
    try {
      await api.saveWorkingHours(workingHours.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })));
      setFeedback("Horários salvos com sucesso!");
      setTimeout(() => setFeedback(""), 3000);
    } finally {
      setSavingHours(false);
    }
  }

  function togglePreset(name: string) {
    setPresets((prev) => ({ ...prev, [name]: { ...prev[name], selected: !prev[name].selected } }));
  }

  async function unblockClient(clientId: string) {
    await api.unblockClient(clientId);
    setBlockedClients((prev) => prev.filter((c) => c.id !== clientId));
  }

  function whatsappLink(phone: string, clientName: string, serviceName: string, startsAt: string) {
    const time = new Date(startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const date = new Date(startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
    const msg = encodeURIComponent(`Olá ${clientName}! Confirmo seu horário para ${serviceName} no dia ${date} às ${time}. Te esperamos! ✂️`);
    return `https://wa.me/55${phone.replace(/\D/g, "")}?text=${msg}`;
  }

  const [rejecting, setRejecting] = useState<string | null>(null);

  function pendingAppointments() {
    return (data?.appointments ?? []).filter((a) => a.status === "pending" && new Date(a.startsAt) >= new Date());
  }

  async function handleReject(id: string) {
    setRejecting(id);
    try {
      await api.rejectBooking(id);
      setData((d) => d ? {
        ...d,
        appointments: d.appointments!.map((a) => a.id === id ? { ...a, status: "cancelled" as const } : a),
      } : d);
    } finally {
      setRejecting(null);
    }
  }

  async function handleConfirm(id: string) {
    await api.updateBookingStatus(id, "confirmed");
    setData((d) => d ? {
      ...d,
      appointments: d.appointments!.map((a) => a.id === id ? { ...a, status: "confirmed" as const } : a),
    } : d);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Header />
        <div className="flex items-center justify-center py-40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Serviços customizados (não são presets)
  const customServices = data.services.filter(
    (s) => !PRESET_SERVICES.some((p) => p.name === s.name)
  );

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden w-full">
      <Header />

      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-6 w-full">
        {/* Topo */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <p className="mb-3 text-sm text-zinc-500">Gerencie sua barbearia</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyPublicLink}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:border-amber-500/30 hover:text-white active:scale-95 transition-transform select-none"
              title="Copie e cole no Instagram como link da bio"
            >
              {linkCopied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {linkCopied ? "Copiado!" : "Link p/ Instagram"}
            </button>
            <a
              href={`/barber/${data.slug}`}
              target="_blank"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:border-amber-500/30 hover:text-white transition"
            >
              <ExternalLink size={14} /> Ver página pública
            </a>
          </div>
        </div>

        <AnimatePresence>
          {liveToast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-300"
            >
              {liveToast}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-400"
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-6">
          {/* Caixa de Entrada */}
          <section id="caixa-de-entrada" className="rounded-3xl border border-amber-500/30 bg-amber-950/10 p-4 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 font-bold text-white">
              <Inbox size={16} className="text-amber-500" /> Caixa de Entrada
              {pendingAppointments().length > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-black">
                  {pendingAppointments().length}
                </span>
              )}
            </h2>
            <p className="mb-4 text-xs text-zinc-500">Novos agendamentos aguardando sua confirmação</p>
            {pendingAppointments().length === 0 ? (
              <p className="text-sm text-zinc-600">Nenhum agendamento pendente no momento.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingAppointments().map((a) => {
                  const date = new Date(a.startsAt);
                  const service = data!.services.find((s) => s.id === a.serviceId);
                  return (
                    <div key={a.id} className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                            <User size={15} className="text-amber-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{a.clientName}</p>
                            <p className="text-xs text-zinc-500">{service?.name ?? "Serviço"}</p>
                            <p className="text-xs font-semibold text-amber-400">
                              {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} às{" "}
                              {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => handleConfirm(a.id)}
                            className="flex items-center gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-transform"
                          >
                            <Check size={13} /> Confirmar
                          </button>
                          <button
                            onClick={() => handleReject(a.id)}
                            disabled={rejecting === a.id}
                            className="flex items-center gap-1 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 active:scale-95 transition-transform disabled:opacity-60"
                          >
                            <X size={13} /> {rejecting === a.id ? "..." : "Rejeitar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Perfil */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-4 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
              <Scissors size={16} className="text-amber-500" /> Perfil da Barbearia
            </h2>
            <div className="grid gap-4">
              {([
                { key: "name",      label: "Nome",      placeholder: "Seu nome" },
                { key: "location",  label: "Cidade",    placeholder: "São Paulo, SP" },
                { key: "instagram", label: "Instagram", placeholder: "@seuperfil" },
                { key: "phone",     label: "Telefone",  placeholder: "(11) 99999-9999" },
              ] as { key: keyof typeof profile; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
                  <input
                    value={profile[key]}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <ImageUpload
                label="Foto de capa"
                value={profile.coverUrl}
                onChange={(url) => setProfile({ ...profile, coverUrl: url })}
                aspect="wide"
              />
              <ImageUpload
                label="Avatar"
                value={profile.avatarUrl}
                onChange={(url) => setProfile({ ...profile, avatarUrl: url })}
                aspect="square"
              />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Bio</label>
                <textarea
                  rows={3}
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full resize-none rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                  placeholder="Fale sobre você e sua barbearia..."
                />
              </div>
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="mt-5 flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 active:scale-95 transition-transform disabled:opacity-60 select-none touch-target"
            >
              <Save size={14} /> {saving ? "Salvando..." : "Salvar perfil"}
            </button>
          </section>

          {/* Serviços pré-definidos */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-4 sm:p-6">
            <div className="mb-5">
              <h2 className="flex items-center gap-2 font-bold text-white">
                <Scissors size={16} className="text-amber-500" /> Serviços
              </h2>
              <p className="mt-1 text-xs text-zinc-500">Marque os que você oferece e ajuste o preço</p>
            </div>

            <div className="mb-6 flex flex-col gap-3">
              {PRESET_SERVICES.map((preset) => {
                const state = presets[preset.name];
                const isSelected = state.selected;
                return (
                  <div
                    key={preset.name}
                    className={`rounded-2xl border transition ${
                      isSelected
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-white/5 bg-zinc-800/50"
                    }`}
                  >
                    {/* Header do card */}
                    <button
                      type="button"
                      onClick={() => togglePreset(preset.name)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        isSelected
                          ? "border-amber-500 bg-amber-500"
                          : "border-zinc-600 bg-transparent"
                      }`}>
                        {isSelected && <Check size={12} className="text-black" strokeWidth={3} />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold transition ${isSelected ? "text-white" : "text-zinc-400"}`}>
                          {preset.name}
                        </p>
                        <p className="text-xs text-zinc-600">
                          <Clock size={10} className="mr-0.5 inline" />
                          {preset.durationMinutes} min padrão
                        </p>
                      </div>
                    </button>

                    {/* Campos de preço e duração (só aparecem quando selecionado) */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-2 border-t border-white/5 px-4 pb-3 pt-3">
                            <div className="flex-1">
                              <label className="mb-1 block text-xs text-zinc-500">Preço (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={state.price}
                                onChange={(e) =>
                                  setPresets((prev) => ({ ...prev, [preset.name]: { ...prev[preset.name], price: e.target.value } }))
                                }
                                inputMode="decimal"
                                className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                              />
                            </div>
                            <div className="w-24">
                              <label className="mb-1 block text-xs text-zinc-500">Duração (min)</label>
                              <input
                                type="number"
                                value={state.duration}
                                onChange={(e) =>
                                  setPresets((prev) => ({ ...prev, [preset.name]: { ...prev[preset.name], duration: e.target.value } }))
                                }
                                className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <button
              onClick={savePresetServices}
              disabled={savingServices}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 active:scale-95 transition-transform disabled:opacity-60 select-none touch-target"
            >
              <Save size={14} /> {savingServices ? "Salvando..." : "Salvar serviços"}
            </button>

            {/* Serviços customizados */}
            {customServices.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Serviços personalizados</p>
                <div className="flex flex-col gap-2">
                  {customServices.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-800 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{s.name}</p>
                        <p className="text-xs text-zinc-500">
                          <Clock size={10} className="mr-1 inline" />{s.durationMinutes} min · {brl(s.priceInCents)}
                        </p>
                      </div>
                      <button onClick={() => removeService(s.id)} className="text-zinc-600 hover:text-red-400 transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Adicionar serviço customizado */}
            <div className="mt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Adicionar serviço personalizado</p>
              <div className="flex flex-col gap-2">
                <input
                  placeholder="Nome do serviço"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                />
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-zinc-500">Preço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newService.priceInCents}
                      onChange={(e) => setNewService({ ...newService, priceInCents: e.target.value })}
                      inputMode="decimal"
                      className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                    />
                  </div>
                  <div className="w-28">
                    <label className="mb-1 block text-xs text-zinc-500">Duração (min)</label>
                    <input
                      type="number"
                      value={newService.durationMinutes}
                      onChange={(e) => setNewService({ ...newService, durationMinutes: e.target.value })}
                      inputMode="numeric"
                      className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={addCustomService}
                    className="flex items-center gap-1 rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-600 active:scale-95 transition-transform"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Horários de trabalho */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-4 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
              <Calendar size={16} className="text-amber-500" /> Horários de Trabalho
            </h2>
            <p className="mb-4 text-xs text-zinc-500">Marque os dias que você trabalha e defina o horário de cada um.</p>
            <div className="flex flex-col gap-3">
              {DAYS.map((label, day) => {
                const wh = workingHours.find((h) => h.dayOfWeek === day);
                const active = !!wh;
                return (
                  <div key={day} className={`rounded-2xl border transition ${active ? "border-amber-500/30 bg-amber-500/5" : "border-white/5 bg-zinc-800/40"}`}>
                    <button type="button" onClick={() => toggleDay(day)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${active ? "border-amber-500 bg-amber-500" : "border-zinc-600"}`}>
                        {active && <Check size={12} className="text-black" strokeWidth={3} />}
                      </div>
                      <span className={`text-sm font-semibold transition ${active ? "text-white" : "text-zinc-500"}`}>{label}</span>
                    </button>
                    <AnimatePresence>
                      {active && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                          <div className="flex gap-4 border-t border-white/5 px-4 pb-3 pt-3">
                            <div>
                              <label className="mb-1 block text-xs text-zinc-500">Abertura</label>
                              <input type="time" value={wh!.startTime} onChange={(e) => updateHour(day, "startTime", e.target.value)}
                                className="rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-amber-500/50 focus:outline-none" />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-zinc-500">Fechamento</label>
                              <input type="time" value={wh!.endTime} onChange={(e) => updateHour(day, "endTime", e.target.value)}
                                className="rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-amber-500/50 focus:outline-none" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            <button onClick={saveWorkingHours} disabled={savingHours}
              className="mt-5 flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 active:scale-95 transition-transform disabled:opacity-60 select-none touch-target">
              <Save size={14} /> {savingHours ? "Salvando..." : "Salvar horários"}
            </button>
          </section>

          {/* Agendamentos */}
          {data.appointments && data.appointments.length > 0 && (
            <section className="rounded-3xl border border-white/5 bg-zinc-900 p-4 sm:p-6">
              <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
                <CalendarDays size={16} className="text-amber-500" /> Próximos Agendamentos
              </h2>
              <div className="flex flex-col gap-2">
                {data.appointments
                  .filter((a) => new Date(a.startsAt) >= new Date())
                  .slice(0, 10)
                  .map((a: Appointment) => {
                    const date = new Date(a.startsAt);
                    const service = data.services.find((s) => s.id === a.serviceId);
                    return (
                      <div key={a.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-800 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                            <User size={15} className="text-amber-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{a.clientName}</p>
                            <p className="text-xs text-zinc-500">
                              {service?.name ?? "Serviço"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-amber-400">
                              {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            </p>
                          </div>
                          {a.clientPhone && (
                            <a
                              href={whatsappLink(a.clientPhone, a.clientName, service?.name ?? "Serviço", a.startsAt)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Confirmar via WhatsApp"
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                            >
                              <MessageCircle size={15} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* Link para Finanças */}
          <section className="rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-4 sm:p-6 flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Finanças</p>
              <p className="text-xs text-zinc-500">Faturamento, despesas e fluxo de caixa</p>
            </div>
            <a
              href="/financas"
              className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
            >
              Ver Finanças
            </a>
          </section>

          {/* Clientes Bloqueados */}
          {blockedClients.length > 0 && (
            <section className="rounded-3xl border border-red-500/10 bg-zinc-900 p-4 sm:p-6">
              <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
                <ShieldOff size={16} className="text-red-400" /> Clientes Bloqueados
              </h2>
              <div className="flex flex-col gap-2">
                {blockedClients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-800 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{c.name}</p>
                      <p className="text-xs text-zinc-500">{c.email} · {c.noShowCount} falta{c.noShowCount !== 1 ? "s" : ""}</p>
                    </div>
                    <button
                      onClick={() => unblockClient(c.id)}
                      className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-transform"
                    >
                      Desbloquear
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Galeria */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-4 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
              <ImageIcon size={16} className="text-amber-500" /> Galeria de Cortes
            </h2>

            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.gallery.map((img) => (
                <div key={img.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-zinc-800">
                  <Image src={img.url} fill className="object-cover" alt={img.caption || "Corte"} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => removeImage(img.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  {img.caption && (
                    <p className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white">{img.caption}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <ImageUpload
                label="Nova foto"
                value={newImage.url}
                onChange={(url) => setNewImage({ ...newImage, url })}
                aspect="wide"
              />
              {newImage.url && (
                <div className="flex gap-2">
                  <input
                    placeholder="Legenda (opcional)"
                    value={newImage.caption}
                    onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                    className="flex-1 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                  />
                  <button
                    onClick={addImage}
                    className="flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-400 active:scale-95 transition-transform"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
