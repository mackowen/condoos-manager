import { Router, type IRouter, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, contractsTable, suppliersTable } from "@workspace/db";
import { CreateContractBody, UpdateContractBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, n, parseDate } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

function serialize(
  c: typeof contractsTable.$inferSelect,
  supplierName: string | null,
) {
  return {
    id: c.id,
    condominiumId: c.condominiumId,
    supplierId: c.supplierId,
    supplierName,
    title: c.title,
    category: c.category,
    startsOn: iso(c.startsOn),
    endsOn: iso(c.endsOn),
    monthlyValue: n(c.monthlyValue),
    status: c.status,
    notes: c.notes,
    createdAt: iso(c.createdAt),
  };
}

router.get(
  "/contracts",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select({ c: contractsTable, supplierName: suppliersTable.name })
      .from(contractsTable)
      .leftJoin(suppliersTable, eq(suppliersTable.id, contractsTable.supplierId))
      .where(eq(contractsTable.condominiumId, req.auth!.condominiumId))
      .orderBy(desc(contractsTable.endsOn));
    res.json(rows.map((r) => serialize(r.c, r.supplierName)));
  },
);

router.post(
  "/contracts",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateContractBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const startsOn = parseDate(d.startsOn);
    const endsOn = parseDate(d.endsOn);
    if (!startsOn || !endsOn) {
      res.status(400).json({ error: "Datas inválidas" });
      return;
    }
    const [c] = await db
      .insert(contractsTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        supplierId: d.supplierId ?? null,
        title: d.title,
        category: d.category,
        startsOn,
        endsOn,
        monthlyValue: String(d.monthlyValue),
        status: d.status,
        notes: d.notes ?? null,
      })
      .returning();
    await logActivity(req.auth, "create", "contract", c.id, `Contrato "${c.title}" criado`);
    res.json(serialize(c, null));
  },
);

router.patch(
  "/contracts/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateContractBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const startsOn = parseDate(d.startsOn);
    const endsOn = parseDate(d.endsOn);
    if (!startsOn || !endsOn) {
      res.status(400).json({ error: "Datas inválidas" });
      return;
    }
    const [c] = await db
      .update(contractsTable)
      .set({
        supplierId: d.supplierId ?? null,
        title: d.title,
        category: d.category,
        startsOn,
        endsOn,
        monthlyValue: String(d.monthlyValue),
        status: d.status,
        notes: d.notes ?? null,
      })
      .where(
        and(
          eq(contractsTable.id, id),
          eq(contractsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!c) {
      res.status(404).json({ error: "Contrato não encontrado" });
      return;
    }
    await logActivity(req.auth, "update", "contract", c.id, `Contrato "${c.title}" atualizado`);
    res.json(serialize(c, null));
  },
);

router.delete(
  "/contracts/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [c] = await db
      .delete(contractsTable)
      .where(
        and(
          eq(contractsTable.id, id),
          eq(contractsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!c) {
      res.status(404).json({ error: "Contrato não encontrado" });
      return;
    }
    await logActivity(req.auth, "delete", "contract", id, `Contrato removido`);
    res.json({ success: true });
  },
);

export default router;
