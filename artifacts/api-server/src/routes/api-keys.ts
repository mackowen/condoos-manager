import { Router, type IRouter, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { db, apiKeysTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/auth";

const router: IRouter = Router();

function generateKey(): { plaintext: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const plaintext = `condo_${raw}`;
  const prefix = plaintext.substring(0, 12);
  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, prefix, hash };
}

function iso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

router.get(
  "/api-keys",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const condId = req.auth!.condominiumId;
    const keys = await db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        keyPrefix: apiKeysTable.keyPrefix,
        permissions: apiKeysTable.permissions,
        isActive: apiKeysTable.isActive,
        lastUsedAt: apiKeysTable.lastUsedAt,
        expiresAt: apiKeysTable.expiresAt,
        createdAt: apiKeysTable.createdAt,
      })
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.condominiumId, condId),
          eq(apiKeysTable.isActive, true),
        ),
      )
      .orderBy(desc(apiKeysTable.createdAt));

    res.json(
      keys.map((k) => ({
        ...k,
        lastUsedAt: iso(k.lastUsedAt),
        expiresAt: iso(k.expiresAt),
        createdAt: iso(k.createdAt),
      })),
    );
  },
);

router.post(
  "/api-keys",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const condId = req.auth!.condominiumId;
    const userId = req.auth!.userId;
    const { name, permissions = [] } = req.body as {
      name: string;
      permissions?: string[];
    };

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "Nome é obrigatório (mínimo 2 caracteres)" });
      return;
    }

    const { plaintext, prefix, hash } = generateKey();

    const [key] = await db
      .insert(apiKeysTable)
      .values({
        condominiumId: condId,
        createdById: userId,
        name: name.trim(),
        keyPrefix: prefix,
        keyHash: hash,
        permissions: Array.isArray(permissions) ? permissions : [],
        isActive: true,
      })
      .returning();

    res.status(201).json({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      isActive: key.isActive,
      createdAt: key.createdAt.toISOString(),
      plaintext,
    });
  },
);

router.patch(
  "/api-keys/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const condId = req.auth!.condominiumId;
    const { name, permissions } = req.body as {
      name?: string;
      permissions?: string[];
    };

    const [key] = await db
      .update(apiKeysTable)
      .set({
        ...(name ? { name: name.trim() } : {}),
        ...(permissions ? { permissions } : {}),
      })
      .where(
        and(eq(apiKeysTable.id, id), eq(apiKeysTable.condominiumId, condId)),
      )
      .returning();

    if (!key) {
      res.status(404).json({ error: "Chave não encontrada" });
      return;
    }

    res.json({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      isActive: key.isActive,
      createdAt: key.createdAt.toISOString(),
    });
  },
);

router.delete(
  "/api-keys/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const condId = req.auth!.condominiumId;

    const [key] = await db
      .update(apiKeysTable)
      .set({ isActive: false })
      .where(
        and(eq(apiKeysTable.id, id), eq(apiKeysTable.condominiumId, condId)),
      )
      .returning();

    if (!key) {
      res.status(404).json({ error: "Chave não encontrada" });
      return;
    }

    res.status(204).end();
  },
);

export default router;
