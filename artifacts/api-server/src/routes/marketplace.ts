import { Router, type IRouter, type Response } from "express";
import { and, eq, desc, ilike, sql, or, type SQL } from "drizzle-orm";
import {
  db,
  marketplaceCategoriesTable,
  marketplaceListingsTable,
  marketplaceImagesTable,
  marketplaceFavoritesTable,
  marketplaceReportsTable,
  marketplaceSettingsTable,
  usersTable,
  rolesTable,
} from "@workspace/db";
import {
  CreateMarketplaceListingBody,
  UpdateMarketplaceListingBody,
  AddMarketplaceImageBody,
  CreateMarketplaceCategoryBody,
  ReportListingBody,
  UpdateMarketplaceSettingsBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { iso, n, nNullable } from "../lib/serialize";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

async function checkIsAdmin(userId: string): Promise<boolean> {
  const rows = await db
    .select({ roleName: rolesTable.name })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(eq(usersTable.id, userId))
    .limit(1);
  return rows[0]?.roleName === "Administrador";
}

async function getOrCreateSettings(condominiumId: string) {
  const existing = await db
    .select()
    .from(marketplaceSettingsTable)
    .where(eq(marketplaceSettingsTable.condominiumId, condominiumId))
    .limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(marketplaceSettingsTable)
    .values({ condominiumId })
    .returning();
  return created;
}

async function getListingImages(listingId: string) {
  return db
    .select()
    .from(marketplaceImagesTable)
    .where(eq(marketplaceImagesTable.listingId, listingId))
    .orderBy(marketplaceImagesTable.order);
}

async function isFavoritedBy(userId: string, listingId: string): Promise<boolean> {
  const rows = await db
    .select({ id: marketplaceFavoritesTable.id })
    .from(marketplaceFavoritesTable)
    .where(
      and(
        eq(marketplaceFavoritesTable.userId, userId),
        eq(marketplaceFavoritesTable.listingId, listingId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

function serializeSettings(s: typeof marketplaceSettingsTable.$inferSelect) {
  return {
    id: s.id,
    condominiumId: s.condominiumId,
    enabled: s.enabled,
    requireApproval: s.requireApproval,
    maxListingsPerUser: s.maxListingsPerUser,
    allowProducts: s.allowProducts,
    allowServices: s.allowServices,
    allowImages: s.allowImages,
    maxImagesPerListing: s.maxImagesPerListing,
    createdAt: iso(s.createdAt),
  };
}

function serializeImage(img: typeof marketplaceImagesTable.$inferSelect) {
  return {
    id: img.id,
    listingId: img.listingId,
    url: img.url,
    order: img.order,
    createdAt: iso(img.createdAt),
  };
}

function serializeCategory(c: typeof marketplaceCategoriesTable.$inferSelect) {
  return {
    id: c.id,
    condominiumId: c.condominiumId,
    name: c.name,
    icon: c.icon,
    createdAt: iso(c.createdAt),
  };
}

function serializeReport(
  r: typeof marketplaceReportsTable.$inferSelect,
  listingTitle?: string | null,
) {
  return {
    id: r.id,
    listingId: r.listingId,
    listingTitle: listingTitle ?? null,
    userId: r.userId,
    condominiumId: r.condominiumId,
    reason: r.reason,
    status: r.status,
    createdAt: iso(r.createdAt),
  };
}

function serializeListing(
  l: typeof marketplaceListingsTable.$inferSelect,
  images: typeof marketplaceImagesTable.$inferSelect[],
  favorited: boolean,
) {
  return {
    id: l.id,
    condominiumId: l.condominiumId,
    residentId: l.residentId,
    residentName: l.residentName,
    categoryId: l.categoryId,
    categoryName: l.categoryName,
    title: l.title,
    description: l.description,
    price: nNullable(l.price),
    type: l.type,
    status: l.status,
    isHighlighted: l.isHighlighted,
    views: l.views,
    contactInfo: l.contactInfo,
    images: images.map(serializeImage),
    isFavorited: favorited,
    createdAt: iso(l.createdAt),
    updatedAt: iso(l.updatedAt),
  };
}

// ─── PUBLIC ROUTES (auth required, resident-facing) ───────────────────────────

router.get(
  "/marketplace/listings",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const search = req.query.search as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const typeQ = req.query.type as string | undefined;
    const sort = req.query.sort as string | undefined;
    const condId = req.auth!.condominiumId;

    const typeFilter =
      typeQ === "product" || typeQ === "service" ? typeQ : undefined;

    const searchCond: SQL | undefined = search
      ? or(
          ilike(marketplaceListingsTable.title, `%${search}%`),
          ilike(marketplaceListingsTable.description, `%${search}%`),
        )
      : undefined;

    let orderBy;
    if (sort === "views") orderBy = desc(marketplaceListingsTable.views);
    else if (sort === "highlighted") orderBy = desc(marketplaceListingsTable.isHighlighted);
    else orderBy = desc(marketplaceListingsTable.createdAt);

    const listings = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.condominiumId, condId),
          eq(marketplaceListingsTable.status, "active"),
          searchCond,
          categoryId ? eq(marketplaceListingsTable.categoryId, categoryId) : undefined,
          typeFilter ? eq(marketplaceListingsTable.type, typeFilter) : undefined,
        ),
      )
      .orderBy(desc(marketplaceListingsTable.isHighlighted), orderBy)
      .limit(100);

    const result = await Promise.all(
      listings.map(async (l) => {
        const imgs = await getListingImages(l.id);
        const fav = await isFavoritedBy(req.auth!.userId, l.id);
        return serializeListing(l, imgs, fav);
      }),
    );
    res.json(result);
  },
);

router.post(
  "/marketplace/listings",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateMarketplaceListingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const condId = req.auth!.condominiumId;
    const userId = req.auth!.userId;

    const settings = await getOrCreateSettings(condId);
    if (!settings.enabled) {
      res.status(403).json({ error: "Marketplace desativado" });
      return;
    }
    if (d.type === "product" && !settings.allowProducts) {
      res.status(403).json({ error: "Produtos não permitidos" });
      return;
    }
    if (d.type === "service" && !settings.allowServices) {
      res.status(403).json({ error: "Serviços não permitidos" });
      return;
    }

    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.condominiumId, condId),
          eq(marketplaceListingsTable.residentId, userId),
          or(
            eq(marketplaceListingsTable.status, "active"),
            eq(marketplaceListingsTable.status, "pending"),
          ),
        ),
      );

    if (n(cnt) >= settings.maxListingsPerUser) {
      res
        .status(400)
        .json({ error: `Limite de ${settings.maxListingsPerUser} anúncios atingido` });
      return;
    }

    const reqCategoryId = d.categoryId ?? null;
    let categoryName: string | null = null;
    if (reqCategoryId) {
      const [cat] = await db
        .select({ name: marketplaceCategoriesTable.name })
        .from(marketplaceCategoriesTable)
        .where(
          and(
            eq(marketplaceCategoriesTable.id, reqCategoryId),
            eq(marketplaceCategoriesTable.condominiumId, condId),
          ),
        )
        .limit(1);
      categoryName = cat?.name ?? null;
    }

    const status = settings.requireApproval ? "pending" : "active";

    const [listing] = await db
      .insert(marketplaceListingsTable)
      .values({
        condominiumId: condId,
        residentId: userId,
        residentName: req.auth!.email,
        categoryId: reqCategoryId,
        categoryName,
        title: d.title,
        description: d.description,
        price: d.price != null ? String(d.price) : null,
        type: d.type,
        status,
        contactInfo: d.contactInfo ?? null,
      })
      .returning();

    await logActivity(
      req.auth,
      "create",
      "marketplace_listing",
      listing.id,
      `Anúncio "${listing.title}" criado${status === "pending" ? " (aguardando aprovação)" : ""}`,
    );

    res.status(201).json(serializeListing(listing, [], false));
  },
);

