import { Router, type IRouter, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, reservationsTable, unitsTable } from "@workspace/db";
import {
  CreateReservationBody,
  UpdateReservationBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, parseDate } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

function serialize(
  r: typeof reservationsTable.$inferSelect,
  uLabel: string | null,
) {
  return {
    id: r.id,
    condominiumId: r.condominiumId,
    unitId: r.unitId,
    unitLabel: uLabel,
    area: r.area,
    startsAt: iso(r.startsAt),
    endsAt: iso(r.endsAt),
    status: r.status,
    notes: r.notes,
    createdAt: iso(r.createdAt),
  };
}

router.get(
  "/reservations",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select({
        r: reservationsTable,
        uBlock: unitsTable.block,
        uNumber: unitsTable.number,
      })
      .from(reservationsTable)
      .leftJoin(unitsTable, eq(unitsTable.id, reservationsTable.unitId))
      .where(eq(reservationsTable.condominiumId, req.auth!.condominiumId))
      .orderBy(reservationsTable.startsAt);
    res.json(
      rows.map((row) =>
        serialize(
          row.r,
          row.uNumber
            ? row.uBlock
              ? `${row.uBlock}-${row.uNumber}`
              : row.uNumber
            : null,
        ),
      ),
    );
  },
);

router.post(
  "/reservations",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateReservationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const startsAt = parseDate(d.startsAt);
    const endsAt = parseDate(d.endsAt);
    if (!startsAt || !endsAt) {
      res.status(400).json({ error: "Datas inválidas" });
      return;
    }
    const [r] = await db
      .insert(reservationsTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        unitId: d.unitId ?? null,
        area: d.area,
        startsAt,
        endsAt,
        status: d.status,
        notes: d.notes ?? null,
      })
      .returning();
    await logActivity(req.auth, "create", "reservation", r.id, `Reserva de ${r.area} criada`);
    res.json(serialize(r, null));
  },
);

router.patch(
  "/reservations/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateReservationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const startsAt = parseDate(d.startsAt);
    const endsAt = parseDate(d.endsAt);
    if (!startsAt || !endsAt) {
      res.status(400).json({ error: "Datas inválidas" });
      return;
    }
    const [r] = await db
      .update(reservationsTable)
      .set({
        unitId: d.unitId ?? null,
        area: d.area,
        startsAt,
        endsAt,
        status: d.status,
        notes: d.notes ?? null,
      })
      .where(
        and(
          eq(reservationsTable.id, id),
          eq(reservationsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!r) {
      res.status(404).json({ error: "Reserva não encontrada" });
      return;
    }
    await logActivity(req.auth, "update", "reservation", r.id, `Reserva de ${r.area} atualizada`);
    res.json(serialize(r, null));
  },
);

router.delete(
  "/reservations/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [r] = await db
      .delete(reservationsTable)
      .where(
        and(
          eq(reservationsTable.id, id),
          eq(reservationsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!r) {
      res.status(404).json({ error: "Reserva não encontrada" });
      return;
    }
    await logActivity(req.auth, "delete", "reservation", id, `Reserva removida`);
    res.json({ success: true });
  },
);

export default router;
