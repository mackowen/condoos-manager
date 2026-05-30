import {
  db,
  condominiumsTable,
  rolesTable,
  usersTable,
  unitsTable,
  residentsTable,
  chargesTable,
  paymentsTable,
  noticesTable,
  issuesTable,
  deliveriesTable,
  vehiclesTable,
  reservationsTable,
  documentsTable,
  serviceOrdersTable,
  suppliersTable,
  contractsTable,
  eventsTable,
  activityLogsTable,
  marketplaceCategoriesTable,
  marketplaceListingsTable,
  marketplaceSettingsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./lib/auth";

const logger = {
  info: (a: unknown, b?: string) =>
    console.log("[seed]", typeof a === "string" ? a : b ?? "", typeof a === "object" ? JSON.stringify(a) : ""),
  error: (a: unknown, b?: string) =>
    console.error("[seed]", typeof a === "string" ? a : b ?? "", a),
};

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dateOffset(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function seedCondominium(opts: {
  name: string;
  address: string;
  primaryColor: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}): Promise<string> {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, opts.adminEmail));
  if (existing.length) {
    logger.info({ email: opts.adminEmail }, "seed: user already exists, skipping");
    return existing[0].condominiumId;
  }

  const [cond] = await db
    .insert(condominiumsTable)
    .values({
      name: opts.name,
      address: opts.address,
      cnpj: "12.345.678/0001-90",
      primaryColor: opts.primaryColor,
      finePercent: "2.00",
      interestPercent: "1.00",
    })
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

  const [syndicRole] = await db
    .insert(rolesTable)
    .values({
      condominiumId: cond.id,
      name: "Síndico",
      description: "Gestão operacional do condomínio",
      permissions: [
        "residents.view",
        "residents.create",
        "residents.update",
        "units.view",
        "charges.view",
        "charges.create",
        "charges.pay",
        "notices.view",
        "notices.create",
        "issues.view",
        "issues.update",
        "deliveries.view",
        "reservations.view",
      ],
    })
    .returning();

  await db.insert(rolesTable).values({
    condominiumId: cond.id,
    name: "Porteiro",
    description: "Acesso à portaria, encomendas e moradores",
    permissions: [
      "residents.view",
      "deliveries.view",
      "deliveries.create",
      "deliveries.update",
      "vehicles.view",
      "notices.view",
    ],
  });

  const [admin] = await db
    .insert(usersTable)
    .values({
      condominiumId: cond.id,
      email: opts.adminEmail,
      name: opts.adminName,
      passwordHash: await hashPassword(opts.adminPassword),
      roleId: adminRole.id,
      active: true,
    })
    .returning();

  // Suppliers
  const supplierRows = await db
    .insert(suppliersTable)
    .values([
      {
        condominiumId: cond.id,
        name: "Limpeza Brilho Total",
        category: "Limpeza",
        contactName: "Marcia Souza",
        email: "marcia@brilhototal.com.br",
        phone: "(11) 91234-5678",
        rating: "4.8",
      },
      {
        condominiumId: cond.id,
        name: "ElevaTech Manutenção",
        category: "Elevadores",
        contactName: "Carlos Lima",
        email: "carlos@elevatech.com.br",
        phone: "(11) 92345-6789",
        rating: "4.5",
      },
      {
        condominiumId: cond.id,
        name: "SegMax Vigilância",
        category: "Segurança",
        contactName: "Roberto Mendes",
        email: "roberto@segmax.com.br",
        phone: "(11) 93456-7890",
        rating: "4.7",
      },
      {
        condominiumId: cond.id,
        name: "JardinArte Paisagismo",
        category: "Jardinagem",
        contactName: "Ana Pereira",
        email: "ana@jardinarte.com.br",
        phone: "(11) 94567-8901",
        rating: "4.9",
      },
    ])
    .returning();

  // Contracts
  await db.insert(contractsTable).values([
    {
      condominiumId: cond.id,
      supplierId: supplierRows[0].id,
      title: "Contrato Limpeza Mensal",
      category: "Limpeza",
      startsOn: dateOffset(-180),
      endsOn: dateOffset(20),
      monthlyValue: "4500.00",
      status: "active",
    },
    {
      condominiumId: cond.id,
      supplierId: supplierRows[1].id,
      title: "Manutenção de Elevadores",
      category: "Elevadores",
      startsOn: dateOffset(-365),
      endsOn: dateOffset(90),
      monthlyValue: "2800.00",
      status: "active",
    },
    {
      condominiumId: cond.id,
      supplierId: supplierRows[2].id,
      title: "Vigilância 24h",
      category: "Segurança",
      startsOn: dateOffset(-200),
      endsOn: dateOffset(160),
      monthlyValue: "12500.00",
      status: "active",
    },
  ]);

  // Units (24 units across 2 blocks)
  const unitRows: (typeof unitsTable.$inferSelect)[] = [];
  for (const block of ["A", "B"]) {
    for (let floor = 1; floor <= 6; floor++) {
      for (let pos = 1; pos <= 2; pos++) {
        const number = `${floor}0${pos}`;
        const [u] = await db
          .insert(unitsTable)
          .values({
            condominiumId: cond.id,
            block,
            number,
            floor: String(floor),
            type: pos === 1 ? "2 quartos" : "3 quartos",
            sizeM2: pos === 1 ? "65.00" : "85.00",
            parkingSpots: pos === 1 ? 1 : 2,
            ownerName: null,
          })
          .returning();
        unitRows.push(u);
      }
    }
  }

  // Residents
  const firstNames = [
    "Ana",
    "Bruno",
    "Carla",
    "Diego",
    "Elisa",
    "Felipe",
    "Gabriela",
    "Henrique",
    "Isabela",
    "João",
    "Karina",
    "Lucas",
    "Mariana",
    "Nelson",
    "Olivia",
    "Pedro",
    "Quezia",
    "Rafael",
    "Sofia",
    "Tiago",
  ];
  const lastNames = [
    "Silva",
    "Santos",
    "Oliveira",
    "Souza",
    "Lima",
    "Pereira",
    "Costa",
    "Almeida",
    "Ferreira",
    "Carvalho",
  ];
  for (let i = 0; i < unitRows.length; i++) {
    const u = unitRows[i];
    const ownerName = `${randomPick(firstNames)} ${randomPick(lastNames)}`;
    await db
      .update(unitsTable)
      .set({ ownerName })
      .where(eq(unitsTable.id, u.id));
    await db.insert(residentsTable).values({
      condominiumId: cond.id,
      unitId: u.id,
      name: ownerName,
      email: `${ownerName.split(" ")[0].toLowerCase()}${i}@example.com`,
      phone: `(11) 9${String(1000 + i).padStart(4, "0")}-${String(2000 + i).padStart(4, "0")}`,
      kind: "owner",
      moveInDate: dateOffset(-Math.floor(Math.random() * 1500) - 30),
      active: true,
    });
    if (Math.random() > 0.6) {
      await db.insert(residentsTable).values({
        condominiumId: cond.id,
        unitId: u.id,
        name: `${randomPick(firstNames)} ${randomPick(lastNames)}`,
        kind: "dependent",
        active: true,
      });
    }
  }

  // Vehicles
  for (const u of unitRows) {
    if (u.parkingSpots > 0 && Math.random() > 0.2) {
      const plate = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
      await db.insert(vehiclesTable).values({
        condominiumId: cond.id,
        unitId: u.id,
        plate,
        model: randomPick(["Honda Civic", "Toyota Corolla", "Fiat Mobi", "VW Polo", "Hyundai HB20", "Jeep Renegade"]),
        color: randomPick(["Preto", "Branco", "Prata", "Vermelho", "Cinza"]),
        kind: "car",
        ownerName: u.ownerName,
        parkingSpot: `${u.block}${u.number}`,
      });
    }
  }

  // Charges (income for past 5 months + current + pending for next, plus some expenses)
  const now = new Date();
  for (let m = -5; m <= 1; m++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + m, 10);
    for (const u of unitRows) {
      const isPaid = m < 0 ? Math.random() > 0.1 : m === 0 ? Math.random() > 0.35 : false;
      const amount = u.parkingSpots === 1 ? 580 : 750;
      const [charge] = await db
        .insert(chargesTable)
        .values({
          condominiumId: cond.id,
          unitId: u.id,
          type: "income",
          category: "Taxa Condominial",
          description: `Taxa condominial ${String(monthDate.getMonth() + 1).padStart(2, "0")}/${monthDate.getFullYear()} • ${u.block}-${u.number}`,
          amount: String(amount),
          dueDate: monthDate,
          status: isPaid ? "paid" : m < 0 ? "pending" : "pending",
          paidAt: isPaid
            ? new Date(monthDate.getTime() - Math.floor(Math.random() * 5) * 86400000)
            : null,
        })
        .returning();
      if (isPaid) {
        await db.insert(paymentsTable).values({
          condominiumId: cond.id,
          chargeId: charge.id,
          amount: String(amount),
          method: randomPick(["Pix", "Boleto", "Transferência"]),
          paidAt: charge.paidAt!,
          notes: null,
        });
      }
    }
    // monthly expenses
    await db.insert(chargesTable).values([
      {
        condominiumId: cond.id,
        type: "expense",
        category: "Limpeza",
        description: `Pagamento Limpeza Brilho Total ${String(monthDate.getMonth() + 1).padStart(2, "0")}/${monthDate.getFullYear()}`,
        amount: "4500.00",
        dueDate: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5),
        status: m <= 0 ? "paid" : "pending",
      },
      {
        condominiumId: cond.id,
        type: "expense",
        category: "Energia",
        description: `Conta de luz áreas comuns ${String(monthDate.getMonth() + 1).padStart(2, "0")}/${monthDate.getFullYear()}`,
        amount: String(2200 + Math.floor(Math.random() * 600)),
        dueDate: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
        status: m <= 0 ? "paid" : "pending",
      },
      {
        condominiumId: cond.id,
        type: "expense",
        category: "Segurança",
        description: `Vigilância 24h ${String(monthDate.getMonth() + 1).padStart(2, "0")}/${monthDate.getFullYear()}`,
        amount: "12500.00",
        dueDate: new Date(monthDate.getFullYear(), monthDate.getMonth(), 10),
        status: m <= 0 ? "paid" : "pending",
      },
    ]);
  }

  // Notices
  await db.insert(noticesTable).values([
    {
      condominiumId: cond.id,
      title: "Manutenção do reservatório de água",
      body: "Comunicamos que no próximo sábado, das 8h às 14h, será realizada a manutenção semestral do reservatório de água. Durante este período o fornecimento será interrompido. Recomendamos que armazenem água potável.",
      category: "Manutenção",
      priority: "high",
      publishedAt: dateOffset(-2),
    },
    {
      condominiumId: cond.id,
      title: "Assembleia Geral Ordinária",
      body: "Convocamos todos os condôminos para a Assembleia Geral Ordinária a ser realizada no salão de festas. Pauta: aprovação das contas, eleição de novo síndico e definição da reforma da fachada.",
      category: "Assembleia",
      priority: "high",
      publishedAt: dateOffset(-5),
    },
    {
      condominiumId: cond.id,
      title: "Regras atualizadas para uso do salão de festas",
      body: "O regulamento interno foi atualizado. As reservas devem ser feitas com 15 dias de antecedência e há limite de 40 convidados por evento.",
      category: "Geral",
      priority: "normal",
      publishedAt: dateOffset(-10),
    },
    {
      condominiumId: cond.id,
      title: "Coleta seletiva nas terças e sextas",
      body: "A partir desta semana a coleta seletiva acontecerá nas terças e sextas-feiras. Por favor, separem corretamente os recicláveis.",
      category: "Geral",
      priority: "low",
      publishedAt: dateOffset(-15),
    },
  ]);

  // Issues
  await db.insert(issuesTable).values([
    {
      condominiumId: cond.id,
      unitId: unitRows[2].id,
      title: "Vazamento no teto da garagem",
      description: "Há um vazamento contínuo na vaga 305 vindo do teto. Possivelmente da unidade acima.",
      category: "Hidráulica",
      priority: "high",
      status: "in_progress",
      reportedBy: "Porteiro Mario",
    },
    {
      condominiumId: cond.id,
      title: "Lâmpada queimada hall do 4º andar bloco A",
      description: "Lâmpada do corredor não acende há dois dias.",
      category: "Elétrica",
      priority: "low",
      status: "open",
      reportedBy: "Morador 401-A",
    },
    {
      condominiumId: cond.id,
      unitId: unitRows[7].id,
      title: "Barulho excessivo após 22h",
      description: "Reclamação de barulho excessivo na unidade durante a madrugada.",
      category: "Convivência",
      priority: "medium",
      status: "resolved",
      reportedBy: "Morador 102-B",
    },
    {
      condominiumId: cond.id,
      title: "Portão social com defeito",
      description: "Portão social principal está demorando para fechar e fica entreaberto.",
      category: "Portaria",
      priority: "urgent",
      status: "open",
      reportedBy: "Síndico",
    },
  ]);

  // Deliveries
  await db.insert(deliveriesTable).values([
    {
      condominiumId: cond.id,
      unitId: unitRows[1].id,
      recipient: unitRows[1].ownerName ?? "Morador",
      carrier: "Mercado Livre",
      trackingCode: "ML-2025-83472",
      status: "received",
      receivedAt: dateOffset(-1),
    },
    {
      condominiumId: cond.id,
      unitId: unitRows[5].id,
      recipient: unitRows[5].ownerName ?? "Morador",
      carrier: "Amazon",
      trackingCode: "AMZ-7263-XX",
      status: "received",
      receivedAt: dateOffset(0),
    },
    {
      condominiumId: cond.id,
      unitId: unitRows[10].id,
      recipient: unitRows[10].ownerName ?? "Morador",
      carrier: "Correios",
      trackingCode: "BR123456789",
      status: "picked_up",
      receivedAt: dateOffset(-3),
      pickedUpAt: dateOffset(-2),
    },
  ]);

  // Reservations
  await db.insert(reservationsTable).values([
    {
      condominiumId: cond.id,
      unitId: unitRows[3].id,
      area: "Salão de festas",
      startsAt: new Date(dateOffset(3).setHours(18, 0, 0, 0)),
      endsAt: new Date(dateOffset(3).setHours(23, 30, 0, 0)),
      status: "confirmed",
      notes: "Aniversário infantil",
    },
    {
      condominiumId: cond.id,
      unitId: unitRows[8].id,
      area: "Churrasqueira",
      startsAt: new Date(dateOffset(5).setHours(12, 0, 0, 0)),
      endsAt: new Date(dateOffset(5).setHours(18, 0, 0, 0)),
      status: "confirmed",
    },
    {
      condominiumId: cond.id,
      unitId: unitRows[12].id,
      area: "Salão de festas",
      startsAt: new Date(dateOffset(15).setHours(19, 0, 0, 0)),
      endsAt: new Date(dateOffset(15).setHours(23, 0, 0, 0)),
      status: "pending",
    },
  ]);

  // Documents
  await db.insert(documentsTable).values([
    {
      condominiumId: cond.id,
      title: "Convenção do Condomínio",
      category: "Legal",
      sizeKb: 1240,
      uploadedBy: opts.adminName,
    },
    {
      condominiumId: cond.id,
      title: "Regimento Interno 2025",
      category: "Legal",
      sizeKb: 380,
      uploadedBy: opts.adminName,
    },
    {
      condominiumId: cond.id,
      title: "Balancete Março 2026",
      category: "Financeiro",
      sizeKb: 220,
      uploadedBy: opts.adminName,
    },
    {
      condominiumId: cond.id,
      title: "Ata Assembleia 02/2026",
      category: "Atas",
      sizeKb: 156,
      uploadedBy: opts.adminName,
    },
  ]);

  // Service orders
  await db.insert(serviceOrdersTable).values([
    {
      condominiumId: cond.id,
      title: "Pintura do hall de entrada",
      description: "Pintura completa do hall principal e corredores do térreo.",
      supplierId: supplierRows[3].id,
      status: "scheduled",
      priority: "medium",
      scheduledFor: dateOffset(7),
      cost: "8500.00",
    },
    {
      condominiumId: cond.id,
      title: "Troca de bomba do reservatório",
      description: "Substituição da bomba principal por modelo mais eficiente.",
      supplierId: supplierRows[1].id,
      status: "in_progress",
      priority: "urgent",
      scheduledFor: dateOffset(2),
      cost: "12000.00",
    },
    {
      condominiumId: cond.id,
      title: "Manutenção preventiva CFTV",
      description: "Limpeza, ajuste de foco e teste de gravação de todas as câmeras.",
      supplierId: supplierRows[2].id,
      status: "open",
      priority: "low",
      cost: "1800.00",
    },
  ]);

  // Events
  await db.insert(eventsTable).values([
    {
      condominiumId: cond.id,
      title: "Assembleia Geral Ordinária",
      description: "Aprovação de contas e eleição de síndico",
      startsAt: new Date(dateOffset(8).setHours(19, 30, 0, 0)),
      endsAt: new Date(dateOffset(8).setHours(22, 0, 0, 0)),
      location: "Salão de festas",
      kind: "Assembleia",
    },
    {
      condominiumId: cond.id,
      title: "Reunião com fornecedor de pintura",
      startsAt: new Date(dateOffset(3).setHours(15, 0, 0, 0)),
      endsAt: new Date(dateOffset(3).setHours(16, 30, 0, 0)),
      location: "Sala da administração",
      kind: "Reunião",
    },
    {
      condominiumId: cond.id,
      title: "Festa Junina do Condomínio",
      startsAt: new Date(dateOffset(45).setHours(18, 0, 0, 0)),
      endsAt: new Date(dateOffset(45).setHours(23, 59, 0, 0)),
      location: "Área de lazer",
      kind: "Confraternização",
    },
  ]);

  // Activity logs
  await db.insert(activityLogsTable).values([
    {
      condominiumId: cond.id,
      userId: admin.id,
      userName: admin.email,
      action: "create",
      entity: "notice",
      message: "Aviso \"Assembleia Geral Ordinária\" publicado",
    },
    {
      condominiumId: cond.id,
      userId: admin.id,
      userName: admin.email,
      action: "create",
      entity: "service",
      message: "Ordem de serviço \"Pintura do hall de entrada\" aberta",
    },
    {
      condominiumId: cond.id,
      userId: admin.id,
      userName: admin.email,
      action: "pay",
      entity: "charge",
      message: "Pagamento recebido para \"Taxa condominial A-101\"",
    },
    {
      condominiumId: cond.id,
      userId: admin.id,
      userName: admin.email,
      action: "create",
      entity: "delivery",
      message: "Encomenda Mercado Livre registrada",
    },
  ]);

  // Marketplace
  await db.insert(marketplaceSettingsTable).values({
    condominiumId: cond.id,
    enabled: true,
    requireApproval: false,
    allowProducts: true,
    allowServices: true,
    maxListingsPerUser: 10,
    maxImagesPerListing: 5,
  }).onConflictDoNothing();

  const [catEletro, catMoveis, catServicos, catEsportes, catInfantil] = await db
    .insert(marketplaceCategoriesTable)
    .values([
      { condominiumId: cond.id, name: "Eletrônicos", icon: "📱" },
      { condominiumId: cond.id, name: "Móveis e Decoração", icon: "🛋️" },
      { condominiumId: cond.id, name: "Serviços", icon: "🔧" },
      { condominiumId: cond.id, name: "Esportes", icon: "⚽" },
      { condominiumId: cond.id, name: "Infantil", icon: "🧸" },
    ])
    .returning();

  await db.insert(marketplaceListingsTable).values([
    {
      condominiumId: cond.id,
      residentId: admin.id,
      residentName: admin.email,
      title: "Smart TV Samsung 50\" 4K",
      description: "Televisão em ótimo estado, 2 anos de uso. Controle original, sem arranhões. Retirada no apartamento.",
      price: "1800.00",
      type: "product",
      status: "active",
      categoryId: catEletro.id,
      categoryName: catEletro.name,
      contactInfo: "WhatsApp: (11) 99999-0001",
      views: 14,
      isHighlighted: true,
    },
    {
      condominiumId: cond.id,
      residentId: admin.id,
      residentName: admin.email,
      title: "Sofá 3 lugares cinza",
      description: "Sofá retrátil com chaise em tecido cinza claro. Excelente estado. Comprado há 1 ano.",
      price: "2200.00",
      type: "product",
      status: "active",
      categoryId: catMoveis.id,
      categoryName: catMoveis.name,
      contactInfo: "Ligar para o apto 204",
      views: 8,
      isHighlighted: false,
    },
    {
      condominiumId: cond.id,
      residentId: admin.id,
      residentName: admin.email,
      title: "Aulas de inglês — nativo americano",
      description: "Ofereço aulas de inglês individuais ou em grupo. 15 anos de experiência. Valores a combinar.",
      price: null,
      type: "service",
      status: "active",
      categoryId: catServicos.id,
      categoryName: catServicos.name,
      contactInfo: "WhatsApp: (11) 98765-4321",
      views: 22,
      isHighlighted: false,
    },
    {
      condominiumId: cond.id,
      residentId: admin.id,
      residentName: admin.email,
      title: "Bicicleta MTB Caloi Explorer",
      description: "Bicicleta aro 29 com câmbio Shimano 21v. Usada aos fins de semana, pneus novos.",
      price: "950.00",
      type: "product",
      status: "active",
      categoryId: catEsportes.id,
      categoryName: catEsportes.name,
      contactInfo: "Contatar pelo interfone — apto 307",
      views: 5,
      isHighlighted: false,
    },
    {
      condominiumId: cond.id,
      residentId: admin.id,
      residentName: admin.email,
      title: "Kit berço + cômoda infantil",
      description: "Berço convertível em mini cama + cômoda 4 gavetas. Cor branca, marca Cia do Bebê. Estado impecável.",
      price: "1100.00",
      type: "product",
      status: "active",
      categoryId: catInfantil.id,
      categoryName: catInfantil.name,
      contactInfo: "WhatsApp: (11) 91234-5678",
      views: 11,
      isHighlighted: false,
    },
    {
      condominiumId: cond.id,
      residentId: admin.id,
      residentName: admin.email,
      title: "Serviço de Faxina e Limpeza",
      description: "Ofereço serviço de faxina completa para apartamentos. Produtos por conta do contratante. Agenda disponível.",
      price: "150.00",
      type: "service",
      status: "active",
      categoryId: catServicos.id,
      categoryName: catServicos.name,
      contactInfo: "WhatsApp: (11) 97654-3210",
      views: 31,
      isHighlighted: true,
    },
  ]);

  return cond.id;
}

export async function runSeed(): Promise<void> {
  await seedCondominium({
    name: "Residencial Vista Verde",
    address: "Rua das Acácias, 1500 — São Paulo, SP",
    primaryColor: "162 65% 32%",
    adminEmail: "admin@vistaverde.com.br",
    adminName: "Roberta Mendes",
    adminPassword: "condoos2026",
  });
  await seedCondominium({
    name: "Edifício Aurora",
    address: "Avenida Paulista, 2200 — São Paulo, SP",
    primaryColor: "200 75% 40%",
    adminEmail: "admin@aurora.com.br",
    adminName: "Henrique Costa",
    adminPassword: "condoos2026",
  });
  logger.info("Seed completo. Login: admin@vistaverde.com.br / condoos2026");
}

runSeed().then(() => process.exit(0)).catch((e) => {
  logger.error({ err: e }, "Seed failed");
  process.exit(1);
});