router.get(
  "/marketplace/listings/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const condId = req.auth!.condominiumId;

    const [listing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.id, id),
          eq(marketplaceListingsTable.condominiumId, condId),
        ),
      )
      .limit(1);

    if (!listing) {
      res.status(404).json({ error: "Anúncio não encontrado" });
      return;
    }

    await db
      .update(marketplaceListingsTable)
      .set({ views: listing.views + 1 })
      .where(eq(marketplaceListingsTable.id, id));

    const images = await getListingImages(id);
    const favorited = await isFavoritedBy(req.auth!.userId, id);
    res.json(serializeListing({ ...listing, views: listing.views + 1 }, images, favorited));
  },
);

router.put(
  "/marketplace/listings/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const condId = req.auth!.condominiumId;
    const userId = req.auth!.userId;

    const [listing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.id, id),
          eq(marketplaceListingsTable.condominiumId, condId),
        ),
      )
      .limit(1);

    if (!listing) {
      res.status(404).json({ error: "Anúncio não encontrado" });
      return;
    }

    const admin = await checkIsAdmin(userId);
    if (listing.residentId !== userId && !admin) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }

    const parsed = UpdateMarketplaceListingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;

    let categoryName = listing.categoryName;
    const updCategoryId = d.categoryId !== undefined ? (d.categoryId ?? null) : listing.categoryId;
    if (d.categoryId !== undefined) {
      categoryName = null;
      const catId = d.categoryId ?? null;
      if (catId) {
        const [cat] = await db
          .select({ name: marketplaceCategoriesTable.name })
          .from(marketplaceCategoriesTable)
          .where(
            and(
              eq(marketplaceCategoriesTable.id, catId),
              eq(marketplaceCategoriesTable.condominiumId, condId),
            ),
          )
          .limit(1);
        categoryName = cat?.name ?? null;
      }
    }

    const [updated] = await db
      .update(marketplaceListingsTable)
      .set({
        title: d.title ?? listing.title,
        description: d.description ?? listing.description,
        price: d.price !== undefined ? (d.price != null ? String(d.price) : null) : listing.price,
        type: d.type ?? listing.type,
        categoryId: updCategoryId,
        categoryName,
        contactInfo: d.contactInfo !== undefined ? (d.contactInfo ?? null) : listing.contactInfo,
        status: d.status ?? listing.status,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceListingsTable.id, id))
      .returning();

    await logActivity(
      req.auth,
      "update",
      "marketplace_listing",
      id,
      `Anúncio "${updated.title}" atualizado`,
    );

    const images = await getListingImages(id);
    const favorited = await isFavoritedBy(userId, id);
    res.json(serializeListing(updated, images, favorited));
  },
);

