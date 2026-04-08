"use client";

import { useState, useEffect, useCallback } from "react";

const KEY = "bf_favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const toggle = useCallback((barberId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(barberId)
        ? prev.filter((id) => id !== barberId)
        : [...prev, barberId];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavorite = useCallback((barberId: string) => favorites.includes(barberId), [favorites]);

  return { favorites, toggle, isFavorite };
}
