import { Router, type IRouter, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, noticesTable } from "@workspace/db";
import { CreateNoticeBody, UpdateNoticeBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, parseDate } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

function serialize(n: typeof noticesTable.$inferSelect) {
  return {
    id: n.id,
    condominiumId: n.condominiumId,
    title: n.title,
    body: n.body,
    category: n.category,
    priority: n.priority,
    publishedAt: iso(n.publishedAt),
    createdAt: iso(n.createdAt),
  };
}

router.get(
  "/notices",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(noticesTable)
      .where(eq(noticesTable.condominiumId, req.auth!.condominiumId))
      .orderBy(desc(noticesTable.publishedAt));
    res.json(rows.map(serialize));
  },
);

router.post(
  "/notices",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateNoticeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [n] = await db
      .insert(noticesTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        title: d.title,
        body: d.body,
        category: d.category,
        priority: d.priority,
        publishedAt: parseDate(d.publishedAt) ?? new Date(),
      })
      .returning();
    await logActivity(req.auth, "create", "notice", n.id, `Aviso "${n.title}" publicado`);
    res.json(serialize(n));
  },
);

router.patch(
  "/notices/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateNoticeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [n] = await db
      .update(noticesTable)
      .set({
        title: d.title,
        body: d.body,
        category: d.category,
        priority: d.priority,
        publishedAt: parseDate(d.publishedAt) ?? new Date(),
      })
      .where(
        and(
          eq(noticesTable.id, id),
          eq(noticesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!n) {
      res.status(404).json({ error: "Aviso não encontrado" });
      return;
    }
    await logActivity(req.auth, "update", "notice", n.id, `Aviso "${n.title}" atualizado`);
    res.json(serialize(n));
  },
);

router.delete(
  "/notices/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [n] = await db
      .delete(noticesTable)
      .where(
        and(
          eq(noticesTable.id, id),
          eq(noticesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!n) {
      res.status(404).json({ error: "Aviso não encontrado" });
      return;
    }
    await logActivity(req.auth, "delete", "notice", id, `Aviso "${n.title}" removido`);
    res.json({ success: true });
  },
);

export default router;
