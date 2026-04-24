import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, gte, lt, ilike, or, sql } from "drizzle-orm";
import {
  db,
  chargesTable,
  unitsTable,
  residentsTable,
  issuesTable,
  reservationsTable,
  deliveriesTable,
  contractsTable,
  activityLogsTable,
} from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, n } from "../lib/serialize";
import { serializeLog } from "./logs";

const router: IRouter = Router();

router.get(
  "/dashboard/summary",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const condId = req.auth!.condominiumId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [{ count: totalUnits = 0 } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(unitsTable)
      .where(eq(unitsTable.condominiumId, condId));

    const [{ count: totalResidents = 0 } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(residentsTable)
      .where(eq(residentsTable.condominiumId, condId));

    const monthCharges = await db
      .select()
      .from(chargesTable)
      .where(
        and(
          eq(chargesTable.condominiumId, condId),
          gte(chargesTable.dueDate, monthStart),
          lt(chargesTable.dueDate, monthEnd),
        ),
      );

    let totalIncomeMonth = 0;
    let totalExpenseMonth = 0;
    for (const c of monthCharges) {
      const amount = n(c.amount);
      if (c.type === "income" || c.type === "fine") {
        if (c.status === "paid") totalIncomeMonth += amount;
      } else if (c.type === "expense") {
        totalExpenseMonth += amount;
      }
    }

    const overdueCharges = await db
      .select()
      .from(chargesTable)
      .where(
        and(
          eq(chargesTable.condominiumId, condId),
          eq(chargesTable.status, "pending"),
          lt(chargesTable.dueDate, now),
        ),
      );
    const delinquentUnitIds = new Set(
      overdueCharges.map((c) => c.unitId).filter(Boolean) as string[],
    );

    const expectedCharges = await db
      .select()
      .from(chargesTable)
      .where(
        and(
          eq(chargesTable.condominiumId, condId),
          eq(chargesTable.type, "income"),
          gte(chargesTable.dueDate, monthStart),
          lt(chargesTable.dueDate, monthEnd),
        ),
      );
    const expectedTotal = expectedCharges.reduce(
      (s, c) => s + n(c.amount),
      0,
    );
    const overdueExpectedTotal = expectedCharges
      .filter((c) => c.status !== "paid" && c.dueDate < now)
      .reduce((s, c) => s + n(c.amount), 0);
    const delinquencyRate =
      expectedTotal > 0 ? overdueExpectedTotal / expectedTotal : 0;

    const [{ count: openIssues = 0 } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(issuesTable)
      .where(
        and(
          eq(issuesTable.condominiumId, condId),
          or(
            eq(issuesTable.status, "open"),
            eq(issuesTable.status, "in_progress"),
          )!,
        ),
      );

    const [{ count: upcomingReservations = 0 } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservationsTable)
      .where(
        and(
          eq(reservationsTable.condominiumId, condId),
          gte(reservationsTable.startsAt, now),
          lt(reservationsTable.startsAt, in7Days),
        ),
      );

    const [{ count: pendingDeliveries = 0 } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(deliveriesTable)
      .where(
        and(
          eq(deliveriesTable.condominiumId, condId),
          eq(deliveriesTable.status, "received"),
        ),
      );

    const nextMonthCharges = await db
      .select()
      .from(chargesTable)
      .where(
        and(
          eq(chargesTable.condominiumId, condId),
          eq(chargesTable.type, "income"),
          gte(chargesTable.dueDate, monthEnd),
          lt(chargesTable.dueDate, nextMonthEnd),
        ),
      );
    const forecastNextMonth = nextMonthCharges.reduce(
      (s, c) => s + n(c.amount),
      0,
    );

    const balance = totalIncomeMonth - totalExpenseMonth;
    const healthScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          70 +
            (1 - delinquencyRate) * 20 -
            Math.min(20, Number(openIssues) * 2) +
            (balance > 0 ? 10 : -10),
        ),
      ),
    );

    res.json({
      totalUnits: Number(totalUnits),
      totalResidents: Number(totalResidents),
      totalIncomeMonth,
      totalExpenseMonth,
      balance,
      delinquencyRate,
      delinquentCount: delinquentUnitIds.size,
      openIssues: Number(openIssues),
      upcomingReservations: Number(upcomingReservations),
      pendingDeliveries: Number(pendingDeliveries),
      forecastNextMonth,
      healthScore,
    });
  },
);

