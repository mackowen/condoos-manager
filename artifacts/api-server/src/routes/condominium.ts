import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, condominiumsTable } from "@workspace/db";
import { UpdateCurrentCondominiumBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { serializeCondominium } from "./auth";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

router.get(
  "/condominiums/current",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const [c] = await db
      .select()
      .from(condominiumsTable)
      .where(eq(condominiumsTable.id, req.auth!.condominiumId));
    if (!c) {
      res.status(404).json({ error: "Condomínio não encontrado" });
      return;
    }
    res.json(serializeCondominium(c));
  },
);

router.patch(
  "/condominiums/current",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = UpdateCurrentCondominiumBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const data = parsed.data;
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.address !== undefined) update.address = data.address;
    if (data.cnpj !== undefined) update.cnpj = data.cnpj;
    if (data.logoUrl !== undefined) update.logoUrl = data.logoUrl;
    if (data.primaryColor !== undefined) update.primaryColor = data.primaryColor;
    if (data.finePercent !== undefined)
      update.finePercent = String(data.finePercent);
    if (data.interestPercent !== undefined)
      update.interestPercent = String(data.interestPercent);
    if (data.modules !== undefined) update.modules = data.modules;

    const [c] = await db
      .update(condominiumsTable)
      .set(update)
      .where(eq(condominiumsTable.id, req.auth!.condominiumId))
      .returning();
    if (!c) {
      res.status(404).json({ error: "Condomínio não encontrado" });
      return;
    }
    await logActivity(
      req.auth,
      "update",
      "condominium",
      c.id,
      "Configurações do condomínio atualizadas",
    );
    res.json(serializeCondominium(c));
  },
);

export default router;
