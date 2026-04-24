import { Router, type IRouter, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, deliveriesTable, unitsTable } from "@workspace/db";
import { CreateDeliveryBody, UpdateDeliveryBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, isoNullable, parseDate } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

function serialize(
  d: typeof deliveriesTable.$inferSelect,
  uLabel: string | null,
) {
  return {
    id: d.id,
    condominiumId: d.condominiumId,
    unitId: d.unitId,
    unitLabel: uLabel,
    recipient: d.recipient,
    carrier: d.carrier,
    trackingCode: d.trackingCode,
    status: d.status,
    receivedAt: iso(d.receivedAt),
    pickedUpAt: isoNullable(d.pickedUpAt),
    notes: d.notes,
    createdAt: iso(d.createdAt),
  };
}

router.get(
  "/deliveries",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select({
        d: deliveriesTable,
        uBlock: unitsTable.block,
        uNumber: unitsTable.number,
      })
      .from(deliveriesTable)
      .leftJoin(unitsTable, eq(unitsTable.id, deliveriesTable.unitId))
      .where(eq(deliveriesTable.condominiumId, req.auth!.condominiumId))
      .orderBy(desc(deliveriesTable.receivedAt));
    res.json(
      rows.map((row) =>
        serialize(
          row.d,
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
  "/deliveries",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateDeliveryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [row] = await db
      .insert(deliveriesTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        unitId: d.unitId ?? null,
        recipient: d.recipient,
        carrier: d.carrier ?? null,
        trackingCode: d.trackingCode ?? null,
        status: d.status,
        receivedAt: parseDate(d.receivedAt) ?? new Date(),
        pickedUpAt: parseDate(d.pickedUpAt),
        notes: d.notes ?? null,
      })
      .returning();
    await logActivity(req.auth, "create", "delivery", row.id, `Encomenda para ${row.recipient} registrada`);
    res.json(serialize(row, null));
  },
);

router.patch(
  "/deliveries/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateDeliveryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [row] = await db
      .update(deliveriesTable)
      .set({
        unitId: d.unitId ?? null,
        recipient: d.recipient,
        carrier: d.carrier ?? null,
        trackingCode: d.trackingCode ?? null,
        status: d.status,
        receivedAt: parseDate(d.receivedAt) ?? new Date(),
        pickedUpAt: parseDate(d.pickedUpAt),
        notes: d.notes ?? null,
      })
      .where(
        and(
          eq(deliveriesTable.id, id),
          eq(deliveriesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Encomenda não encontrada" });
      return;
    }
    await logActivity(req.auth, "update", "delivery", row.id, `Encomenda de ${row.recipient} atualizada`);
    res.json(serialize(row, null));
  },
);

router.delete(
  "/deliveries/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [row] = await db
      .delete(deliveriesTable)
      .where(
        and(
          eq(deliveriesTable.id, id),
          eq(deliveriesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Encomenda não encontrada" });
      return;
    }
    await logActivity(req.auth, "delete", "delivery", id, `Encomenda removida`);
    res.json({ success: true });
  },
);

export default router;
