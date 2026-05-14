import { Service } from "./Service";

export interface Barber {
  id: string;
  cpf: string;
  email: string;
  name: string;
  location: string;
  slug: string;
  bio: string;
  coverUrl: string;
  avatarUrl: string;
  services: Service[];
}
