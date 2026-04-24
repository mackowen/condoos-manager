import { Router, type IRouter, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, vehiclesTable, unitsTable } from "@workspace/db";
import { CreateVehicleBody, UpdateVehicleBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

function serialize(
  v: typeof vehiclesTable.$inferSelect,
  uLabel: string | null,
) {
  return {
    id: v.id,
    condominiumId: v.condominiumId,
    unitId: v.unitId,
    unitLabel: uLabel,
    plate: v.plate,
    model: v.model,
    color: v.color,
    kind: v.kind,
    ownerName: v.ownerName,
    parkingSpot: v.parkingSpot,
    createdAt: iso(v.createdAt),
  };
}

router.get(
  "/vehicles",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select({
        v: vehiclesTable,
        uBlock: unitsTable.block,
        uNumber: unitsTable.number,
      })
      .from(vehiclesTable)
      .leftJoin(unitsTable, eq(unitsTable.id, vehiclesTable.unitId))
      .where(eq(vehiclesTable.condominiumId, req.auth!.condominiumId))
      .orderBy(vehiclesTable.plate);
    res.json(
      rows.map((row) =>
        serialize(
          row.v,
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
  "/vehicles",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateVehicleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [v] = await db
      .insert(vehiclesTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        unitId: d.unitId ?? null,
        plate: d.plate.toUpperCase(),
        model: d.model ?? null,
        color: d.color ?? null,
        kind: d.kind,
        ownerName: d.ownerName ?? null,
        parkingSpot: d.parkingSpot ?? null,
      })
      .returning();
    await logActivity(req.auth, "create", "vehicle", v.id, `Veículo ${v.plate} cadastrado`);
    res.json(serialize(v, null));
  },
);

router.patch(
  "/vehicles/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateVehicleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [v] = await db
      .update(vehiclesTable)
      .set({
        unitId: d.unitId ?? null,
        plate: d.plate.toUpperCase(),
        model: d.model ?? null,
        color: d.color ?? null,
        kind: d.kind,
        ownerName: d.ownerName ?? null,
        parkingSpot: d.parkingSpot ?? null,
      })
      .where(
        and(
          eq(vehiclesTable.id, id),
          eq(vehiclesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!v) {
      res.status(404).json({ error: "Veículo não encontrado" });
      return;
    }
    await logActivity(req.auth, "update", "vehicle", v.id, `Veículo ${v.plate} atualizado`);
    res.json(serialize(v, null));
  },
);

router.delete(
  "/vehicles/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [v] = await db
      .delete(vehiclesTable)
      .where(
        and(
          eq(vehiclesTable.id, id),
          eq(vehiclesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!v) {
      res.status(404).json({ error: "Veículo não encontrado" });
      return;
    }
    await logActivity(req.auth, "delete", "vehicle", id, `Veículo ${v.plate} removido`);
    res.json({ success: true });
  },
);

export default router;
