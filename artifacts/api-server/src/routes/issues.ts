import { Router, type IRouter, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, issuesTable, unitsTable } from "@workspace/db";
import { CreateIssueBody, UpdateIssueBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

function serialize(
  i: typeof issuesTable.$inferSelect,
  uLabel: string | null,
) {
  return {
    id: i.id,
    condominiumId: i.condominiumId,
    unitId: i.unitId,
    unitLabel: uLabel,
    title: i.title,
    description: i.description,
    category: i.category,
    priority: i.priority,
    status: i.status,
    reportedBy: i.reportedBy,
    createdAt: iso(i.createdAt),
  };
}

async function loadList(condId: string) {
  const rows = await db
    .select({
      i: issuesTable,
      uBlock: unitsTable.block,
      uNumber: unitsTable.number,
    })
    .from(issuesTable)
    .leftJoin(unitsTable, eq(unitsTable.id, issuesTable.unitId))
    .where(eq(issuesTable.condominiumId, condId))
    .orderBy(desc(issuesTable.createdAt));
  return rows.map((row) =>
    serialize(
      row.i,
      row.uNumber
        ? row.uBlock
          ? `${row.uBlock}-${row.uNumber}`
          : row.uNumber
        : null,
    ),
  );
}

router.get(
  "/issues",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    res.json(await loadList(req.auth!.condominiumId));
  },
);

router.post(
  "/issues",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateIssueBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [i] = await db
      .insert(issuesTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        unitId: d.unitId ?? null,
        title: d.title,
        description: d.description,
        category: d.category,
        priority: d.priority,
        status: d.status,
        reportedBy: d.reportedBy ?? null,
      })
      .returning();
    await logActivity(req.auth, "create", "issue", i.id, `Ocorrência "${i.title}" registrada`);
    res.json(serialize(i, null));
  },
);

router.patch(
  "/issues/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateIssueBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [i] = await db
      .update(issuesTable)
      .set({
        unitId: d.unitId ?? null,
        title: d.title,
        description: d.description,
        category: d.category,
        priority: d.priority,
        status: d.status,
        reportedBy: d.reportedBy ?? null,
      })
      .where(
        and(
          eq(issuesTable.id, id),
          eq(issuesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!i) {
      res.status(404).json({ error: "Ocorrência não encontrada" });
      return;
    }
    await logActivity(req.auth, "update", "issue", i.id, `Ocorrência "${i.title}" atualizada`);
    res.json(serialize(i, null));
  },
);

router.delete(
  "/issues/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [i] = await db
      .delete(issuesTable)
      .where(
        and(
          eq(issuesTable.id, id),
          eq(issuesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!i) {
      res.status(404).json({ error: "Ocorrência não encontrada" });
      return;
    }
    await logActivity(req.auth, "delete", "issue", id, `Ocorrência "${i.title}" removida`);
    res.json({ success: true });
  },
);

export default router;
