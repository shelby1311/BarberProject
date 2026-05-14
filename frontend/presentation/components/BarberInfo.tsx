import { MapPin } from "lucide-react";

interface Props {
  name: string;
  location: string;
  bio: string;
}

export function BarberInfo({ name, location, bio }: Props) {
  return (
    <div className="mt-14 px-6">
      <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
      <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
        <MapPin size={14} />
        {location}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">{bio}</p>
    </div>
  );
}
