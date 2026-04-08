import { describe, it, expect } from "vitest";
import { getAvailableSlots } from "../application/services/SchedulingService";

const workingHours = [{ dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }]; // segunda

function makeMonday(hour: number, minute = 0) {
  // Encontra a próxima segunda-feira
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe("getAvailableSlots", () => {
  it("retorna slots dentro do horário de trabalho", () => {
    const monday = makeMonday(0);
    const slots = getAvailableSlots(monday, [], workingHours, 30);
    expect(slots.length).toBe(8); // 08:00–12:00 = 8 slots de 30min
    expect(slots[0].getHours()).toBe(8);
    expect(slots[0].getMinutes()).toBe(0);
  });

  it("exclui slot já ocupado", () => {
    const monday = makeMonday(0);
    const booking = { startsAt: makeMonday(8), endsAt: makeMonday(8, 30) };
    const slots = getAvailableSlots(monday, [booking], workingHours, 30);
    expect(slots.length).toBe(7);
    expect(slots.some((s) => s.getHours() === 8 && s.getMinutes() === 0)).toBe(false);
  });

  it("retorna vazio para dia sem horário de trabalho", () => {
    const sunday = new Date();
    sunday.setDate(sunday.getDate() + ((0 + 7 - sunday.getDay()) % 7 || 7));
    const slots = getAvailableSlots(sunday, [], workingHours, 30);
    expect(slots).toHaveLength(0);
  });

  it("respeita bloqueio parcial de horário", () => {
    const monday = makeMonday(0);
    const blocks = [{ date: monday.toISOString().split("T")[0], startTime: "09:00", endTime: "10:00" }];
    const slots = getAvailableSlots(monday, [], workingHours, 30, blocks);
    expect(slots.some((s) => s.getHours() === 9)).toBe(false);
    expect(slots.some((s) => s.getHours() === 10)).toBe(true);
  });

  it("serviço de 60min ocupa 2 slots consecutivos", () => {
    const monday = makeMonday(0);
    const slots = getAvailableSlots(monday, [], workingHours, 60);
    expect(slots.length).toBe(7); // 08:00–12:00 com janela de 60min = 7 slots
  });
});
