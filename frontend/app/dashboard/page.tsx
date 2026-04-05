"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { io } from "socket.io-client";
import {
  Scissors, MapPin, Link2, Phone, Plus, Trash2,
  Save, Image as ImageIcon, ExternalLink, Clock, Check, CalendarDays, User, Calendar, MessageCircle, TrendingDown, TrendingUp, DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Barber, Service, Appointment, WorkingHour, Expense } from "@/types";

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

  // Gestão financeira
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const [savingExpense, setSavingExpense] = useState(false);

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
      // Recarrega agendamentos
      api.getDashboard().then((d) => setData(d));
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
    api.getExpenses(currentMonth).then(setExpenses).catch(() => {});
  }, [authBarber]);

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

  async function addExpense() {
    if (!newExpense.description || !newExpense.amount || !newExpense.date) return;
    setSavingExpense(true);
    try {
      const expense = await api.addExpense({
        description: newExpense.description,
        amountInCents: Math.round(parseFloat(newExpense.amount) * 100),
        date: newExpense.date,
      });
      setExpenses((prev) => [expense, ...prev]);
      setNewExpense({ description: "", amount: "", date: new Date().toISOString().split("T")[0] });
    } finally {
      setSavingExpense(false);
    }
  }

  async function removeExpense(id: string) {
    await api.deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function whatsappLink(phone: string, clientName: string, serviceName: string, startsAt: string) {
    const time = new Date(startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const date = new Date(startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
    const msg = encodeURIComponent(`Olá ${clientName}! Confirmo seu horário para ${serviceName} no dia ${date} às ${time}. Te esperamos! ✂️`);
    return `https://wa.me/55${phone.replace(/\D/g, "")}?text=${msg}`;
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
    <div className="min-h-screen bg-zinc-950">
      <Header />

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Topo */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Dashboard</h1>
            <p className="text-sm text-zinc-500">Gerencie sua barbearia</p>
          </div>
          <a
            href={`/barber/${data.slug}`}
            target="_blank"
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:border-amber-500/30 hover:text-white transition"
          >
            <ExternalLink size={14} /> Ver página pública
          </a>
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
          {/* Perfil */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-6">
            <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
              <Scissors size={16} className="text-amber-500" /> Perfil da Barbearia
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: "name",      label: "Nome",              placeholder: "Seu nome" },
                { key: "location",  label: "Cidade",            placeholder: "São Paulo, SP" },
                { key: "instagram", label: "Instagram",         placeholder: "@seuperfil" },
                { key: "phone",     label: "Telefone",          placeholder: "(11) 99999-9999" },
                { key: "coverUrl",  label: "URL da foto de capa", placeholder: "https://..." },
                { key: "avatarUrl", label: "URL do avatar",     placeholder: "https://..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
                  <input
                    value={profile[key as keyof typeof profile]}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
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
              className="mt-5 flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition disabled:opacity-60"
            >
              <Save size={14} /> {saving ? "Salvando..." : "Salvar perfil"}
            </button>
          </section>

          {/* Serviços pré-definidos */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-white">
                <Scissors size={16} className="text-amber-500" /> Serviços
              </h2>
              <span className="text-xs text-zinc-500">Marque os que você oferece e ajuste o preço</span>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
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
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition disabled:opacity-60"
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Adicionar serviço personalizado</p>
              <div className="flex gap-2">
                <input
                  placeholder="Nome do serviço"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className="flex-1 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                />
                <input
                  placeholder="R$"
                  type="number"
                  step="0.01"
                  value={newService.priceInCents}
                  onChange={(e) => setNewService({ ...newService, priceInCents: e.target.value })}
                  className="w-24 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                />
                <input
                  placeholder="Min"
                  type="number"
                  value={newService.durationMinutes}
                  onChange={(e) => setNewService({ ...newService, durationMinutes: e.target.value })}
                  className="w-20 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                />
                <button
                  onClick={addCustomService}
                  className="flex items-center gap-1 rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-600 transition"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </section>

          {/* Horários de trabalho */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-6">
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
              className="mt-5 flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition disabled:opacity-60">
              <Save size={14} /> {savingHours ? "Salvando..." : "Salvar horários"}
            </button>
          </section>

          {/* Agendamentos */}
          {data.appointments && data.appointments.length > 0 && (
            <section className="rounded-3xl border border-white/5 bg-zinc-900 p-6">
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

          {/* Gestão Financeira */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-white">
              <DollarSign size={16} className="text-amber-500" /> Fluxo de Caixa
            </h2>
            <p className="mb-5 text-xs text-zinc-500">{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>

            {/* Resumo */}
            {(() => {
              const revenue = data.metrics?.monthlyRevenueInCents ?? 0;
              const totalExpenses = expenses.reduce((s, e) => s + e.amountInCents, 0);
              const net = revenue - totalExpenses;
              return (
                <div className="mb-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/5 bg-zinc-800 px-4 py-3">
                    <p className="text-xs text-zinc-500">Faturamento</p>
                    <p className="mt-1 text-base font-bold text-emerald-400">{brl(revenue)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-zinc-800 px-4 py-3">
                    <p className="text-xs text-zinc-500">Despesas</p>
                    <p className="mt-1 text-base font-bold text-red-400">{brl(totalExpenses)}</p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${
                    net >= 0 ? "border-emerald-500/20 bg-emerald-950/30" : "border-red-500/20 bg-red-950/30"
                  }`}>
                    <p className="text-xs text-zinc-500">Saldo Líquido</p>
                    <p className={`mt-1 text-base font-bold ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {net >= 0 ? <TrendingUp size={14} className="mr-1 inline" /> : <TrendingDown size={14} className="mr-1 inline" />}
                      {brl(Math.abs(net))}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Lista de despesas */}
            {expenses.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-800 px-4 py-2.5">
                    <div>
                      <p className="text-sm text-white">{e.description}</p>
                      <p className="text-xs text-zinc-500">{new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-red-400">{brl(e.amountInCents)}</span>
                      <button onClick={() => removeExpense(e.id)} className="text-zinc-600 hover:text-red-400 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar despesa */}
            <div className="flex gap-2">
              <input
                placeholder="Descrição (ex: Aluguel)"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                className="flex-1 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
              />
              <input
                placeholder="R$"
                type="number"
                step="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                className="w-24 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
              />
              <input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                className="w-36 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
              />
              <button
                onClick={addExpense}
                disabled={savingExpense}
                className="flex items-center gap-1 rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-600 transition disabled:opacity-60"
              >
                <Plus size={15} />
              </button>
            </div>
          </section>

          {/* Galeria */}
          <section className="rounded-3xl border border-white/5 bg-zinc-900 p-6">
            <h2 className="mb-5 flex items-center gap-2 font-bold text-white">
              <ImageIcon size={16} className="text-amber-500" /> Galeria de Cortes
            </h2>

            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
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

            <div className="flex gap-2">
              <input
                placeholder="URL da imagem"
                value={newImage.url}
                onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                className="flex-1 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
              />
              <input
                placeholder="Legenda (opcional)"
                value={newImage.caption}
                onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                className="w-40 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
              />
              <button
                onClick={addImage}
                className="flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition"
              >
                <Plus size={15} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
