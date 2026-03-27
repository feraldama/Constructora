import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:12345@localhost:5432/Prueba?schema=public",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Limpiar datos existentes (orden por dependencias) ───
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.budgetSummary.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.contractorAssignment.deleteMany();
  await prisma.projectContractor.deleteMany();
  await prisma.budgetItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contractor.deleteMany();
  await prisma.user.deleteMany();
  console.log("  ✓ Tablas limpiadas");

  // ═══════════════════════════════════════════════════════════
  // USUARIOS
  // ═══════════════════════════════════════════════════════════
  const passwordHash = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@buildcontrol.com",
      password: passwordHash,
      firstName: "Fernando",
      lastName: "Aldama",
    },
  });

  const editor = await prisma.user.create({
    data: {
      email: "editor@buildcontrol.com",
      password: passwordHash,
      firstName: "Maria",
      lastName: "González",
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: "viewer@buildcontrol.com",
      password: passwordHash,
      firstName: "Carlos",
      lastName: "Lopez",
    },
  });

  console.log("  ✓ 3 usuarios creados (password: 123456)");

  // ═══════════════════════════════════════════════════════════
  // PROYECTOS
  // ═══════════════════════════════════════════════════════════
  const project1 = await prisma.project.create({
    data: {
      name: "Edificio Torres del Sol",
      description:
        "Edificio residencial de 8 pisos con 32 departamentos, cocheras subterráneas y amenities.",
      address: "Av. San Martín 1250, Córdoba",
      initialBudget: 85000000,
      status: "IN_PROGRESS",
      startDate: new Date("2025-03-01"),
      estimatedEnd: new Date("2026-09-30"),
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Casa Familia Rodríguez",
      description: "Vivienda unifamiliar de 180m², 3 dormitorios, pileta y quincho.",
      address: "Los Aromos 45, Barrio Cerrado Las Acacias",
      initialBudget: 32000000,
      status: "IN_PROGRESS",
      startDate: new Date("2025-06-15"),
      estimatedEnd: new Date("2026-02-28"),
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "Refacción Oficinas TechCorp",
      description: "Remodelación de planta de oficinas de 400m², pisos, electricidad y datos.",
      address: "Bv. Chacabuco 678, Piso 3",
      initialBudget: 12000000,
      status: "PLANNING",
      startDate: new Date("2026-05-01"),
      estimatedEnd: new Date("2026-08-30"),
    },
  });

  console.log("  ✓ 3 proyectos creados");

  // ═══════════════════════════════════════════════════════════
  // MIEMBROS DE PROYECTO
  // ═══════════════════════════════════════════════════════════
  await prisma.projectMember.createMany({
    data: [
      { userId: admin.id, projectId: project1.id, role: "ADMIN" },
      { userId: editor.id, projectId: project1.id, role: "EDITOR" },
      { userId: viewer.id, projectId: project1.id, role: "VIEWER" },
      { userId: admin.id, projectId: project2.id, role: "ADMIN" },
      { userId: editor.id, projectId: project2.id, role: "EDITOR" },
      { userId: admin.id, projectId: project3.id, role: "ADMIN" },
    ],
  });

  console.log("  ✓ Miembros de proyecto asignados");

  // ═══════════════════════════════════════════════════════════
  // CONTRATISTAS
  // ═══════════════════════════════════════════════════════════
  const contractor1 = await prisma.contractor.create({
    data: {
      name: "Hormigonera del Centro SRL",
      contactName: "Roberto Martínez",
      email: "roberto@hormigoneracentro.com",
      phone: "351-4556677",
      taxId: "30-71234567-8",
      address: "Ruta 9 km 712, Córdoba",
      notes: "Proveedor de hormigón elaborado. Entrega con bomba incluida.",
    },
  });

  const contractor2 = await prisma.contractor.create({
    data: {
      name: "Electricidad Moderna",
      contactName: "Ana Lucía Peralta",
      email: "ana@electricidadmoderna.com",
      phone: "351-6789012",
      taxId: "20-28345678-5",
      address: "Colón 890, Córdoba",
      notes: "Instalaciones eléctricas domiciliarias e industriales. Matriculado.",
    },
  });

  const contractor3 = await prisma.contractor.create({
    data: {
      name: "Sanitarios Belgrano",
      contactName: "Jorge Ruiz",
      email: "jorge@sanitariosbelgrano.com",
      phone: "351-2345678",
      taxId: "20-32456789-1",
      address: "Belgrano 456, Córdoba",
    },
  });

  const contractor4 = await prisma.contractor.create({
    data: {
      name: "Movimientos de Suelo Giménez",
      contactName: "Pedro Giménez",
      email: "pedro@suelosgimenez.com",
      phone: "351-8901234",
      taxId: "23-25678901-9",
      address: "Camino a San Carlos km 5",
    },
  });

  const contractor5 = await prisma.contractor.create({
    data: {
      name: "Pinturas y Terminaciones Express",
      contactName: "Luciana Torres",
      email: "luciana@pinturasexpress.com",
      phone: "351-3456789",
      taxId: "27-30123456-4",
      isActive: false,
      notes: "Inactivo — no cumplió plazos en último proyecto.",
    },
  });

  console.log("  ✓ 5 contratistas creados (1 inactivo)");

  // ═══════════════════════════════════════════════════════════
  // CONTRATISTAS ↔ PROYECTOS
  // ═══════════════════════════════════════════════════════════
  await prisma.projectContractor.createMany({
    data: [
      { projectId: project1.id, contractorId: contractor1.id },
      { projectId: project1.id, contractorId: contractor2.id },
      { projectId: project1.id, contractorId: contractor3.id },
      { projectId: project1.id, contractorId: contractor4.id },
      { projectId: project2.id, contractorId: contractor1.id },
      { projectId: project2.id, contractorId: contractor2.id },
      { projectId: project2.id, contractorId: contractor4.id },
    ],
  });

  console.log("  ✓ Contratistas vinculados a proyectos");

  // ═══════════════════════════════════════════════════════════
  // CATEGORÍAS Y PARTIDAS — Proyecto 1 (Edificio)
  // ═══════════════════════════════════════════════════════════
  const cat1_1 = await prisma.category.create({
    data: { projectId: project1.id, name: "Movimiento de Suelo", sortOrder: 0 },
  });
  const cat1_2 = await prisma.category.create({
    data: { projectId: project1.id, name: "Estructura de Hormigón", sortOrder: 1 },
  });
  const cat1_3 = await prisma.category.create({
    data: { projectId: project1.id, name: "Mampostería", sortOrder: 2 },
  });
  const cat1_4 = await prisma.category.create({
    data: { projectId: project1.id, name: "Instalación Eléctrica", sortOrder: 3 },
  });
  const cat1_5 = await prisma.category.create({
    data: { projectId: project1.id, name: "Instalación Sanitaria", sortOrder: 4 },
  });

  // Items
  const bi = async (
    catId: string,
    name: string,
    unit: "M2" | "M3" | "ML" | "UNIT" | "KG" | "GLOBAL",
    qty: number,
    price: number,
    order: number
  ) =>
    prisma.budgetItem.create({
      data: {
        categoryId: catId,
        name,
        unit,
        quantity: qty,
        unitPrice: price,
        subtotal: qty * price,
        sortOrder: order,
      },
    });

  // Movimiento de Suelo
  const item1 = await bi(cat1_1.id, "Excavación para fundaciones", "M3", 350, 4500, 0);
  const item2 = await bi(cat1_1.id, "Relleno y compactación", "M3", 200, 3200, 1);
  const item3 = await bi(cat1_1.id, "Retiro de suelo sobrante", "M3", 150, 2800, 2);

  // Estructura de Hormigón
  const item4 = await bi(cat1_2.id, "Hormigón armado columnas", "M3", 45, 95000, 0);
  const item5 = await bi(cat1_2.id, "Hormigón armado vigas", "M3", 30, 92000, 1);
  const item6 = await bi(cat1_2.id, "Losa nervurada (8 pisos)", "M2", 1600, 32000, 2);
  const item7 = await bi(cat1_2.id, "Escalera de hormigón", "GLOBAL", 1, 850000, 3);

  // Mampostería
  const item8 = await bi(cat1_3.id, "Muro exterior ladrillo hueco 18cm", "M2", 2400, 8500, 0);
  const item9 = await bi(cat1_3.id, "Muro interior ladrillo hueco 12cm", "M2", 3200, 6800, 1);
  const item10 = await bi(cat1_3.id, "Revoque grueso interior", "M2", 5600, 3200, 2);

  // Eléctrica
  const item11 = await bi(cat1_4.id, "Cañería y cableado por depto", "UNIT", 32, 180000, 0);
  const item12 = await bi(cat1_4.id, "Tablero general + diferencial", "UNIT", 33, 95000, 1);
  const item13 = await bi(cat1_4.id, "Instalación en áreas comunes", "GLOBAL", 1, 650000, 2);

  // Sanitaria
  const item14 = await bi(cat1_5.id, "Instalación agua fría/caliente por depto", "UNIT", 32, 120000, 0);
  const item15 = await bi(cat1_5.id, "Desagüe cloacal", "ML", 280, 8500, 1);
  const item16 = await bi(cat1_5.id, "Tanque y bombeo", "GLOBAL", 1, 950000, 2);

  console.log("  ✓ 5 categorías + 16 partidas (Proyecto 1)");

  // ═══════════════════════════════════════════════════════════
  // CATEGORÍAS Y PARTIDAS — Proyecto 2 (Casa)
  // ═══════════════════════════════════════════════════════════
  const cat2_1 = await prisma.category.create({
    data: { projectId: project2.id, name: "Movimiento de Suelo", sortOrder: 0 },
  });
  const cat2_2 = await prisma.category.create({
    data: { projectId: project2.id, name: "Estructura", sortOrder: 1 },
  });
  const cat2_3 = await prisma.category.create({
    data: { projectId: project2.id, name: "Instalación Eléctrica", sortOrder: 2 },
  });

  const item17 = await bi(cat2_1.id, "Excavación", "M3", 80, 4500, 0);
  const item18 = await bi(cat2_1.id, "Relleno", "M3", 40, 3200, 1);
  const item19 = await bi(cat2_2.id, "Platea de fundación", "M3", 18, 90000, 0);
  const item20 = await bi(cat2_2.id, "Losa de techo", "M2", 180, 30000, 1);
  const item21 = await bi(cat2_3.id, "Instalación eléctrica completa", "GLOBAL", 1, 1800000, 0);

  console.log("  ✓ 3 categorías + 5 partidas (Proyecto 2)");

  // ═══════════════════════════════════════════════════════════
  // ASIGNACIONES (Contratista ↔ Partida)
  // ═══════════════════════════════════════════════════════════
  const assign = async (cId: string, biId: string, qty: number, price: number) =>
    prisma.contractorAssignment.create({
      data: { contractorId: cId, budgetItemId: biId, assignedQuantity: qty, agreedPrice: price },
    });

  // Proyecto 1
  await assign(contractor4.id, item1.id, 350, 1575000);  // Giménez — excavación
  await assign(contractor4.id, item2.id, 200, 640000);    // Giménez — relleno
  await assign(contractor4.id, item3.id, 150, 420000);    // Giménez — retiro

  await assign(contractor1.id, item4.id, 45, 4275000);    // Hormigonera — columnas
  await assign(contractor1.id, item5.id, 30, 2760000);    // Hormigonera — vigas
  await assign(contractor1.id, item6.id, 1600, 51200000); // Hormigonera — losa
  await assign(contractor1.id, item7.id, 1, 850000);      // Hormigonera — escalera

  await assign(contractor2.id, item11.id, 32, 5760000);   // Eléctrica — deptos
  await assign(contractor2.id, item12.id, 33, 3135000);   // Eléctrica — tableros
  await assign(contractor2.id, item13.id, 1, 650000);     // Eléctrica — comunes

  await assign(contractor3.id, item14.id, 32, 3840000);   // Sanitarios — agua
  await assign(contractor3.id, item15.id, 280, 2380000);  // Sanitarios — cloacal
  await assign(contractor3.id, item16.id, 1, 950000);     // Sanitarios — tanque

  // Proyecto 2
  await assign(contractor4.id, item17.id, 80, 360000);    // Giménez — excavación casa
  await assign(contractor1.id, item19.id, 18, 1620000);   // Hormigonera — platea
  await assign(contractor1.id, item20.id, 180, 5400000);  // Hormigonera — losa casa
  await assign(contractor2.id, item21.id, 1, 1800000);    // Eléctrica — casa

  console.log("  ✓ 17 asignaciones de partidas a contratistas");

  // ═══════════════════════════════════════════════════════════
  // PAGOS — Variados estados y fechas
  // ═══════════════════════════════════════════════════════════
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000);

  const pay = async (
    projId: string, contrId: string, biId: string | null,
    amount: number, status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED",
    desc: string, invoice: string | null,
    due: Date | null, paid: Date | null, created: Date
  ) =>
    prisma.payment.create({
      data: {
        projectId: projId,
        contractorId: contrId,
        budgetItemId: biId,
        amount,
        status,
        description: desc,
        invoiceNumber: invoice,
        dueDate: due,
        paidAt: paid,
        createdAt: created,
      },
    });

  // --- Proyecto 1: Pagos a Giménez (mov. suelo) ---
  await pay(project1.id, contractor4.id, item1.id, 500000, "PAID", "Anticipo excavación", "FC-A-0001", daysAgo(45), daysAgo(44), daysAgo(50));
  await pay(project1.id, contractor4.id, item1.id, 500000, "PAID", "2do avance excavación", "FC-A-0002", daysAgo(30), daysAgo(28), daysAgo(35));
  await pay(project1.id, contractor4.id, item1.id, 575000, "PAID", "Liquidación final excavación", "FC-A-0003", daysAgo(15), daysAgo(14), daysAgo(20));
  await pay(project1.id, contractor4.id, item2.id, 320000, "PAID", "Relleno 50%", "FC-A-0004", daysAgo(10), daysAgo(9), daysAgo(15));
  await pay(project1.id, contractor4.id, item2.id, 320000, "PENDING", "Relleno restante", null, daysFromNow(5), null, daysAgo(5));

  // --- Proyecto 1: Pagos a Hormigonera (estructura) ---
  await pay(project1.id, contractor1.id, item4.id, 2000000, "PAID", "Anticipo columnas", "FC-B-0010", daysAgo(60), daysAgo(58), daysAgo(65));
  await pay(project1.id, contractor1.id, item4.id, 2275000, "PAID", "Liquidación columnas", "FC-B-0011", daysAgo(40), daysAgo(38), daysAgo(45));
  await pay(project1.id, contractor1.id, item5.id, 1380000, "PAID", "Vigas 50%", "FC-B-0012", daysAgo(25), daysAgo(23), daysAgo(30));
  await pay(project1.id, contractor1.id, item5.id, 1380000, "PENDING", "Vigas restante", null, daysFromNow(10), null, daysAgo(3));
  await pay(project1.id, contractor1.id, item6.id, 15000000, "PAID", "Losa pisos 1-3", "FC-B-0013", daysAgo(20), daysAgo(18), daysAgo(25));
  await pay(project1.id, contractor1.id, item6.id, 15000000, "PENDING", "Losa pisos 4-6", null, daysFromNow(15), null, daysAgo(2));
  await pay(project1.id, contractor1.id, item6.id, 15000000, "PENDING", "Losa pisos 7-8", null, daysFromNow(45), null, daysAgo(1));

  // --- Proyecto 1: Pagos a Eléctrica Moderna ---
  await pay(project1.id, contractor2.id, item11.id, 2000000, "PAID", "Electricidad deptos 1-12", "FC-C-0020", daysAgo(15), daysAgo(13), daysAgo(20));
  await pay(project1.id, contractor2.id, item11.id, 2000000, "OVERDUE", "Electricidad deptos 13-24", "FC-C-0021", daysAgo(5), null, daysAgo(12));
  await pay(project1.id, contractor2.id, item12.id, 1500000, "PENDING", "Tableros pisos 1-4", null, daysFromNow(2), null, daysAgo(7));

  // --- Proyecto 1: Pagos a Sanitarios Belgrano ---
  await pay(project1.id, contractor3.id, item14.id, 1500000, "PAID", "Agua fría/caliente pisos 1-3", "FC-D-0030", daysAgo(20), daysAgo(18), daysAgo(25));
  await pay(project1.id, contractor3.id, item15.id, 1200000, "PAID", "Desagüe tramo principal", "FC-D-0031", daysAgo(12), daysAgo(10), daysAgo(15));
  await pay(project1.id, contractor3.id, item14.id, 1500000, "OVERDUE", "Agua pisos 4-6", null, daysAgo(3), null, daysAgo(10));
  await pay(project1.id, contractor3.id, item16.id, 500000, "PENDING", "Anticipo tanque y bombeo", null, daysFromNow(20), null, daysAgo(2));

  // --- Proyecto 2: Pagos ---
  await pay(project2.id, contractor4.id, item17.id, 180000, "PAID", "Excavación 50%", "FC-A-0050", daysAgo(30), daysAgo(28), daysAgo(35));
  await pay(project2.id, contractor4.id, item17.id, 180000, "PAID", "Excavación restante", "FC-A-0051", daysAgo(20), daysAgo(18), daysAgo(25));
  await pay(project2.id, contractor1.id, item19.id, 810000, "PAID", "Platea 50%", "FC-B-0050", daysAgo(15), daysAgo(13), daysAgo(20));
  await pay(project2.id, contractor1.id, item19.id, 810000, "PENDING", "Platea restante", null, daysFromNow(7), null, daysAgo(5));
  await pay(project2.id, contractor1.id, item20.id, 2700000, "PENDING", "Losa de techo anticipo", null, daysFromNow(30), null, daysAgo(1));
  await pay(project2.id, contractor2.id, item21.id, 600000, "PAID", "Eléctrica anticipo", "FC-C-0050", daysAgo(10), daysAgo(8), daysAgo(12));
  await pay(project2.id, contractor2.id, item21.id, 600000, "OVERDUE", "Eléctrica 2do avance", null, daysAgo(2), null, daysAgo(8));

  console.log("  ✓ 26 pagos creados (variados estados y fechas)");

  // ═══════════════════════════════════════════════════════════
  // BUDGET SUMMARIES (precalculados)
  // ═══════════════════════════════════════════════════════════
  for (const projId of [project1.id, project2.id]) {
    const estimated = await prisma.budgetItem.aggregate({
      where: { category: { projectId: projId } },
      _sum: { subtotal: true },
    });

    const payments = await prisma.payment.groupBy({
      by: ["status"],
      where: { projectId: projId },
      _sum: { amount: true },
    });

    const paid = Number(payments.find((p) => p.status === "PAID")?._sum.amount ?? 0);
    const pending =
      Number(payments.find((p) => p.status === "PENDING")?._sum.amount ?? 0) +
      Number(payments.find((p) => p.status === "OVERDUE")?._sum.amount ?? 0);

    await prisma.budgetSummary.create({
      data: {
        projectId: projId,
        estimatedTotal: Number(estimated._sum.subtotal ?? 0),
        actualTotal: paid + pending,
        totalPaid: paid,
        totalPending: pending,
        lastCalculatedAt: new Date(),
      },
    });
  }

  console.log("  ✓ Budget summaries calculados");

  // ═══════════════════════════════════════════════════════════
  // ACTIVITY LOGS
  // ═══════════════════════════════════════════════════════════
  const logEntries = [
    { action: "CREATE_PAYMENT", entityType: "Payment", days: 65 },
    { action: "CREATE_PAYMENT", entityType: "Payment", days: 50 },
    { action: "UPDATE_PAYMENT", entityType: "Payment", days: 44 },
    { action: "CREATE_CONTRACTOR", entityType: "Contractor", days: 70 },
    { action: "CREATE_PAYMENT", entityType: "Payment", days: 35 },
    { action: "CREATE_PAYMENT", entityType: "Payment", days: 25 },
    { action: "UPDATE_PAYMENT", entityType: "Payment", days: 18 },
    { action: "CREATE_PAYMENT", entityType: "Payment", days: 12 },
    { action: "CREATE_PAYMENT", entityType: "Payment", days: 7 },
    { action: "UPDATE_CONTRACTOR", entityType: "Contractor", days: 5 },
    { action: "CREATE_PAYMENT", entityType: "Payment", days: 3 },
    { action: "CREATE_PAYMENT", entityType: "Payment", days: 1 },
  ];

  await prisma.activityLog.createMany({
    data: logEntries.map((entry) => ({
      userId: admin.id,
      projectId: project1.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: project1.id,
      metadata: { seeded: true },
      createdAt: daysAgo(entry.days),
    })),
  });

  console.log("  ✓ 12 activity logs creados");

  // ═══════════════════════════════════════════════════════════
  // NOTIFICACIONES de ejemplo
  // ═══════════════════════════════════════════════════════════
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: "PAYMENT_OVERDUE",
        title: "Pago vencido hace 5 días",
        message:
          "Pago de $2.000.000 a Electricidad Moderna en Edificio Torres del Sol está vencido.",
        isRead: false,
        metadata: { projectId: project1.id, contractorName: "Electricidad Moderna", amount: 2000000 },
        createdAt: daysAgo(1),
      },
      {
        userId: admin.id,
        type: "PAYMENT_DUE",
        title: "Pago vence en 2 días",
        message:
          "Pago de $1.500.000 a Electricidad Moderna en Edificio Torres del Sol vence pronto.",
        isRead: false,
        metadata: { projectId: project1.id, contractorName: "Electricidad Moderna", amount: 1500000 },
        createdAt: daysAgo(0),
      },
      {
        userId: admin.id,
        type: "PAYMENT_OVERDUE",
        title: "Pago vencido hace 3 días",
        message:
          "Pago de $1.500.000 a Sanitarios Belgrano en Edificio Torres del Sol está vencido.",
        isRead: true,
        metadata: { projectId: project1.id, contractorName: "Sanitarios Belgrano", amount: 1500000 },
        createdAt: daysAgo(2),
      },
      {
        userId: admin.id,
        type: "GENERAL",
        title: "Bienvenido a BuildControl",
        message: "Tu cuenta fue creada exitosamente. Comenzá a gestionar tus obras.",
        isRead: true,
        metadata: {},
        createdAt: daysAgo(70),
      },
      {
        userId: editor.id,
        type: "PAYMENT_OVERDUE",
        title: "Pago vencido hace 2 días",
        message: "Pago de $600.000 a Electricidad Moderna en Casa Familia Rodríguez está vencido.",
        isRead: false,
        metadata: { projectId: project2.id, contractorName: "Electricidad Moderna", amount: 600000 },
        createdAt: daysAgo(0),
      },
    ],
  });

  console.log("  ✓ 5 notificaciones creadas");

  // ═══════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════
  console.log("\n🎉 Seed completado!\n");
  console.log("  Credenciales de acceso:");
  console.log("  ┌──────────────────────────────┬──────────┬────────┐");
  console.log("  │ Email                        │ Password │ Rol    │");
  console.log("  ├──────────────────────────────┼──────────┼────────┤");
  console.log("  │ admin@buildcontrol.com       │ 123456   │ ADMIN  │");
  console.log("  │ editor@buildcontrol.com      │ 123456   │ EDITOR │");
  console.log("  │ viewer@buildcontrol.com      │ 123456   │ VIEWER │");
  console.log("  └──────────────────────────────┴──────────┴────────┘");
  console.log("");
  console.log("  Datos creados:");
  console.log("  • 3 usuarios");
  console.log("  • 3 proyectos (2 en progreso, 1 en planificación)");
  console.log("  • 5 contratistas (1 inactivo)");
  console.log("  • 8 categorías con 21 partidas");
  console.log("  • 17 asignaciones contratista-partida");
  console.log("  • 26 pagos (mixto: pagados, pendientes, vencidos)");
  console.log("  • 5 notificaciones");
  console.log("  • 12 logs de actividad");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
