import { Router, type IRouter, type Response } from "express";
import { and, eq, ilike, or } from "drizzle-orm";
import { db, unitsTable } from "@workspace/db";
import { CreateUnitBody, UpdateUnitBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, nNullable } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

export function serializeUnit(u: typeof unitsTable.$inferSelect) {
  return {
    id: u.id,
    condominiumId: u.condominiumId,
    block: u.block,
    number: u.number,
    floor: u.floor,
    type: u.type,
    sizeM2: nNullable(u.sizeM2),
    parkingSpots: u.parkingSpots,
    ownerName: u.ownerName,
    notes: u.notes,
    createdAt: iso(u.createdAt),
  };
}

export function unitLabel(u: typeof unitsTable.$inferSelect | undefined): string | null {
  if (!u) return null;
  return u.block ? `${u.block}-${u.number}` : u.number;
}

router.get(
  "/units",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;
    const conds = [eq(unitsTable.condominiumId, req.auth!.condominiumId)];
    if (search) {
      const s = `%${search}%`;
      conds.push(
        or(
          ilike(unitsTable.number, s),
          ilike(unitsTable.block, s),
          ilike(unitsTable.ownerName, s),
        ) as never,
      );
    }
    const rows = await db
      .select()
      .from(unitsTable)
      .where(and(...conds))
      .orderBy(unitsTable.block, unitsTable.number);
    res.json(rows.map(serializeUnit));
  },
);

router.post(
  "/units",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateUnitBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [u] = await db
      .insert(unitsTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        block: d.block ?? null,
        number: d.number,
        floor: d.floor ?? null,
        type: d.type ?? null,
        sizeM2: d.sizeM2 != null ? String(d.sizeM2) : null,
        parkingSpots: d.parkingSpots ?? 0,
        ownerName: d.ownerName ?? null,
        notes: d.notes ?? null,
      })
      .returning();
    await logActivity(
      req.auth,
      "create",
      "unit",
      u.id,
      `Unidade ${unitLabel(u)} criada`,
    );
    res.json(serializeUnit(u));
  },
);

router.get(
  "/units/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [u] = await db
      .select()
      .from(unitsTable)
      .where(
        and(
          eq(unitsTable.id, id),
          eq(unitsTable.condominiumId, req.auth!.condominiumId),
        ),
      );
    if (!u) {
      res.status(404).json({ error: "Unidade não encontrada" });
      return;
    }
    res.json(serializeUnit(u));
  },
);

router.patch(
  "/units/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateUnitBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [u] = await db
      .update(unitsTable)
      .set({
        block: d.block ?? null,
        number: d.number,
        floor: d.floor ?? null,
        type: d.type ?? null,
        sizeM2: d.sizeM2 != null ? String(d.sizeM2) : null,
        parkingSpots: d.parkingSpots ?? 0,
        ownerName: d.ownerName ?? null,
        notes: d.notes ?? null,
      })
      .where(
        and(
          eq(unitsTable.id, id),
          eq(unitsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!u) {
      res.status(404).json({ error: "Unidade não encontrada" });
      return;
    }
    await logActivity(
      req.auth,
      "update",
      "unit",
      u.id,
      `Unidade ${unitLabel(u)} atualizada`,
    );
    res.json(serializeUnit(u));
  },
);

router.delete(
  "/units/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [u] = await db
      .delete(unitsTable)
      .where(
        and(
          eq(unitsTable.id, id),
          eq(unitsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!u) {
      res.status(404).json({ error: "Unidade não encontrada" });
      return;
    }
    await logActivity(
      req.auth,
      "delete",
      "unit",
      id,
      `Unidade ${unitLabel(u)} excluída`,
    );
    res.json({ success: true });
  },
);

export default router;
