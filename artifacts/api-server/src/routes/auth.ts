import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  condominiumsTable,
  usersTable,
  rolesTable,
} from "@workspace/db";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import {
  signToken,
  hashPassword,
  comparePassword,
  requireAuth,
  type AuthedRequest,
} from "../lib/auth";
import { iso, n } from "../lib/serialize";

const router: IRouter = Router();

function serializeCondominium(c: typeof condominiumsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    address: c.address,
    cnpj: c.cnpj,
    logoUrl: c.logoUrl,
    primaryColor: c.primaryColor,
    finePercent: n(c.finePercent),
    interestPercent: n(c.interestPercent),
    modules: c.modules ?? [],
    createdAt: iso(c.createdAt),
  };
}

function serializeUser(
  u: typeof usersTable.$inferSelect,
  roleName: string | null = null,
) {
  return {
    id: u.id,
    condominiumId: u.condominiumId,
    email: u.email,
    name: u.name,
    roleId: u.roleId,
    roleName,
    active: u.active,
    createdAt: iso(u.createdAt),
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));
  if (!user || !user.active) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }
  const [cond] = await db
    .select()
    .from(condominiumsTable)
    .where(eq(condominiumsTable.id, user.condominiumId));
  if (!cond) {
    res.status(401).json({ error: "Condomínio não encontrado" });
    return;
  }
  let roleName: string | null = null;
  if (user.roleId) {
    const [role] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, user.roleId));
    roleName = role?.name ?? null;
  }
  const token = signToken({
    userId: user.id,
    condominiumId: user.condominiumId,
    email: user.email,
  });
  res.json({
    token,
    user: serializeUser(user, roleName),
    condominium: serializeCondominium(cond),
  });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }
  const { condominiumName, adminName, email, password } = parsed.data;
  const lower = email.toLowerCase();
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, lower));
  if (existing) {
    res.status(409).json({ error: "E-mail já cadastrado" });
    return;
  }
  const [cond] = await db
    .insert(condominiumsTable)
    .values({ name: condominiumName })
    .returning();
  const [adminRole] = await db
    .insert(rolesTable)
    .values({
      condominiumId: cond.id,
      name: "Administrador",
      description: "Acesso total ao sistema",
      permissions: ["*"],
    })
    .returning();
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({
      condominiumId: cond.id,
      email: lower,
      name: adminName,
      passwordHash,
      roleId: adminRole.id,
      active: true,
    })
    .returning();
  const token = signToken({
    userId: user.id,
    condominiumId: cond.id,
    email: user.email,
  });
  res.json({
    token,
    user: serializeUser(user, adminRole.name),
    condominium: serializeCondominium(cond),
  });
});

router.get(
  "/auth/me",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.auth!.userId));
    if (!user) {
      res.status(401).json({ error: "Sessão inválida" });
      return;
    }
    const [cond] = await db
      .select()
      .from(condominiumsTable)
      .where(eq(condominiumsTable.id, user.condominiumId));
    if (!cond) {
      res.status(401).json({ error: "Condomínio não encontrado" });
      return;
    }
    let roleName: string | null = null;
    let permissions: string[] = [];
    if (user.roleId) {
      const [role] = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.id, user.roleId));
      if (role) {
        roleName = role.name;
        permissions = role.permissions ?? [];
      }
    }
    res.json({
      user: serializeUser(user, roleName),
      condominium: serializeCondominium(cond),
      permissions,
    });
  },
);

export default router;
export { serializeCondominium, serializeUser };
