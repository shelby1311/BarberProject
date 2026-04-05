"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scissors, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function maskCPF(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ cpf: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(form);
      login(res.token, res.role, res.user, res.barber);
      router.push(res.role === "barber" ? "/dashboard" : "/");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-2xl">
            <Scissors className="text-amber-500" size={24} />
            Barber<span className="text-amber-500">Flow</span>
          </Link>
          <p className="mt-2 text-zinc-500">Acesse sua conta</p>
        </div>

        <div className="rounded-3xl border border-white/5 bg-zinc-900 p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">CPF</label>
              <input
                type="text"
                required
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                className="w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                placeholder="000.000.000-00"
                maxLength={14}
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 pr-11 text-sm text-white placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-amber-500 py-3.5 text-sm font-bold text-black hover:bg-amber-400 transition disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Não tem conta?{" "}
            <Link href="/register" className="font-semibold text-amber-500 hover:text-amber-400">
              Criar conta
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