router.get(
  "/dashboard/cashflow",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const condId = req.auth!.condominiumId;
    const months = Math.max(
      1,
      Math.min(24, Number(req.query.months ?? 6) || 6),
    );
    const now = new Date();
    const points: Array<{
      month: string;
      income: number;
      expense: number;
      balance: number;
    }> = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const rows = await db
        .select()
        .from(chargesTable)
        .where(
          and(
            eq(chargesTable.condominiumId, condId),
            gte(chargesTable.dueDate, start),
            lt(chargesTable.dueDate, end),
          ),
        );
      let income = 0;
      let expense = 0;
      for (const r of rows) {
        const amount = n(r.amount);
        if (r.type === "expense") expense += amount;
        else if (r.status === "paid") income += amount;
      }
      const label = `${String(start.getMonth() + 1).padStart(2, "0")}/${start.getFullYear()}`;
      points.push({
        month: label,
        income,
        expense,
        balance: income - expense,
      });
    }
    res.json(points);
  },
);

router.get(
  "/dashboard/delinquency-ranking",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const condId = req.auth!.condominiumId;
    const now = new Date();
    const overdue = await db
      .select({ c: chargesTable, u: unitsTable })
      .from(chargesTable)
      .leftJoin(unitsTable, eq(unitsTable.id, chargesTable.unitId))
      .where(
        and(
          eq(chargesTable.condominiumId, condId),
          eq(chargesTable.status, "pending"),
          lt(chargesTable.dueDate, now),
        ),
      );
    const map = new Map<
      string,
      { unitId: string; unitLabel: string; overdueAmount: number; overdueCount: number }
    >();
    for (const row of overdue) {
      if (!row.c.unitId || !row.u) continue;
      const id = row.c.unitId;
      const label = row.u.block ? `${row.u.block}-${row.u.number}` : row.u.number;
      const existing = map.get(id) ?? {
        unitId: id,
        unitLabel: label,
        overdueAmount: 0,
        overdueCount: 0,
      };
      existing.overdueAmount += n(row.c.amount);
      existing.overdueCount += 1;
      map.set(id, existing);
    }
    const list = Array.from(map.values()).sort(
      (a, b) => b.overdueAmount - a.overdueAmount,
    );
    // attach owner names from units
    const result = await Promise.all(
      list.slice(0, 10).map(async (entry) => {
        const [u] = await db
          .select()
          .from(unitsTable)
          .where(eq(unitsTable.id, entry.unitId));
        const [resident] = await db
          .select()
          .from(residentsTable)
          .where(
            and(
              eq(residentsTable.unitId, entry.unitId),
              eq(residentsTable.kind, "owner"),
            ),
          )
          .limit(1);
        return {
          ...entry,
          residentName: resident?.name ?? u?.ownerName ?? null,
        };
      }),
    );
    res.json(result);
  },
);

router.get(
  "/dashboard/activity",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(activityLogsTable)
      .where(eq(activityLogsTable.condominiumId, req.auth!.condominiumId))
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(20);
    res.json(rows.map(serializeLog));
  },
);