router.delete(
  "/marketplace/listings/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const condId = req.auth!.condominiumId;
    const userId = req.auth!.userId;

    const [listing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.id, id),
          eq(marketplaceListingsTable.condominiumId, condId),
        ),
      )
      .limit(1);

    if (!listing) {
      res.status(404).json({ error: "Anúncio não encontrado" });
      return;
    }

    const admin = await checkIsAdmin(userId);
    if (listing.residentId !== userId && !admin) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }

    await db
      .delete(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, id));

    await logActivity(
      req.auth,
      "delete",
      "marketplace_listing",
      id,
      `Anúncio "${listing.title}" removido`,
    );
    res.status(204).end();
  },
);

// ─── IMAGES ───────────────────────────────────────────────────────────────────

router.post(
  "/marketplace/listings/:id/images",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const condId = req.auth!.condominiumId;
    const userId = req.auth!.userId;

    const parsed = AddMarketplaceImageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [listing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.id, id),
          eq(marketplaceListingsTable.condominiumId, condId),
        ),
      )
      .limit(1);

    if (!listing) {
      res.status(404).json({ error: "Anúncio não encontrado" });
      return;
    }

    const admin = await checkIsAdmin(userId);
    if (listing.residentId !== userId && !admin) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }

    const settings = await getOrCreateSettings(condId);
    const images = await getListingImages(id);
    if (images.length >= settings.maxImagesPerListing) {
      res.status(400).json({ error: `Máximo de ${settings.maxImagesPerListing} imagens` });
      return;
    }

    const [img] = await db
      .insert(marketplaceImagesTable)
      .values({
        listingId: id,
        url: parsed.data.url,
        order: parsed.data.order ?? images.length,
      })
      .returning();

    res.status(201).json(serializeImage(img));
  },
);

router.delete(
  "/marketplace/listings/:id/images/:imageId",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const imageId = req.params.imageId as string;
    const condId = req.auth!.condominiumId;
    const userId = req.auth!.userId;

    const [listing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.id, id),
          eq(marketplaceListingsTable.condominiumId, condId),
        ),
      )
      .limit(1);

    if (!listing) {
      res.status(404).json({ error: "Anúncio não encontrado" });
      return;
    }

    const admin = await checkIsAdmin(userId);
    if (listing.residentId !== userId && !admin) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }

    await db
      .delete(marketplaceImagesTable)
      .where(
        and(
          eq(marketplaceImagesTable.id, imageId),
          eq(marketplaceImagesTable.listingId, id),
        ),
      );

    res.status(204).end();
  },
);

// ─── FAVORITES ────────────────────────────────────────────────────────────────

