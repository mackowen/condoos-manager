import { Router, type IRouter, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import { CreateEventBody, UpdateEventBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, isoNullable, parseDate } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

function serialize(e: typeof eventsTable.$inferSelect) {
  return {
    id: e.id,
    condominiumId: e.condominiumId,
    title: e.title,
    description: e.description,
    startsAt: iso(e.startsAt),
    endsAt: isoNullable(e.endsAt),
    location: e.location,
    kind: e.kind,
    createdAt: iso(e.createdAt),
  };
}

router.get(
  "/events",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.condominiumId, req.auth!.condominiumId))
      .orderBy(eventsTable.startsAt);
    res.json(rows.map(serialize));
  },
);

router.post(
  "/events",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateEventBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const startsAt = parseDate(d.startsAt);
    if (!startsAt) {
      res.status(400).json({ error: "Data inválida" });
      return;
    }
    const [e] = await db
      .insert(eventsTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        title: d.title,
        description: d.description ?? null,
        startsAt,
        endsAt: parseDate(d.endsAt),
        location: d.location ?? null,
        kind: d.kind,
      })
      .returning();
    await logActivity(req.auth, "create", "event", e.id, `Evento "${e.title}" agendado`);
    res.json(serialize(e));
  },
);

router.patch(
  "/events/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateEventBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const startsAt = parseDate(d.startsAt);
    if (!startsAt) {
      res.status(400).json({ error: "Data inválida" });
      return;
    }
    const [e] = await db
      .update(eventsTable)
      .set({
        title: d.title,
        description: d.description ?? null,
        startsAt,
        endsAt: parseDate(d.endsAt),
        location: d.location ?? null,
        kind: d.kind,
      })
      .where(
        and(
          eq(eventsTable.id, id),
          eq(eventsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!e) {
      res.status(404).json({ error: "Evento não encontrado" });
      return;
    }
    await logActivity(req.auth, "update", "event", e.id, `Evento "${e.title}" atualizado`);
    res.json(serialize(e));
  },
);

router.delete(
  "/events/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [e] = await db
      .delete(eventsTable)
      .where(
        and(
          eq(eventsTable.id, id),
          eq(eventsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!e) {
      res.status(404).json({ error: "Evento não encontrado" });
      return;
    }
    await logActivity(req.auth, "delete", "event", id, `Evento removido`);
    res.json({ success: true });
  },
);

export default router;
