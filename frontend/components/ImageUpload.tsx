"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "square" | "wide";
}

export function ImageUpload({ label, value, onChange, aspect = "wide" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      onChange(url);
    } catch {
      setError("Erro ao enviar imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>

      {value ? (
        <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-zinc-800 ${aspect === "square" ? "h-24 w-24" : "h-32 w-full"}`}>
          <Image src={value} fill className="object-cover" alt={label} unoptimized />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-500 transition"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-zinc-800/50 text-sm text-zinc-500 hover:border-amber-500/40 hover:text-zinc-300 transition disabled:opacity-60"
        >
          {uploading ? (
            <><Loader2 size={16} className="animate-spin" /> Enviando...</>
          ) : (
            <><ImageIcon size={16} /> Escolher da galeria</>
          )}
        </button>
      )}

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
