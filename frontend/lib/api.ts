import { Barber, BookingPayload, BookingResult, AuthResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bf_token");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data as T;
}

export const api = {
  register: (body: {
    name: string; cpf: string; email: string; password: string;
    role: "client" | "barber"; location?: string; phone?: string;
  }) => apiFetch<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { cpf: string; password: string }) =>
    apiFetch<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),

  getBarbers: (search?: string) =>
    apiFetch<Barber[]>(`/api/barbers${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  getBarber: (slug: string) => apiFetch<Barber>(`/api/barbers/${slug}`),

  getDashboard: () => apiFetch<Barber>("/api/barbers/me/dashboard"),

  updateProfile: (data: Partial<Barber>) =>
    apiFetch<Barber>("/api/barbers/me/profile", { method: "PUT", body: JSON.stringify(data) }),

  addService: (data: { name: string; priceInCents: number; durationMinutes: number }) =>
    apiFetch<Barber["services"][0]>("/api/barbers/me/services", { method: "POST", body: JSON.stringify(data) }),

  deleteService: (id: string) =>
    apiFetch<void>(`/api/barbers/me/services/${id}`, { method: "DELETE" }),

  addGalleryImage: (data: { url: string; caption: string }) =>
    apiFetch<Barber["gallery"][0]>("/api/barbers/me/gallery", { method: "POST", body: JSON.stringify(data) }),

  deleteGalleryImage: (id: string) =>
    apiFetch<void>(`/api/barbers/me/gallery/${id}`, { method: "DELETE" }),

  saveWorkingHours: (hours: { dayOfWeek: number; startTime: string; endTime: string }[]) =>
    apiFetch<{ dayOfWeek: number; startTime: string; endTime: string }[]>("/api/barbers/me/working-hours", { method: "PUT", body: JSON.stringify(hours) }),

  getSlots: (barberId: string, date: string) =>
    apiFetch<string[]>(`/api/bookings/${barberId}/slots?date=${date}`),

  createBooking: (payload: BookingPayload) =>
    apiFetch<BookingResult>("/api/bookings", { method: "POST", body: JSON.stringify(payload) }),
};
