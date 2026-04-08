"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";

interface Props {
  name: string;
  description: string;
  url: string;
}

export function ShareButton({ name, description, url }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: name, text: description, url }).catch(() => {});
      return;
    }
    // Fallback: copia o link
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-zinc-300 transition active:scale-95 hover:bg-white/10 w-full"
    >
      {copied ? <Check size={20} className="text-emerald-400" /> : <Share2 size={20} />}
      {copied ? "Link copiado!" : "Compartilhar Perfil"}
    </button>
  );
}
