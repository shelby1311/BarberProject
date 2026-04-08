const SLOT_MINUTES = 30;

interface WorkingHour {
  dayOfWeek: number;
  startTime: string; // "08:00"
  endTime: string;   // "18:00"
  breakStart?: string;
  breakEnd?: string;
}

interface PartialBlock {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function lowerBound(sorted: number[], target: number): number {
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    sorted[mid] < target ? (lo = mid + 1) : (hi = mid);
  }
  return lo;
}

/**
 * Retorna os slots disponíveis para uma data, respeitando:
 * - Horário de trabalho do barbeiro
 * - Duração do serviço (ocupa N slots de 30min sequenciais)
 * - Bloqueios parciais de horário (ex: almoço 12:00–13:00)
 * - Agendamentos existentes (com suas durações)
 */
export function getAvailableSlots(
  requestedDate: Date,
  existingBookings: { startsAt: Date; endsAt?: Date | null; service?: { durationMinutes: number } | null }[],
  workingHours?: WorkingHour[],
  serviceDurationMinutes: number = SLOT_MINUTES,
  scheduleBlocks?: PartialBlock[]
): Date[] {
  const day = new Date(requestedDate);
  day.setHours(0, 0, 0, 0);
  const dayOfWeek = day.getDay();
  const dateStr = day.toISOString().split("T")[0];

  // Horário de trabalho
  let startMin = 8 * 60, endMin = 20 * 60;
  let breakStartMin: number | null = null, breakEndMin: number | null = null;

  if (workingHours && workingHours.length > 0) {
    const wh = workingHours.find((w) => w.dayOfWeek === dayOfWeek);
    if (!wh) return [];
    startMin = timeToMinutes(wh.startTime);
    endMin = timeToMinutes(wh.endTime);
    if (wh.breakStart && wh.breakEnd) {
      breakStartMin = timeToMinutes(wh.breakStart);
      breakEndMin = timeToMinutes(wh.breakEnd);
    }
  }

  // Bloqueios parciais de horário para o dia
  const partialBlocks: { start: number; end: number }[] = [];
  if (scheduleBlocks) {
    for (const b of scheduleBlocks) {
      if (b.date !== dateStr) continue;
      if (b.startTime && b.endTime) {
        partialBlocks.push({ start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) });
      }
    }
  }

  // Intervalos ocupados pelos agendamentos existentes (considera duração real)
  const bookedRanges: { start: number; end: number }[] = existingBookings
    .filter((b) => {
      const d = new Date(b.startsAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === day.getTime();
    })
    .map((b) => {
      const s = new Date(b.startsAt);
      const startM = s.getHours() * 60 + s.getMinutes();
      const duration = b.service?.durationMinutes ?? SLOT_MINUTES;
      const endM = b.endsAt
        ? new Date(b.endsAt).getHours() * 60 + new Date(b.endsAt).getMinutes()
        : startM + duration;
      return { start: startM, end: endM };
    });

  const slots: Date[] = [];
  const oneHourFromNow = new Date(Date.now() + 65 * 60 * 1000);

  for (let cur = startMin; cur + serviceDurationMinutes <= endMin; cur += SLOT_MINUTES) {
    const slotEnd = cur + serviceDurationMinutes;

    // Verifica se o bloco de tempo do serviço está livre
    const overlapsBreak =
      breakStartMin !== null &&
      breakEndMin !== null &&
      cur < breakEndMin &&
      slotEnd > breakStartMin;

    const overlapsPartialBlock = partialBlocks.some((b) => cur < b.end && slotEnd > b.start);

    const overlapsBooking = bookedRanges.some((b) => cur < b.end && slotEnd > b.start);

    if (!overlapsBreak && !overlapsPartialBlock && !overlapsBooking) {
      const candidate = new Date(day);
      candidate.setHours(Math.floor(cur / 60), cur % 60, 0, 0);
      if (candidate > oneHourFromNow) slots.push(candidate);
    }
  }

  return slots;
}
