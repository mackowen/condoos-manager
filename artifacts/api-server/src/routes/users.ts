import { Router, type IRouter, type Response } from "express";
import { and, eq, ilike, or } from "drizzle-orm";
import { db, usersTable, rolesTable } from "@workspace/db";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";
import { requireAuth, hashPassword, type AuthedRequest } from "../lib/auth";
import { serializeUser } from "./auth";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

async function loadWithRole(
  condId: string,
  search?: string,
): Promise<Array<ReturnType<typeof serializeUser>>> {
  const conds = [eq(usersTable.condominiumId, condId)];
  if (search) {
    const s = `%${search}%`;
    conds.push(
      or(ilike(usersTable.name, s), ilike(usersTable.email, s)) as never,
    );
  }
  const rows = await db
    .select({
      user: usersTable,
      roleName: rolesTable.name,
    })
    .from(usersTable)
    .leftJoin(rolesTable, eq(rolesTable.id, usersTable.roleId))
    .where(and(...conds));
  return rows.map((r) => serializeUser(r.user, r.roleName));
}

router.get(
  "/users",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;
    const users = await loadWithRole(req.auth!.condominiumId, search);
    res.json(users);
  },
);

router.post(
  "/users",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { email, name, password, roleId, active } = parsed.data;
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()));
    if (existing) {
      res.status(409).json({ error: "E-mail já cadastrado" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [u] = await db
      .insert(usersTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        email: email.toLowerCase(),
        name,
        passwordHash,
        roleId: roleId ?? null,
        active: active ?? true,
      })
      .returning();
    let roleName: string | null = null;
    if (u.roleId) {
      const [r] = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.id, u.roleId));
      roleName = r?.name ?? null;
    }
    await logActivity(req.auth, "create", "user", u.id, `Usuário ${u.name} criado`);
    res.json(serializeUser(u, roleName));
  },
);

router.patch(
  "/users/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const update: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.roleId !== undefined) update.roleId = parsed.data.roleId;
    if (parsed.data.active !== undefined) update.active = parsed.data.active;
    if (parsed.data.password) {
      update.passwordHash = await hashPassword(parsed.data.password);
    }
    const [u] = await db
      .update(usersTable)
      .set(update)
      .where(
        and(
          eq(usersTable.id, id),
          eq(usersTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!u) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    let roleName: string | null = null;
    if (u.roleId) {
      const [r] = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.id, u.roleId));
      roleName = r?.name ?? null;
    }
    await logActivity(req.auth, "update", "user", u.id, `Usuário ${u.name} atualizado`);
    res.json(serializeUser(u, roleName));
  },
);

router.delete(
  "/users/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    if (id === req.auth!.userId) {
      res.status(400).json({ error: "Não é possível excluir o próprio usuário" });
      return;
    }
    const [u] = await db
      .delete(usersTable)
      .where(
        and(
          eq(usersTable.id, id),
          eq(usersTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!u) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    await logActivity(req.auth, "delete", "user", id, `Usuário ${u.name} excluído`);
    res.json({ success: true });
  },
);

export default router;