router.get(
  "/dashboard/alerts",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const condId = req.auth!.condominiumId;
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const alerts: Array<{
      id: string;
      kind: "charge" | "contract" | "delinquency";
      title: string;
      description: string;
      date: string;
      severity: "info" | "warning" | "critical";
    }> = [];

    const dueSoon = await db
      .select()
      .from(chargesTable)
      .where(
        and(
          eq(chargesTable.condominiumId, condId),
          eq(chargesTable.status, "pending"),
          gte(chargesTable.dueDate, now),
          lt(chargesTable.dueDate, in30),
        ),
      );
    for (const c of dueSoon.slice(0, 5)) {
      alerts.push({
        id: `charge-${c.id}`,
        kind: "charge",
        title: `Vencimento próximo: ${c.description}`,
        description: `Vence em ${c.dueDate.toLocaleDateString("pt-BR")} • R$ ${n(c.amount).toFixed(2)}`,
        date: iso(c.dueDate),
        severity: "info",
      });
    }

    const overdue = await db
      .select()
      .from(chargesTable)
      .where(
        and(
          eq(chargesTable.condominiumId, condId),
          eq(chargesTable.status, "pending"),
          lt(chargesTable.dueDate, now),
        ),
      );
    for (const c of overdue.slice(0, 5)) {
      alerts.push({
        id: `late-${c.id}`,
        kind: "delinquency",
        title: `Em atraso: ${c.description}`,
        description: `Venceu em ${c.dueDate.toLocaleDateString("pt-BR")} • R$ ${n(c.amount).toFixed(2)}`,
        date: iso(c.dueDate),
        severity: "critical",
      });
    }

    const expiring = await db
      .select()
      .from(contractsTable)
      .where(
        and(
          eq(contractsTable.condominiumId, condId),
          gte(contractsTable.endsOn, now),
          lt(contractsTable.endsOn, in30),
        ),
      );
    for (const c of expiring.slice(0, 5)) {
      alerts.push({
        id: `contract-${c.id}`,
        kind: "contract",
        title: `Contrato expirando: ${c.title}`,
        description: `Encerra em ${c.endsOn.toLocaleDateString("pt-BR")}`,
        date: iso(c.endsOn),
        severity: "warning",
      });
    }

    res.json(alerts);
  },
);

router.get(
  "/dashboard/global-search",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const condId = req.auth!.condominiumId;
    const q = String(req.query.q ?? "").trim();
    if (!q) {
      res.json({ residents: [], units: [], charges: [] });
      return;
    }
    const s = `%${q}%`;
    const residents = await db
      .select()
      .from(residentsTable)
      .where(
        and(
          eq(residentsTable.condominiumId, condId),
          or(
            ilike(residentsTable.name, s),
            ilike(residentsTable.email, s),
            ilike(residentsTable.phone, s),
            ilike(residentsTable.document, s),
          )!,
        ),
      )
      .limit(10);
    const units = await db
      .select()
      .from(unitsTable)
      .where(
        and(
          eq(unitsTable.condominiumId, condId),
          or(
            ilike(unitsTable.number, s),
            ilike(unitsTable.block, s),
            ilike(unitsTable.ownerName, s),
          )!,
        ),
      )
      .limit(10);
    const charges = await db
      .select()
      .from(chargesTable)
      .where(
        and(
          eq(chargesTable.condominiumId, condId),
          or(
            ilike(chargesTable.description, s),
            ilike(chargesTable.category, s),
          )!,
        ),
      )
      .limit(10);

    res.json({
      residents: residents.map((r) => ({
        id: r.id,
        condominiumId: r.condominiumId,
        unitId: r.unitId,
        unitLabel: null,
        name: r.name,
        email: r.email,
        phone: r.phone,
        document: r.document,
        kind: r.kind,
        moveInDate: r.moveInDate ? r.moveInDate.toISOString() : null,
        active: r.active,
        createdAt: r.createdAt.toISOString(),
      })),
      units: units.map((u) => ({
        id: u.id,
        condominiumId: u.condominiumId,
        block: u.block,
        number: u.number,
        floor: u.floor,
        type: u.type,
        sizeM2: u.sizeM2 ? Number(u.sizeM2) : null,
        parkingSpots: u.parkingSpots,
        ownerName: u.ownerName,
        notes: u.notes,
        createdAt: u.createdAt.toISOString(),
      })),
      charges: charges.map((c) => ({
        id: c.id,
        condominiumId: c.condominiumId,
        unitId: c.unitId,
        unitLabel: null,
        type: c.type,
        category: c.category,
        description: c.description,
        amount: Number(c.amount),
        dueDate: c.dueDate.toISOString(),
        status: c.status,
        paidAt: c.paidAt ? c.paidAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  },
);

export default router;
