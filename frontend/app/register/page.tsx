"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Scissors, Eye, EyeOff, User, Store, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function maskCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

function validateCPF(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
  let r = (s * 10) % 11; if (r >= 10) r = 0;
  if (r !== +d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
  r = (s * 10) % 11; if (r >= 10) r = 0;
  return r === +d[10];
}

function passwordStrength(p: string): { score: number; label: string; color: string } {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const map = [
    { label: "", color: "" },
    { label: "Fraca", color: "bg-red-500" },
    { label: "Razoável", color: "bg-yellow-500" },
    { label: "Boa", color: "bg-blue-500" },
    { label: "Forte", color: "bg-emerald-500" },
  ];
  return { score, ...map[score] };
}

interface IBGEState { id: number; sigla: string; nome: string; }
interface IBGECity  { id: number; nome: string; }

const input = "w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none";
const select = "w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none appearance-none";

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [role, setRole] = useState<"client" | "barber">("client");
  const [form, setForm] = useState({ name: "", cpf: "", email: "", password: "", confirmPassword: "", phone: "" });
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [states, setStates] = useState<IBGEState[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((r) => r.json())
      .then(setStates);
  }, []);

  useEffect(() => {
    if (!state) { setCities([]); setCity(""); return; }
    setLoadingCities(true);
    setCity("");
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios?orderBy=nome`)
      .then((r) => r.json())
      .then(setCities)
      .finally(() => setLoadingCities(false));
  }, [state]);

  const cpfValid = form.cpf.replace(/\D/g, "").length === 11 ? validateCPF(form.cpf) : null;
  const strength = passwordStrength(form.password);
  const passwordsMatch = form.confirmPassword ? form.password === form.confirmPassword : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateCPF(form.cpf)) { setError("CPF inválido."); return; }
    if (form.password !== form.confirmPassword) { setError("As senhas não coincidem."); return; }
    if (role === "barber" && (!state || !city)) { setError("Selecione seu estado e cidade."); return; }
    setError("");
    setLoading(true);
    try {
      const location = role === "barber" ? `${city}, ${state}` : undefined;
      const res = await api.register({ ...form, role, location, phone: form.phone || undefined });
      login(res.token, res.role, res.user, res.barber);
      const callbackUrl = searchParams.get("callbackUrl");
      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        router.push(res.role === "barber" ? "/dashboard" : "/");
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/5 bg-zinc-900 p-8">
      {/* Toggle */}
      <div className="mb-6 flex flex-col gap-2">
        {(["client", "barber"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRole(r)}
            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
              role === r
                ? "border-amber-500 bg-amber-500/10 text-amber-400"
                : "border-white/10 bg-zinc-800 text-zinc-400 hover:border-white/20 hover:text-white"
            }`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              role === r ? "bg-amber-500 text-black" : "bg-zinc-700 text-zinc-400"
            }`}>
              {r === "client" ? <User size={16} /> : <Store size={16} />}
            </span>
            <span className="text-left">
              <span className="block font-bold">{r === "client" ? "Sou cliente" : "Sou barbeiro"}</span>
              <span className="block text-xs font-normal text-zinc-500">
                {r === "client" ? "Quero agendar cortes" : "Quero gerenciar minha barbearia"}
              </span>
            </span>
            {role === r && <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" />}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        <Field label="Nome completo">
          <input type="text" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={input} placeholder="João Silva" />
        </Field>

        <Field label="CPF">
          <div className="relative">
            <input type="text" required value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
              className={`${input} pr-10`} placeholder="000.000.000-00" maxLength={14} inputMode="numeric" />
            {cpfValid !== null && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {cpfValid
                  ? <CheckCircle2 size={16} className="text-emerald-500" />
                  : <XCircle size={16} className="text-red-500" />}
              </span>
            )}
          </div>
          {cpfValid === false && (
            <p className="mt-1 text-xs text-red-400">CPF inválido. Verifique os dígitos.</p>
          )}
        </Field>

        <Field label="Email">
          <input type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={input} placeholder="seu@email.com" />
        </Field>

        {role === "barber" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estado">
              <select required value={state} onChange={(e) => setState(e.target.value)} className={select}>
                <option value="">Selecione</option>
                {states.map((s) => <option key={s.id} value={s.sigla}>{s.sigla} — {s.nome}</option>)}
              </select>
            </Field>
            <Field label="Cidade">
              <div className="relative">
                <select required value={city} onChange={(e) => setCity(e.target.value)}
                  disabled={!state || loadingCities} className={`${select} disabled:opacity-50`}>
                  <option value="">{loadingCities ? "Carregando..." : "Selecione"}</option>
                  {cities.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
                {loadingCities && <Loader2 size={14} className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-zinc-500" />}
              </div>
            </Field>
          </div>
        )}

        <Field label={<>Telefone <span className="text-zinc-600">(opcional)</span></>}>
          <input type="text" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
            className={input} placeholder="(11) 99999-9999" maxLength={15} />
        </Field>

        <Field label="Senha">
          <div className="relative">
            <input type={showPass ? "text" : "password"} required minLength={6} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`${input} pr-11`} placeholder="Mínimo 6 caracteres" />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : "bg-zinc-700"}`} />
                ))}
              </div>
              {strength.label && <p className="mt-1 text-xs text-zinc-500">Força: <span className="font-medium text-zinc-300">{strength.label}</span></p>}
            </div>
          )}
        </Field>

        <Field label="Confirmar senha">
          <div className="relative">
            <input type={showConfirm ? "text" : "password"} required value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className={`${input} pr-11`} placeholder="Repita a senha" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {passwordsMatch === false && (
            <p className="mt-1 text-xs text-red-400">As senhas não coincidem.</p>
          )}
          {passwordsMatch === true && (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 size={12} /> Senhas coincidem
            </p>
          )}
        </Field>

        <button type="submit" disabled={loading}
          className="mt-2 w-full rounded-2xl bg-amber-500 py-3.5 text-sm font-bold text-black hover:bg-amber-400 active:scale-95 transition-transform disabled:opacity-60">
          {loading ? "Criando conta..." : role === "barber" ? "Criar conta de barbeiro" : "Criar conta de cliente"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-amber-500 hover:text-amber-400">Fazer login</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-4 py-12 overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-2xl">
            <Scissors className="text-amber-500" size={24} />
            Barber<span className="text-amber-500">Flow</span>
          </Link>
          <p className="mt-2 text-zinc-500">Crie sua conta gratuitamente</p>
        </div>

        <Suspense fallback={
          <div className="rounded-3xl border border-white/5 bg-zinc-900 p-8 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        }>
          <RegisterForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
