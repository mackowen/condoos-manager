import { Router, type IRouter, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db, activityLogsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso } from "../lib/serialize";

const router: IRouter = Router();

export function serializeLog(l: typeof activityLogsTable.$inferSelect) {
  return {
    id: l.id,
    condominiumId: l.condominiumId,
    userId: l.userId,
    userName: l.userName,
    action: l.action,
    entity: l.entity,
    entityId: l.entityId,
    message: l.message,
    createdAt: iso(l.createdAt),
  };
}

router.get(
  "/logs",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(activityLogsTable)
      .where(eq(activityLogsTable.condominiumId, req.auth!.condominiumId))
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(500);
    res.json(rows.map(serializeLog));
  },
);

export default router;
