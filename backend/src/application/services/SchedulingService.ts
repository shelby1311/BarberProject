const GAP_MS = 40 * 60 * 1000;

interface WorkingHour {
  dayOfWeek: number;
  startTime: string; // "08:00"
  endTime: string;   // "18:00"
}

function lowerBound(sorted: number[], target: number): number {
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    sorted[mid] < target ? (lo = mid + 1) : (hi = mid);
  }
  return lo;
}

export function getAvailableSlots(
  requestedDate: Date,
  existingBookings: { startsAt: Date }[],
  workingHours?: WorkingHour[]
): Date[] {
  const day = new Date(requestedDate);
  day.setHours(0, 0, 0, 0);

  const dayOfWeek = day.getDay();

  // Determina horário de trabalho para o dia
  let startHour = 8, startMin = 0, endHour = 20, endMin = 0;
  if (workingHours && workingHours.length > 0) {
    const wh = workingHours.find((w) => w.dayOfWeek === dayOfWeek);
    if (!wh) return []; // barbeiro não trabalha nesse dia
    const [sh, sm] = wh.startTime.split(":").map(Number);
    const [eh, em] = wh.endTime.split(":").map(Number);
    startHour = sh; startMin = sm; endHour = eh; endMin = em;
  }

  const sortedTimes = existingBookings
    .filter((b) => {
      const d = new Date(b.startsAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === day.getTime();
    })
    .map((b) => new Date(b.startsAt).getTime())
    .sort((a, b) => a - b);

  const slots: Date[] = [];
  const endMs = endHour * 60 + endMin;

  let h = startHour, m = startMin;
  while (h * 60 + m < endMs) {
    const candidate = new Date(day);
    candidate.setHours(h, m, 0, 0);
    const t = candidate.getTime();

    const idx = lowerBound(sortedTimes, t);
    const prevTime = sortedTimes[idx - 1];
    const nextTime = sortedTimes[idx];

    const clearBefore = prevTime === undefined || t - prevTime >= GAP_MS;
    const clearAfter = nextTime === undefined || nextTime - t >= GAP_MS;

    if (clearBefore && clearAfter) slots.push(candidate);

    m += 40;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }

  return slots;
}
