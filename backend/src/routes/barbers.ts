import { Router } from "express";
import { z } from "zod";
import { prisma } from "../infra/db/connection";
import { authMiddleware, AuthRequest } from "../shared/authMiddleware";
import { NotFoundException } from "../shared/AppError";

export const barberRouter = Router();

const include = { services: true, gallery: true, workingHours: true };

// Dashboard — dados do barbeiro logado (deve vir ANTES de /:slug)
barberRouter.get("/me/dashboard", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const barber = await prisma.barber.findUnique({
      where: { id: req.barberId },
      include: { services: true, gallery: true, workingHours: true, appointments: { include: { service: true }, orderBy: { startsAt: "asc" }, take: 20 } },
    });
    if (!barber) throw new NotFoundException("Barbeiro");
    res.json(barber);
  } catch (err) { next(err); }
});

// Listagem pública com busca por localização
barberRouter.get("/", async (req, res, next) => {
  try {
    const search = req.query.search as string | undefined;
    const barbers = await prisma.barber.findMany({
      where: search
        ? { location: { contains: search } }
        : undefined,
      include,
    });
    res.json(barbers);
  } catch (err) { next(err); }
});

// Perfil público por slug
barberRouter.get("/:slug", async (req, res, next) => {
  try {
    const barber = await prisma.barber.findUnique({ where: { slug: req.params.slug }, include: { services: true, gallery: true, workingHours: true } });
    if (!barber) throw new NotFoundException("Barbeiro");
    res.json(barber);
  } catch (err) { next(err); }
});

// Atualizar perfil
const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  coverUrl: z.string().url().optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  phone: z.string().optional(),
});

barberRouter.put("/me/profile", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = UpdateSchema.parse(req.body);
    const barber = await prisma.barber.update({ where: { id: req.barberId }, data });
    res.json(barber);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// Adicionar serviço
barberRouter.post("/me/services", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { name, priceInCents, durationMinutes } = z.object({
      name: z.string().min(1),
      priceInCents: z.number().int().positive(),
      durationMinutes: z.number().int().positive(),
    }).parse(req.body);

    const service = await prisma.service.create({
      data: { name, priceInCents, durationMinutes, barberId: req.barberId! },
    });
    res.status(201).json(service);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// Remover serviço
barberRouter.delete("/me/services/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await prisma.service.deleteMany({ where: { id: req.params.id, barberId: req.barberId } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// Adicionar imagem à galeria
barberRouter.post("/me/gallery", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { url, caption } = z.object({
      url: z.string().url(),
      caption: z.string().optional().default(""),
    }).parse(req.body);

    const image = await prisma.galleryImage.create({
      data: { url, caption, barberId: req.barberId! },
    });
    res.status(201).json(image);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});

// Remover imagem da galeria
barberRouter.delete("/me/gallery/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await prisma.galleryImage.deleteMany({ where: { id: req.params.id, barberId: req.barberId } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// Salvar horários de trabalho
const WorkingHoursSchema = z.array(z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
}));

barberRouter.put("/me/working-hours", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const hours = WorkingHoursSchema.parse(req.body);
    // Upsert cada dia
    await prisma.$transaction(
      hours.map((h) =>
        prisma.workingHours.upsert({
          where: { barberId_dayOfWeek: { barberId: req.barberId!, dayOfWeek: h.dayOfWeek } },
          update: { startTime: h.startTime, endTime: h.endTime },
          create: { barberId: req.barberId!, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime },
        })
      )
    );
    // Remove dias que não vieram no payload
    const days = hours.map((h) => h.dayOfWeek);
    await prisma.workingHours.deleteMany({ where: { barberId: req.barberId!, dayOfWeek: { notIn: days } } });
    const updated = await prisma.workingHours.findMany({ where: { barberId: req.barberId! } });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.issues[0].message });
    next(err);
  }
});