router.get(
  "/marketplace/listings/:id/favorite",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const fav = await isFavoritedBy(req.auth!.userId, id);
    res.json({ isFavorited: fav });
  },
);

router.post(
  "/marketplace/listings/:id/favorite",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const userId = req.auth!.userId;
    const condId = req.auth!.condominiumId;

    const [listing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.id, id),
          eq(marketplaceListingsTable.condominiumId, condId),
        ),
      )
      .limit(1);

    if (!listing) {
      res.status(404).json({ error: "Anúncio não encontrado" });
      return;
    }

    const existing = await db
      .select()
      .from(marketplaceFavoritesTable)
      .where(
        and(
          eq(marketplaceFavoritesTable.userId, userId),
          eq(marketplaceFavoritesTable.listingId, id),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(marketplaceFavoritesTable)
        .where(
          and(
            eq(marketplaceFavoritesTable.userId, userId),
            eq(marketplaceFavoritesTable.listingId, id),
          ),
        );
      res.json({ isFavorited: false });
    } else {
      await db
        .insert(marketplaceFavoritesTable)
        .values({ userId, listingId: id, condominiumId: condId });
      res.json({ isFavorited: true });
    }
  },
);

// ─── REPORTS ──────────────────────────────────────────────────────────────────

router.post(
  "/marketplace/listings/:id/report",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const condId = req.auth!.condominiumId;

    const parsed = ReportListingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [listing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.id, id),
          eq(marketplaceListingsTable.condominiumId, condId),
        ),
      )
      .limit(1);

    if (!listing) {
      res.status(404).json({ error: "Anúncio não encontrado" });
      return;
    }

    const [report] = await db
      .insert(marketplaceReportsTable)
      .values({
        listingId: id,
        userId: req.auth!.userId,
        condominiumId: condId,
        reason: parsed.data.reason,
      })
      .returning();

    await logActivity(
      req.auth,
      "report",
      "marketplace_listing",
      id,
      `Anúncio "${listing.title}" denunciado`,
    );

    res.status(201).json(serializeReport(report, listing.title));
  },
);

// ─── MY LISTINGS ──────────────────────────────────────────────────────────────

router.get(
  "/marketplace/my-listings",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const condId = req.auth!.condominiumId;
    const userId = req.auth!.userId;

    const listings = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.condominiumId, condId),
          eq(marketplaceListingsTable.residentId, userId),
        ),
      )
      .orderBy(desc(marketplaceListingsTable.createdAt));

    const result = await Promise.all(
      listings.map(async (l) => {
        const imgs = await getListingImages(l.id);
        const fav = await isFavoritedBy(userId, l.id);
        return serializeListing(l, imgs, fav);
      }),
    );
    res.json(result);
  },
);

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

router.get(
  "/marketplace/categories",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const cats = await db
      .select()
      .from(marketplaceCategoriesTable)
      .where(eq(marketplaceCategoriesTable.condominiumId, req.auth!.condominiumId))
      .orderBy(marketplaceCategoriesTable.name);
    res.json(cats.map(serializeCategory));
  },
);

router.post(
  "/marketplace/categories",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = CreateMarketplaceCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [cat] = await db
      .insert(marketplaceCategoriesTable)
      .values({
        condominiumId: req.auth!.condominiumId,
        name: parsed.data.name,
        icon: parsed.data.icon ?? null,
      })
      .returning();
    res.status(201).json(serializeCategory(cat));
  },
);

router.delete(
  "/marketplace/categories/:id",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await db
      .delete(marketplaceCategoriesTable)
      .where(
        and(
          eq(marketplaceCategoriesTable.id, id),
          eq(marketplaceCategoriesTable.condominiumId, req.auth!.condominiumId),
        ),
      );
    res.status(204).end();
  },
);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

router.get(
  "/marketplace/admin/listings",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const condId = req.auth!.condominiumId;
    const statusQ = req.query.status as string | undefined;

    const listings = await db
      .select()
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.condominiumId, condId),
          statusQ ? eq(marketplaceListingsTable.status, statusQ) : undefined,
        ),
      )
      .orderBy(desc(marketplaceListingsTable.createdAt))
      .limit(200);

    const result = await Promise.all(
      listings.map(async (l) => {
        const imgs = await getListingImages(l.id);
        const fav = await isFavoritedBy(req.auth!.userId, l.id);
        return serializeListing(l, imgs, fav);
      }),
    );
    res.json(result);
  },
);

