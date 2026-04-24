import { Router, type IRouter, type Response } from "express";
import { and, eq, ilike, or } from "drizzle-orm";
import { db, residentsTable, unitsTable } from "@workspace/db";
import { CreateResidentBody, UpdateResidentBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, isoNullable, parseDate } from "../lib/serialize";
import { logActivity } from "../lib/activity";
import { unitLabel } from "./units";

const router: IRouter = Router();

function serialize(
  r: typeof residentsTable.$inferSelect,
  uLabel: string | null,
) {
  return {
    id: r.id,
    condominiumId: r.condominiumId,
    unitId: r.unitId,
    unitLabel: uLabel,
    name: r.name,
    email: r.email,
    phone: r.phone,
    document: r.document,
    kind: r.kind,
    moveInDate: isoNullable(r.moveInDate),
    active: r.active,
    createdAt: iso(r.createdAt),
  };
}

async function loadList(condId: string, search?: string) {
  const conds = [eq(residentsTable.condominiumId, condId)];
  if (search) {
    const s = `%${search}%`;
    conds.push(
      or(
        ilike(residentsTable.name, s),
        ilike(residentsTable.email, s),
        ilike(residentsTable.phone, s),
        ilike(residentsTable.document, s),
      ) as never,
    );
  }
  const rows = await db
    .select({
      r: residentsTable,
      uBlock: unitsTable.block,
      uNumber: unitsTable.number,
    })
    .from(residentsTable)
    .leftJoin(unitsTable, eq(unitsTable.id, residentsTable.unitId))
    .where(and(...conds))
    .orderBy(residentsTable.name);
  return rows.map((row) =>
    serialize(
      row.r,
      row.uNumber
        ? row.uBlock
          ? `${row.uBlock}-${row.uNumber}`
          : row.uNumber
        : null,
    ),
  );
}

router.get(
  "/residents",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;
    res.json(await loadList(req.auth!.condominiumId, search));
  },
);

router.post(
  "/residents",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateResidentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [r] = await db
      .insert(residentsTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        unitId: d.unitId ?? null,
        name: d.name,
        email: d.email ?? null,
        phone: d.phone ?? null,
        document: d.document ?? null,
        kind: d.kind,
        moveInDate: parseDate(d.moveInDate),
        active: d.active ?? true,
      })
      .returning();
    let uLabel: string | null = null;
    if (r.unitId) {
      const [u] = await db
        .select()
        .from(unitsTable)
        .where(eq(unitsTable.id, r.unitId));
      uLabel = unitLabel(u);
    }
    await logActivity(req.auth, "create", "resident", r.id, `Morador ${r.name} cadastrado`);
    res.json(serialize(r, uLabel));
  },
);

router.patch(
  "/residents/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateResidentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [r] = await db
      .update(residentsTable)
      .set({
        unitId: d.unitId ?? null,
        name: d.name,
        email: d.email ?? null,
        phone: d.phone ?? null,
        document: d.document ?? null,
        kind: d.kind,
        moveInDate: parseDate(d.moveInDate),
        active: d.active ?? true,
      })
      .where(
        and(
          eq(residentsTable.id, id),
          eq(residentsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!r) {
      res.status(404).json({ error: "Morador não encontrado" });
      return;
    }
    let uLabel: string | null = null;
    if (r.unitId) {
      const [u] = await db
        .select()
        .from(unitsTable)
        .where(eq(unitsTable.id, r.unitId));
      uLabel = unitLabel(u);
    }
    await logActivity(req.auth, "update", "resident", r.id, `Morador ${r.name} atualizado`);
    res.json(serialize(r, uLabel));
  },
);

router.delete(
  "/residents/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [r] = await db
      .delete(residentsTable)
      .where(
        and(
          eq(residentsTable.id, id),
          eq(residentsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!r) {
      res.status(404).json({ error: "Morador não encontrado" });
      return;
    }
    await logActivity(req.auth, "delete", "resident", id, `Morador ${r.name} removido`);
    res.json({ success: true });
  },
);

export default router;
