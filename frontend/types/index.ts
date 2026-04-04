export interface WorkingHour {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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

export interface Appointment {
  id: string;
  clientName: string;
  startsAt: string;
  serviceId: string;
  service?: Service;
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
  services: Service[];
  gallery: GalleryImage[];
  workingHours?: WorkingHour[];
  appointments?: Appointment[];
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
  | { success: true; appointmentId: string; confirmedAt: string; finalPriceInCents: number }
  | { success: false; code: string; message: string };
