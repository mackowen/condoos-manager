import { Router, type IRouter, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, documentsTable } from "@workspace/db";
import { CreateDocumentBody, UpdateDocumentBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

function serialize(d: typeof documentsTable.$inferSelect) {
  return {
    id: d.id,
    condominiumId: d.condominiumId,
    title: d.title,
    category: d.category,
    url: d.url,
    sizeKb: d.sizeKb,
    uploadedBy: d.uploadedBy,
    createdAt: iso(d.createdAt),
  };
}

router.get(
  "/documents",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.condominiumId, req.auth!.condominiumId))
      .orderBy(desc(documentsTable.createdAt));
    res.json(rows.map(serialize));
  },
);

router.post(
  "/documents",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [row] = await db
      .insert(documentsTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        title: d.title,
        category: d.category,
        url: d.url ?? null,
        sizeKb: d.sizeKb ?? null,
        uploadedBy: d.uploadedBy ?? req.auth!.email,
      })
      .returning();
    await logActivity(req.auth, "create", "document", row.id, `Documento "${row.title}" enviado`);
    res.json(serialize(row));
  },
);

router.patch(
  "/documents/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [row] = await db
      .update(documentsTable)
      .set({
        title: d.title,
        category: d.category,
        url: d.url ?? null,
        sizeKb: d.sizeKb ?? null,
        uploadedBy: d.uploadedBy ?? null,
      })
      .where(
        and(
          eq(documentsTable.id, id),
          eq(documentsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Documento não encontrado" });
      return;
    }
    await logActivity(req.auth, "update", "document", row.id, `Documento "${row.title}" atualizado`);
    res.json(serialize(row));
  },
);

router.delete(
  "/documents/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [row] = await db
      .delete(documentsTable)
      .where(
        and(
          eq(documentsTable.id, id),
          eq(documentsTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Documento não encontrado" });
      return;
    }
    await logActivity(req.auth, "delete", "document", id, `Documento removido`);
    res.json({ success: true });
  },
);

export default router;
