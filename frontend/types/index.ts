export interface MonthlyMetric {
  label: string;
  revenue: number;
  expenses: number;
}

export interface WorkingHour {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface Service {
  id: string;
  name: string;
  priceInCents: number;
  durationMinutes: number;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
}

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  client?: { user: { name: string } };
}

export interface Appointment {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  startsAt: string;
  serviceId: string;
  status: AppointmentStatus;
  service?: Service;
  barber?: Pick<Barber, "id" | "name" | "slug" | "avatarUrl">;
  review?: Review | null;
}

export interface Expense {
  id: string;
  description: string;
  amountInCents: number;
  date: string;
}

export interface BlockedClient {
  id: string;
  name: string;
  email: string;
  noShowCount: number;
}

export interface ScheduleBlock {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
}

export interface BarberMetrics {
  monthlyRevenueInCents: number;
  totalCompleted: number;
  topServices: { name: string; count: number }[];
  averageRating: number | null;
  totalReviews: number;
}

export interface OccupancyMetric {
  date: string;
  totalSlots: number;
  bookedSlots: number;
  occupancyRate: number;
}

// ─── Novos tipos para o modelo Hybrid SaaS ─────────────────────────────────

export type PlanType = "ESSENTIAL" | "PRO" | "ELITE";

export type BarberStatus = "AVAILABLE" | "BUSY" | "BREAK" | "OFFLINE";

export interface Barbershop {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  plan: PlanType;
  maxBarbers: number;
  planStatus: string;
  planExpiration: string | null;
  createdAt: string;
}

export interface Barber {
  id: string;
  name: string;
  location: string;
  slug: string;
  bio: string;
  coverUrl: string;
  avatarUrl: string;
  instagram: string;
  phone: string;
  barbershopId: string;
  barbershop?: Barbershop;
  status: BarberStatus;
  queueCount: number;
  currentServiceId: string | null;
  currentServiceStartedAt: string | null;
  currentServiceEstimatedEnd: string | null;
  commissionPct: number;
  services: Service[];
  gallery: GalleryImage[];
  workingHours?: WorkingHour[];
  appointments?: Appointment[];
  scheduleBlocks?: ScheduleBlock[];
  reviews?: Review[];
  averageRating?: number | null;
  totalReviews?: number;
  metrics?: BarberMetrics;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  cpf: string;
}

export interface AuthResponse {
  token: string;
  role: "client" | "barber";
  user: AuthUser;
  barber: Barber | null;
}

export interface BookingPayload {
  barberId: string;
  serviceId: string;
  clientName: string;
  startTime: string;
  useOnlineDiscount?: boolean;
}

export type BookingResult =
  | { success: true; appointmentId: string; confirmedAt: string; finalPriceInCents: number; pixKey: string; pixMessage: string }
  | { success: false; code: string; message: string };

export interface SubscriptionPlan {
  planType: PlanType;
  priceInCents: number;
  durationDays: number;
  maxStaff: number;
}

// ─── Fidelidade ───────────────────────────────────────────────────────────────
export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  active: boolean;
}

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  points: number;
  noShowCount: number;
  isBlocked: boolean;
  totalAppointments: number;
  totalSpentInCents: number;
  lastVisit: string | null;
  tags: string[];
}

// ─── Grade Semanal ────────────────────────────────────────────────────────────
export interface WeeklySlot {
  date: string;
  dayOfWeek: number;
  slots: { time: string; status: "available" | "booked" | "blocked" | "past"; appointmentId?: string; clientName?: string; serviceName?: string }[];
}
