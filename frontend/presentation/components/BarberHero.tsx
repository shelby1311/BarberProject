'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

interface Props {
  coverUrl: string;
  avatarUrl: string;
  name: string;
  location: string;
  bio: string;
}

export function BarberHero({ coverUrl, avatarUrl, name, location, bio }: Props) {
  return (
    <section className="relative h-[65vh] w-full overflow-hidden flex items-end">
      <div className="absolute inset-0 z-0">
        {coverUrl ? (
          <Image src={coverUrl} fill className="object-cover scale-105" alt="Barbershop" priority />
        ) : (
          <div className="h-full w-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
      </div>

      <div className="w-full px-6 pb-10 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col md:flex-row items-center md:items-end gap-6"
        >
          <div className="relative group shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative h-36 w-36 rounded-full border-2 border-white/10 overflow-hidden shadow-2xl bg-zinc-800">
              {avatarUrl ? (
                <Image src={avatarUrl} fill className="object-cover" alt={name} />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl font-black text-zinc-600">
                  {name[0]}
                </div>
              )}
            </div>
          </div>

          <div className="text-center md:text-left">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-amber-500 font-medium tracking-widest uppercase text-xs"
            >
              Barbeiro de Elite
            </motion.span>
            <h1 className="text-4xl md:text-5xl font-black text-white mt-1 tracking-tighter">
              {name}
            </h1>
            <p className="mt-1 flex items-center justify-center md:justify-start gap-1 text-zinc-400 text-sm">
              <MapPin size={13} />
              {location}
            </p>
            <p className="text-zinc-400 mt-3 max-w-lg text-sm leading-relaxed">{bio}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
