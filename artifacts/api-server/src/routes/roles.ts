import { Router, type IRouter, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, rolesTable } from "@workspace/db";
import { CreateRoleBody, UpdateRoleBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

function serialize(r: typeof rolesTable.$inferSelect) {
  return {
    id: r.id,
    condominiumId: r.condominiumId,
    name: r.name,
    description: r.description,
    permissions: r.permissions ?? [],
    createdAt: iso(r.createdAt),
  };
}

router.get(
  "/roles",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.condominiumId, req.auth!.condominiumId));
    res.json(rows.map(serialize));
  },
);

router.post(
  "/roles",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateRoleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [r] = await db
      .insert(rolesTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        permissions: parsed.data.permissions,
      })
      .returning();
    await logActivity(req.auth, "create", "role", r.id, `Perfil ${r.name} criado`);
    res.json(serialize(r));
  },
);

router.patch(
  "/roles/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateRoleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [r] = await db
      .update(rolesTable)
      .set({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        permissions: parsed.data.permissions,
      })
      .where(
        and(
          eq(rolesTable.id, id),
          eq(rolesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!r) {
      res.status(404).json({ error: "Perfil não encontrado" });
      return;
    }
    await logActivity(req.auth, "update", "role", r.id, `Perfil ${r.name} atualizado`);
    res.json(serialize(r));
  },
);

router.delete(
  "/roles/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [r] = await db
      .delete(rolesTable)
      .where(
        and(
          eq(rolesTable.id, id),
          eq(rolesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!r) {
      res.status(404).json({ error: "Perfil não encontrado" });
      return;
    }
    await logActivity(req.auth, "delete", "role", id, `Perfil ${r.name} excluído`);
    res.json({ success: true });
  },
);

export default router;
