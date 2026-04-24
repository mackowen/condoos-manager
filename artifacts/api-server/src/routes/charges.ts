import { Router, type IRouter, type Response } from "express";
import { and, eq, lt } from "drizzle-orm";
import {
  db,
  chargesTable,
  paymentsTable,
  unitsTable,
} from "@workspace/db";
import {
  CreateChargeBody,
  UpdateChargeBody,
  PayChargeBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, isoNullable, n, parseDate } from "../lib/serialize";
import { logActivity } from "../lib/activity";
import { unitLabel } from "./units";

const router: IRouter = Router();

function serialize(
  c: typeof chargesTable.$inferSelect,
  uLabel: string | null,
) {
  return {
    id: c.id,
    condominiumId: c.condominiumId,
    unitId: c.unitId,
    unitLabel: uLabel,
    type: c.type,
    category: c.category,
    description: c.description,
    amount: n(c.amount),
    dueDate: iso(c.dueDate),
    status: c.status,
    paidAt: isoNullable(c.paidAt),
    createdAt: iso(c.createdAt),
  };
}

function serializePayment(p: typeof paymentsTable.$inferSelect) {
  return {
    id: p.id,
    condominiumId: p.condominiumId,
    chargeId: p.chargeId,
    amount: n(p.amount),
    method: p.method,
    paidAt: iso(p.paidAt),
    notes: p.notes,
    createdAt: iso(p.createdAt),
  };
}

async function loadList(
  condId: string,
  filters: {
    status?: string;
    type?: string;
    unitId?: string;
  },
) {
  const conds = [eq(chargesTable.condominiumId, condId)];
  if (filters.status) conds.push(eq(chargesTable.status, filters.status));
  if (filters.type) conds.push(eq(chargesTable.type, filters.type));
  if (filters.unitId) conds.push(eq(chargesTable.unitId, filters.unitId));
  const rows = await db
    .select({
      c: chargesTable,
      uBlock: unitsTable.block,
      uNumber: unitsTable.number,
    })
    .from(chargesTable)
    .leftJoin(unitsTable, eq(unitsTable.id, chargesTable.unitId))
    .where(and(...conds))
    .orderBy(chargesTable.dueDate);
  // mark overdue dynamically
  const now = new Date();
  return rows.map((row) => {
    const c = { ...row.c };
    if (c.status === "pending" && c.dueDate < now) {
      c.status = "overdue";
    }
    return serialize(
      c,
      row.uNumber
        ? row.uBlock
          ? `${row.uBlock}-${row.uNumber}`
          : row.uNumber
        : null,
    );
  });
}

router.get(
  "/charges",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const unitId = typeof req.query.unitId === "string" ? req.query.unitId : undefined;
    res.json(
      await loadList(req.auth!.condominiumId, { status, type, unitId }),
    );
  },
);

router.post(
  "/charges",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateChargeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const due = parseDate(d.dueDate);
    if (!due) {
      res.status(400).json({ error: "Data de vencimento inválida" });
      return;
    }
    const [c] = await db
      .insert(chargesTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        unitId: d.unitId ?? null,
        type: d.type,
        category: d.category,
        description: d.description,
        amount: String(d.amount),
        dueDate: due,
        status: d.status ?? "pending",
      })
      .returning();
    let uLabel: string | null = null;
    if (c.unitId) {
      const [u] = await db
        .select()
        .from(unitsTable)
        .where(eq(unitsTable.id, c.unitId));
      uLabel = unitLabel(u);
    }
    await logActivity(req.auth, "create", "charge", c.id, `Lançamento "${c.description}" criado`);
    res.json(serialize(c, uLabel));
  },
);

router.patch(
  "/charges/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateChargeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const due = parseDate(d.dueDate);
    if (!due) {
      res.status(400).json({ error: "Data de vencimento inválida" });
      return;
    }
    const [c] = await db
      .update(chargesTable)
      .set({
        unitId: d.unitId ?? null,
        type: d.type,
        category: d.category,
        description: d.description,
        amount: String(d.amount),
        dueDate: due,
        status: d.status ?? "pending",
      })
      .where(
        and(
          eq(chargesTable.id, id),
          eq(chargesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!c) {
      res.status(404).json({ error: "Lançamento não encontrado" });
      return;
    }
    let uLabel: string | null = null;
    if (c.unitId) {
      const [u] = await db
        .select()
        .from(unitsTable)
        .where(eq(unitsTable.id, c.unitId));
      uLabel = unitLabel(u);
    }
    await logActivity(req.auth, "update", "charge", c.id, `Lançamento "${c.description}" atualizado`);
    res.json(serialize(c, uLabel));
  },
);

router.delete(
  "/charges/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const [c] = await db
      .delete(chargesTable)
      .where(
        and(
          eq(chargesTable.id, id),
          eq(chargesTable.condominiumId, req.auth!.condominiumId),
        ),
      )
      .returning();
    if (!c) {
      res.status(404).json({ error: "Lançamento não encontrado" });
      return;
    }
    await logActivity(req.auth, "delete", "charge", id, `Lançamento "${c.description}" excluído`);
    res.json({ success: true });
  },
);

router.post(
  "/charges/:id/pay",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const parsed = PayChargeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [c] = await db
      .select()
      .from(chargesTable)
      .where(
        and(
          eq(chargesTable.id, id),
          eq(chargesTable.condominiumId, req.auth!.condominiumId),
        ),
      );
    if (!c) {
      res.status(404).json({ error: "Lançamento não encontrado" });
      return;
    }
    const paidAt = parseDate(parsed.data.paidAt) ?? new Date();
    const [p] = await db
      .insert(paymentsTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        chargeId: c.id,
        amount: String(parsed.data.amount),
        method: parsed.data.method,
        paidAt,
        notes: parsed.data.notes ?? null,
      })
      .returning();
    await db
      .update(chargesTable)
      .set({ status: "paid", paidAt })
      .where(eq(chargesTable.id, c.id));
    await logActivity(req.auth, "pay", "charge", c.id, `Pagamento recebido para "${c.description}"`);
    res.json(serializePayment(p));
  },
);

export default router;

// payments list
const paymentsRouter: IRouter = Router();
paymentsRouter.get(
  "/payments",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.condominiumId, req.auth!.condominiumId))
      .orderBy(paymentsTable.paidAt);
    res.json(rows.map(serializePayment));
  },
);
export { paymentsRouter, serializePayment };
