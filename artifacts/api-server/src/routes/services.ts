import { Router, type IRouter, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, serviceOrdersTable, suppliersTable } from "@workspace/db";
import { CreateServiceBody, UpdateServiceBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, isoNullable, nNullable, parseDate } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

function serialize(
  s: typeof serviceOrdersTable.$inferSelect,
  supplierName: string | null,
) {
  return {
    id: s.id,
    condominiumId: s.condominiumId,
    title: s.title,
    description: s.description,
    supplierId: s.supplierId,
    supplierName,
    status: s.status,
    priority: s.priority,
    scheduledFor: isoNullable(s.scheduledFor),
    cost: nNullable(s.cost),
    createdAt: iso(s.createdAt),
  };
}

router.get(
  "/services",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select({ s: serviceOrdersTable, supplierName: suppliersTable.name })
      .from(serviceOrdersTable)
      .leftJoin(suppliersTable, eq(suppliersTable.id, serviceOrdersTable.supplierId))
      .where(eq(serviceOrdersTable.condominiumId, req.auth!.condominiumId))
      .orderBy(desc(serviceOrdersTable.createdAt));
    res.json(rows.map((r) => serialize(r.s, r.supplierName)));
  },
);

router.post(
  "/services",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateServiceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [s] = await db
      .insert(serviceOrdersTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        title: d.title,
        description: d.description,
        supplierId: d.supplierId ?? null,
        status: d.status,
        priority: d.priority,
        scheduledFor: parseDate(d.scheduledFor),
        cost: d.cost != null ? String(d.cost) : null,
      })
      .returning();
    await logActivity(req.auth, "create", "service", s.id, `Ordem de serviço "${s.title}" aberta`);
    res.json(serialize(s, null));
  },
);

router.patch(
  "/services/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateServiceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [s] = await db
      .update(serviceOrdersTable)
      .set({
        title: d.title,
        description: d.description,
        supplierId: d.supplierId ?? null,
        status: d.status,
        priority: d.priority,
        scheduledFor: parseDate(d.scheduledFor),
        cost: d.cost != null ? String(d.cost) : null,
      })
      .where(
        and(
          eq(serviceOrdersTable.id, id),
          eq(serviceOrdersTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!s) {
      res.status(404).json({ error: "Ordem de serviço não encontrada" });
      return;
    }
    await logActivity(req.auth, "update", "service", s.id, `Ordem de serviço "${s.title}" atualizada`);
    res.json(serialize(s, null));
  },
);

router.delete(
  "/services/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [s] = await db
      .delete(serviceOrdersTable)
      .where(
        and(
          eq(serviceOrdersTable.id, id),
          eq(serviceOrdersTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!s) {
      res.status(404).json({ error: "Ordem de serviço não encontrada" });
      return;
    }
    await logActivity(req.auth, "delete", "service", id, `Ordem de serviço removida`);
    res.json({ success: true });
  },
);

export default router;
