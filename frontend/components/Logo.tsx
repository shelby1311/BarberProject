"use client";

import Link from "next/link";

interface LogoProps {
  size?: number;
  showText?: boolean;
  link?: boolean;
  className?: string;
}

/**
 * BarberFlow Logo — Hélice Infinita (Barber Pole abstrato)
 *
 * Uma fita de Möbius em gradiente dourado que simboliza o fluxo contínuo
 * de clientes, agendamentos e receita. A forma em hélice 3D minimalista
 * remete ao tradicional Barber Pole, mas com linhas limpas e modernas.
 */
export function LogoSvg({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Hélice infinita — fita de Möbius em gradiente dourado */}
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>

      {/* Fita frontal (mais clara) */}
      <path
        d="M16 2C9.5 2 4 7.5 4 14c0 4 2 7.5 5 9.5l7-11.5 7 11.5c3-2 5-5.5 5-9.5 0-6.5-5.5-12-12-12z"
        fill="url(#logoGrad)"
        opacity={0.9}
      />

      {/* Fita traseira (mais escura, efeito 3D) */}
      <path
        d="M16 6C11 6 7 10 7 15c0 3 1.5 5.5 3.5 7L16 9l5.5 13c2-1.5 3.5-4 3.5-7 0-5-4-9-9-9z"
        fill="#B8860B"
        opacity={0.4}
      />

      {/* Brilho central — destaca o fluxo */}
      <ellipse cx="16" cy="14" rx="2.5" ry="1.5" fill="#FBBF24" opacity={0.6} />

      {/* Detalhe de movimento — linhas de fluxo */}
      <path
        d="M8 20c2 3 5 5 8 5s6-2 8-5"
        stroke="#D4AF37"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={0.5}
        fill="none"
      />
    </svg>
  );
}

export function Logo({
  size = 20,
  showText = true,
  link = true,
  className = "",
}: LogoProps) {
  const content = (
    <span className={`flex items-center gap-2 font-black tracking-tight ${className}`}>
      <LogoSvg size={size} />
      {showText && (
        <span className="text-lg">
          Barber<span className="text-amber-500">Flow</span>
        </span>
      )}
    </span>
  );

  if (link) {
    return (
      <Link href="/" className="flex shrink-0 items-center gap-2">
        {content}
      </Link>
    );
  }

  return content;
}
