import { Barber, BookingPayload, BookingResult, AuthResponse, Appointment, Review, ScheduleBlock, OccupancyMetric, SubscriptionPlan, Expense, MonthlyMetric } from "@/types";

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

  getBarbers: (search?: string, filters?: { service?: string; minRating?: number }) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filters?.service) params.set("service", filters.service);
    if (filters?.minRating) params.set("minRating", String(filters.minRating));
    const qs = params.toString();
    return apiFetch<Barber[]>(`/api/barbers${qs ? `?${qs}` : ""}`);
  },

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

  cancelBooking: (id: string) =>
    apiFetch<{ success: boolean; appointment: Appointment }>(`/api/bookings/${id}/cancel`, { method: "PATCH" }),

  updateBookingStatus: (id: string, status: string) =>
    apiFetch<Appointment>(`/api/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  getMyBookings: () =>
    apiFetch<Appointment[]>("/api/bookings/me"),

  submitReview: (appointmentId: string, data: { rating: number; comment: string }) =>
    apiFetch<Review>(`/api/bookings/${appointmentId}/review`, { method: "POST", body: JSON.stringify(data) }),

  getBarberReviews: (barberId: string) =>
    apiFetch<{ reviews: Review[]; averageRating: number | null; total: number }>(`/api/bookings/barber/${barberId}/reviews`),

  getBlocks: () => apiFetch<ScheduleBlock[]>("/api/barbers/me/blocks"),

  addBlock: (data: { date: string; reason: string }) =>
    apiFetch<ScheduleBlock>("/api/barbers/me/blocks", { method: "POST", body: JSON.stringify(data) }),

  deleteBlock: (id: string) =>
    apiFetch<void>(`/api/barbers/me/blocks/${id}`, { method: "DELETE" }),

  getOccupancy: (date: string) =>
    apiFetch<OccupancyMetric>(`/api/barbers/me/occupancy?date=${date}`),

  getExpenses: (month: string) =>
    apiFetch<Expense[]>(`/api/barbers/me/expenses?month=${month}`),

  addExpense: (data: { description: string; amountInCents: number; date: string }) =>
    apiFetch<Expense>("/api/barbers/me/expenses", { method: "POST", body: JSON.stringify(data) }),

  deleteExpense: (id: string) =>
    apiFetch<void>(`/api/barbers/me/expenses/${id}`, { method: "DELETE" }),

  getBlockedClients: () =>
    apiFetch<import("@/types").BlockedClient[]>("/api/barbers/me/blocked-clients"),

  unblockClient: (clientId: string) =>
    apiFetch<{ success: boolean }>(`/api/barbers/me/clients/${clientId}/unblock`, { method: "PATCH" }),

  getMonthlyMetrics: () =>
    apiFetch<MonthlyMetric[]>("/api/barbers/me/monthly-metrics"),

  exportAgenda: (month: string) =>
    `${API_URL}/api/barbers/me/export?month=${month}`,

  getSubscriptionPlans: () =>
    apiFetch<SubscriptionPlan[]>("/api/subscriptions/plans"),

  subscribe: (planType: string) =>
    apiFetch<{ success: boolean; planType: string; planExpiration: string }>("/api/subscriptions/subscribe", {
      method: "POST",
      body: JSON.stringify({ planType }),
    }),

  uploadImage: async (file: File): Promise<{ url: string }> => {
    const token = getToken();
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },
};
