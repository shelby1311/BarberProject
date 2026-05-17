"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, UserCircle, CalendarDays, Settings, ChevronDown, Heart, Inbox, TrendingUp, Crown, ClipboardList, Calendar, Users, Award } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export function Header() {
  const { user, role, logout, isLoading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (role !== "barber") return;
    function fetchPending() {
      api.getDashboard().then((d) => {
        const count = (d.appointments ?? []).filter(
          (a) => a.status === "pending" && new Date(a.startsAt) >= new Date()
        ).length;
        setPendingCount(count);
      }).catch(() => {});
    }
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [role]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleLogout() {
    logout();
    setOpen(false);
    router.push("/");
  }

  const initials = user?.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-900/70 backdrop-blur-md w-full">
      <div className="w-full flex items-center justify-between px-3 sm:px-6 py-3">
        {/* Logo — Hélice Infinita */}
        <Logo />

        {!isLoading && (
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {role === "barber" && (
                  <>
                    <Link
                      href="/dashboard/solicitacoes"
                      className="relative flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 hover:border-amber-500/40 hover:text-white transition"
                    >
                      <ClipboardList size={15} />
                      <span className="hidden sm:inline">Solicitações</span>
                      {pendingCount > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-black">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/dashboard/caixa-de-entrada"
                      className="relative flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 hover:border-amber-500/40 hover:text-white transition"
                    >
                      <Inbox size={15} />
                      <span className="hidden sm:inline">Caixa de Entrada</span>
                      {pendingCount > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-black">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  </>
                )}

                {/* Avatar dropdown */}
                <div className="relative" ref={ref}>
                  <button
                    onClick={() => setOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-2 py-1.5 hover:border-amber-500/40 transition"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-black">
                      {initials}
                    </div>
                    <span className="hidden text-sm font-medium text-zinc-300 sm:block">
                      {user.name.split(" ")[0]}
                    </span>
                    <ChevronDown size={13} className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>

                  {open && (
                    <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/10 bg-zinc-900 shadow-xl shadow-black/40 overflow-hidden">
                      <div className="border-b border-white/5 px-4 py-3">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      </div>

                      <div className="py-1">
                        {role === "client" && (
                          <Link
                            href="/minha-conta"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition"
                          >
                            <CalendarDays size={15} className="text-amber-500" />
                            Meus agendamentos
                          </Link>
                        )}
                        {role === "client" && (
                          <Link
                            href="/favoritos"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition"
                          >
                            <Heart size={15} className="text-amber-500" />
                            Favoritos
                          </Link>
                        )}
                        {role === "barber" && (
                          <>
                            <Link
                              href="/dashboard/solicitacoes"
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition"
                            >
                              <ClipboardList size={15} className="text-amber-500" />
                              Solicitações
                            </Link>
                            <Link
                              href="/dashboard/agenda"
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition"
                            >
                              <Calendar size={15} className="text-blue-400" />
                              Grade de Horários
                            </Link>
                            <Link
                              href="/dashboard/clientes"
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition"
                            >
                              <Users size={15} className="text-purple-400" />
                              Clientes
                            </Link>
                            <Link
                              href="/dashboard/fidelidade"
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition"
                            >
                              <Award size={15} className="text-amber-500" />
                              Fidelidade
                            </Link>
                            <Link
                              href="/dashboard/financas"
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition"
                            >
                              <TrendingUp size={15} className="text-emerald-400" />
                              Inteligência Financeira
                            </Link>
                            <Link
                              href="/dashboard/assinatura"
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition"
                            >
                              <Crown size={15} className="text-amber-500" />
                              Assinatura
                            </Link>
                          </>
                        )}
                        <Link
                          href={role === "barber" ? "/dashboard" : "/minha-conta"}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition"
                        >
                          <Settings size={15} className="text-zinc-400" />
                          Configurações
                        </Link>
                      </div>

                      <div className="border-t border-white/5 py-1">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition"
                        >
                          <LogOut size={15} />
                          Sair da conta
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-zinc-400 hover:border-amber-500/40 hover:text-white transition"
              >
                <UserCircle size={20} />
                <span className="hidden sm:inline">Entrar</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