router.put(
  "/marketplace/admin/listings/:id/approve",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const condId = req.auth!.condominiumId;

    const [listing] = await db
      .update(marketplaceListingsTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(
        and(
          eq(marketplaceListingsTable.id, id),
          eq(marketplaceListingsTable.condominiumId, condId),
        ),
      )
      .returning();

    if (!listing) {
      res.status(404).json({ error: "Anúncio não encontrado" });
      return;
    }

    await logActivity(
      req.auth,
      "approve",
      "marketplace_listing",
      id,
      `Anúncio "${listing.title}" aprovado`,
    );

    const images = await getListingImages(id);
    res.json(serializeListing(listing, images, false));
  },
);

router.put(
  "/marketplace/admin/listings/:id/reject",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const condId = req.auth!.condominiumId;

    const [listing] = await db
      .update(marketplaceListingsTable)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(
        and(
          eq(marketplaceListingsTable.id, id),
          eq(marketplaceListingsTable.condominiumId, condId),
        ),
      )
      .returning();

    if (!listing) {
      res.status(404).json({ error: "Anúncio não encontrado" });
      return;
    }

    await logActivity(
      req.auth,
      "reject",
      "marketplace_listing",
      id,
      `Anúncio "${listing.title}" rejeitado`,
    );

    const images = await getListingImages(id);
    res.json(serializeListing(listing, images, false));
  },
);

router.put(
  "/marketplace/admin/listings/:id/highlight",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const condId = req.auth!.condominiumId;

    const [current] = await db
      .select({ isHighlighted: marketplaceListingsTable.isHighlighted })
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.id, id),
          eq(marketplaceListingsTable.condominiumId, condId),
        ),
      )
      .limit(1);

    if (!current) {
      res.status(404).json({ error: "Anúncio não encontrado" });
      return;
    }

    const [listing] = await db
      .update(marketplaceListingsTable)
      .set({ isHighlighted: !current.isHighlighted, updatedAt: new Date() })
      .where(eq(marketplaceListingsTable.id, id))
      .returning();

    const images = await getListingImages(id);
    res.json(serializeListing(listing, images, false));
  },
);

router.get(
  "/marketplace/admin/reports",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const condId = req.auth!.condominiumId;

    const reports = await db
      .select({
        report: marketplaceReportsTable,
        listingTitle: marketplaceListingsTable.title,
      })
      .from(marketplaceReportsTable)
      .leftJoin(
        marketplaceListingsTable,
        eq(marketplaceReportsTable.listingId, marketplaceListingsTable.id),
      )
      .where(eq(marketplaceReportsTable.condominiumId, condId))
      .orderBy(desc(marketplaceReportsTable.createdAt));

    res.json(reports.map((r) => serializeReport(r.report, r.listingTitle)));
  },
);

router.put(
  "/marketplace/admin/reports/:id/review",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const condId = req.auth!.condominiumId;

    const [report] = await db
      .update(marketplaceReportsTable)
      .set({ status: "reviewed" })
      .where(
        and(
          eq(marketplaceReportsTable.id, id),
          eq(marketplaceReportsTable.condominiumId, condId),
        ),
      )
      .returning();

    if (!report) {
      res.status(404).json({ error: "Denúncia não encontrada" });
      return;
    }

    res.json(serializeReport(report));
  },
);

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

router.get(
  "/marketplace/settings",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const settings = await getOrCreateSettings(req.auth!.condominiumId);
    res.json(serializeSettings(settings));
  },
);

router.put(
  "/marketplace/settings",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = UpdateMarketplaceSettingsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const condId = req.auth!.condominiumId;

    await getOrCreateSettings(condId);

    const [updated] = await db
      .update(marketplaceSettingsTable)
      .set({
        ...(d.enabled !== undefined && { enabled: d.enabled }),
        ...(d.requireApproval !== undefined && { requireApproval: d.requireApproval }),
        ...(d.maxListingsPerUser !== undefined && { maxListingsPerUser: d.maxListingsPerUser }),
        ...(d.allowProducts !== undefined && { allowProducts: d.allowProducts }),
        ...(d.allowServices !== undefined && { allowServices: d.allowServices }),
        ...(d.allowImages !== undefined && { allowImages: d.allowImages }),
        ...(d.maxImagesPerListing !== undefined && { maxImagesPerListing: d.maxImagesPerListing }),
      })
      .where(eq(marketplaceSettingsTable.condominiumId, condId))
      .returning();

    res.json(serializeSettings(updated));
  },
);

export default router;
