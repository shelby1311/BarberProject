"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scissors, LogOut, LayoutDashboard, Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  const { user, role, logout, isLoading } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight">
          <Scissors className="text-amber-500" size={22} />
          <span>Barber<span className="text-amber-500">Flow</span></span>
        </Link>

        {!isLoading && (
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <span className="hidden text-sm text-zinc-500 sm:block">
                  Olá, <span className="font-semibold text-zinc-300">{user.name.split(" ")[0]}</span>
                </span>
                {role === "client" && (
                  <Link
                    href="/favoritos"
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-amber-500/40 hover:text-white transition"
                  >
                    <Heart size={15} />
                    Favoritos
                  </Link>
                )}
                {role === "barber" && (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-amber-500/40 hover:text-white transition"
                  >
                    <LayoutDashboard size={15} />
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 hover:text-red-400 transition"
                >
                  <LogOut size={15} />
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400 transition"
                >
                  Inscreva-se
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
