import { Router, type IRouter, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, suppliersTable } from "@workspace/db";
import { CreateSupplierBody, UpdateSupplierBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, nNullable } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

function serialize(s: typeof suppliersTable.$inferSelect) {
  return {
    id: s.id,
    condominiumId: s.condominiumId,
    name: s.name,
    category: s.category,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    document: s.document,
    rating: nNullable(s.rating),
    notes: s.notes,
    createdAt: iso(s.createdAt),
  };
}

router.get(
  "/suppliers",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.condominiumId, req.auth!.condominiumId))
      .orderBy(suppliersTable.name);
    res.json(rows.map(serialize));
  },
);

router.post(
  "/suppliers",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateSupplierBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [s] = await db
      .insert(suppliersTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        name: d.name,
        category: d.category,
        contactName: d.contactName ?? null,
        email: d.email ?? null,
        phone: d.phone ?? null,
        document: d.document ?? null,
        rating: d.rating != null ? String(d.rating) : null,
        notes: d.notes ?? null,
      })
      .returning();
    await logActivity(req.auth, "create", "supplier", s.id, `Fornecedor "${s.name}" cadastrado`);
    res.json(serialize(s));
  },
);

router.patch(
  "/suppliers/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateSupplierBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [s] = await db
      .update(suppliersTable)
      .set({
        name: d.name,
        category: d.category,
        contactName: d.contactName ?? null,
        email: d.email ?? null,
        phone: d.phone ?? null,
        document: d.document ?? null,
        rating: d.rating != null ? String(d.rating) : null,
        notes: d.notes ?? null,
      })
      .where(
        and(
          eq(suppliersTable.id, id),
          eq(suppliersTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!s) {
      res.status(404).json({ error: "Fornecedor não encontrado" });
      return;
    }
    await logActivity(req.auth, "update", "supplier", s.id, `Fornecedor "${s.name}" atualizado`);
    res.json(serialize(s));
  },
);

router.delete(
  "/suppliers/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [s] = await db
      .delete(suppliersTable)
      .where(
        and(
          eq(suppliersTable.id, id),
          eq(suppliersTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!s) {
      res.status(404).json({ error: "Fornecedor não encontrado" });
      return;
    }
    await logActivity(req.auth, "delete", "supplier", id, `Fornecedor removido`);
    res.json({ success: true });
  },
);

export default router;
