"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scissors, LogOut, LayoutDashboard, Heart, UserCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function Header() {
  const { user, role, logout, isLoading } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-900/70 backdrop-blur-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2 font-black text-lg tracking-tight">
          <Scissors className="text-amber-500" size={20} />
          <span>Barber<span className="text-amber-500">Flow</span></span>
        </Link>

        {!isLoading && (
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-sm text-zinc-500 sm:block">
                  Olá, <span className="font-semibold text-zinc-300">{user.name.split(" ")[0]}</span>
                </span>
                {role === "client" && (
                  <Link
                    href="/favoritos"
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 hover:border-amber-500/40 hover:text-white transition"
                  >
                    <Heart size={15} />
                    <span className="hidden sm:inline">Favoritos</span>
                  </Link>
                )}
                {role === "barber" && (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 hover:border-amber-500/40 hover:text-white transition"
                  >
                    <LayoutDashboard size={15} />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 hover:text-red-400 transition"
                >
                  <LogOut size={15} />
                  <span className="hidden sm:inline">Sair</span>
                </button>
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
