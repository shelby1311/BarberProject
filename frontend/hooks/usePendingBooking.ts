import { useState, useEffect } from "react";
import { Barber } from "@/types";
import { toast } from "@/components/Toaster";

export function usePendingBooking(
  barber: Barber | undefined,
  authLoading: boolean,
  isLoggedIn: boolean
) {
  const [pendingSlot, setPendingSlot] = useState<Date | null>(null);

  useEffect(() => {
    if (authLoading || !isLoggedIn || !barber) return;
    const raw = localStorage.getItem("pending_booking");
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { serviceId: string; date: string; slot: string };
      const matchingService = barber.services.find((s) => s.id === pending.serviceId);
      if (!matchingService) return;
      const slot = new Date(pending.slot);
      setPendingSlot(slot);
      toast(
        `Horário reservado: ${matchingService.name} às ${slot.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}. Confirme abaixo!`,
        "success"
      );
      document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" });
    } catch { /* ignore malformed data */ }
  }, [authLoading, isLoggedIn, barber]);

  function consumePending() {
    localStorage.removeItem("pending_booking");
    setPendingSlot(null);
  }

  return { pendingSlot, consumePending };
}
