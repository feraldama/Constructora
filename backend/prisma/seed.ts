import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:12345@localhost:5432/constructora?schema=public",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Limpiar datos existentes (orden por dependencias) ───
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.budgetSummary.deleteMany();
  await prisma.certificateItem.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.progressEntry.deleteMany();
  await prisma.projectExpense.deleteMany();
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
      globalRole: "SUPER_ADMIN",
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
      description: "Edificio residencial de 8 pisos con 32 departamentos, cocheras subterráneas y amenities.",
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
  const cat1_1 = await prisma.category.create({ data: { projectId: project1.id, name: "Movimiento de Suelo", sortOrder: 0 } });
  const cat1_2 = await prisma.category.create({ data: { projectId: project1.id, name: "Estructura de Hormigón", sortOrder: 1 } });
  const cat1_3 = await prisma.category.create({ data: { projectId: project1.id, name: "Mampostería", sortOrder: 2 } });
  const cat1_4 = await prisma.category.create({ data: { projectId: project1.id, name: "Instalación Eléctrica", sortOrder: 3 } });
  const cat1_5 = await prisma.category.create({ data: { projectId: project1.id, name: "Instalación Sanitaria", sortOrder: 4 } });

  // Helper para crear items con costo y venta (+30%)
  const bi = async (
    catId: string, name: string,
    unit: "M2" | "M3" | "ML" | "UNIT" | "KG" | "TON" | "GLOBAL",
    qty: number, costPrice: number, order: number
  ) => {
    const salePrice = Math.round(costPrice * 1.3 * 100) / 100;
    return prisma.budgetItem.create({
      data: {
        categoryId: catId, name, unit,
        quantity: qty,
        costUnitPrice: costPrice,
        saleUnitPrice: salePrice,
        costSubtotal: qty * costPrice,
        saleSubtotal: qty * salePrice,
        sortOrder: order,
      },
    });
  };

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
  const cat2_1 = await prisma.category.create({ data: { projectId: project2.id, name: "Movimiento de Suelo", sortOrder: 0 } });
  const cat2_2 = await prisma.category.create({ data: { projectId: project2.id, name: "Estructura", sortOrder: 1 } });
  const cat2_3 = await prisma.category.create({ data: { projectId: project2.id, name: "Instalación Eléctrica", sortOrder: 2 } });

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
  await assign(contractor4.id, item1.id, 350, 1575000);
  await assign(contractor4.id, item2.id, 200, 640000);
  await assign(contractor4.id, item3.id, 150, 420000);
  await assign(contractor1.id, item4.id, 45, 4275000);
  await assign(contractor1.id, item5.id, 30, 2760000);
  await assign(contractor1.id, item6.id, 1600, 51200000);
  await assign(contractor1.id, item7.id, 1, 850000);
  await assign(contractor2.id, item11.id, 32, 5760000);
  await assign(contractor2.id, item12.id, 33, 3135000);
  await assign(contractor2.id, item13.id, 1, 650000);
  await assign(contractor3.id, item14.id, 32, 3840000);
  await assign(contractor3.id, item15.id, 280, 2380000);
  await assign(contractor3.id, item16.id, 1, 950000);

  // Proyecto 2
  await assign(contractor4.id, item17.id, 80, 360000);
  await assign(contractor1.id, item19.id, 18, 1620000);
  await assign(contractor1.id, item20.id, 180, 5400000);
  await assign(contractor2.id, item21.id, 1, 1800000);

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
    method: "CASH" | "BANK_TRANSFER" | "CHECK" | "OTHER" | null,
    desc: string, invoice: string | null,
    due: Date | null, paid: Date | null, created: Date
  ) =>
    prisma.payment.create({
      data: {
        projectId: projId, contractorId: contrId, budgetItemId: biId,
        amount, status, paymentMethod: method,
        description: desc, invoiceNumber: invoice,
        dueDate: due, paidAt: paid, createdAt: created,
      },
    });

  // Proyecto 1: Giménez (mov. suelo)
  await pay(project1.id, contractor4.id, item1.id, 500000, "PAID", "BANK_TRANSFER", "Anticipo excavación", "FC-A-0001", daysAgo(45), daysAgo(44), daysAgo(50));
  await pay(project1.id, contractor4.id, item1.id, 500000, "PAID", "BANK_TRANSFER", "2do avance excavación", "FC-A-0002", daysAgo(30), daysAgo(28), daysAgo(35));
  await pay(project1.id, contractor4.id, item1.id, 575000, "PAID", "CHECK", "Liquidación final excavación", "FC-A-0003", daysAgo(15), daysAgo(14), daysAgo(20));
  await pay(project1.id, contractor4.id, item2.id, 320000, "PAID", "CASH", "Relleno 50%", "FC-A-0004", daysAgo(10), daysAgo(9), daysAgo(15));
  await pay(project1.id, contractor4.id, item2.id, 320000, "PENDING", null, "Relleno restante", null, daysFromNow(5), null, daysAgo(5));

  // Proyecto 1: Hormigonera (estructura)
  await pay(project1.id, contractor1.id, item4.id, 2000000, "PAID", "BANK_TRANSFER", "Anticipo columnas", "FC-B-0010", daysAgo(60), daysAgo(58), daysAgo(65));
  await pay(project1.id, contractor1.id, item4.id, 2275000, "PAID", "BANK_TRANSFER", "Liquidación columnas", "FC-B-0011", daysAgo(40), daysAgo(38), daysAgo(45));
  await pay(project1.id, contractor1.id, item5.id, 1380000, "PAID", "CHECK", "Vigas 50%", "FC-B-0012", daysAgo(25), daysAgo(23), daysAgo(30));
  await pay(project1.id, contractor1.id, item5.id, 1380000, "PENDING", null, "Vigas restante", null, daysFromNow(10), null, daysAgo(3));
  await pay(project1.id, contractor1.id, item6.id, 15000000, "PAID", "BANK_TRANSFER", "Losa pisos 1-3", "FC-B-0013", daysAgo(20), daysAgo(18), daysAgo(25));
  await pay(project1.id, contractor1.id, item6.id, 15000000, "PENDING", null, "Losa pisos 4-6", null, daysFromNow(15), null, daysAgo(2));
  await pay(project1.id, contractor1.id, item6.id, 15000000, "PENDING", null, "Losa pisos 7-8", null, daysFromNow(45), null, daysAgo(1));

  // Proyecto 1: Eléctrica Moderna
  await pay(project1.id, contractor2.id, item11.id, 2000000, "PAID", "BANK_TRANSFER", "Electricidad deptos 1-12", "FC-C-0020", daysAgo(15), daysAgo(13), daysAgo(20));
  await pay(project1.id, contractor2.id, item11.id, 2000000, "OVERDUE", null, "Electricidad deptos 13-24", "FC-C-0021", daysAgo(5), null, daysAgo(12));
  await pay(project1.id, contractor2.id, item12.id, 1500000, "PENDING", null, "Tableros pisos 1-4", null, daysFromNow(2), null, daysAgo(7));

  // Proyecto 1: Sanitarios Belgrano
  await pay(project1.id, contractor3.id, item14.id, 1500000, "PAID", "CASH", "Agua fría/caliente pisos 1-3", "FC-D-0030", daysAgo(20), daysAgo(18), daysAgo(25));
  await pay(project1.id, contractor3.id, item15.id, 1200000, "PAID", "CHECK", "Desagüe tramo principal", "FC-D-0031", daysAgo(12), daysAgo(10), daysAgo(15));
  await pay(project1.id, contractor3.id, item14.id, 1500000, "OVERDUE", null, "Agua pisos 4-6", null, daysAgo(3), null, daysAgo(10));
  await pay(project1.id, contractor3.id, item16.id, 500000, "PENDING", null, "Anticipo tanque y bombeo", null, daysFromNow(20), null, daysAgo(2));

  // Proyecto 2
  await pay(project2.id, contractor4.id, item17.id, 180000, "PAID", "CASH", "Excavación 50%", "FC-A-0050", daysAgo(30), daysAgo(28), daysAgo(35));
  await pay(project2.id, contractor4.id, item17.id, 180000, "PAID", "CASH", "Excavación restante", "FC-A-0051", daysAgo(20), daysAgo(18), daysAgo(25));
  await pay(project2.id, contractor1.id, item19.id, 810000, "PAID", "BANK_TRANSFER", "Platea 50%", "FC-B-0050", daysAgo(15), daysAgo(13), daysAgo(20));
  await pay(project2.id, contractor1.id, item19.id, 810000, "PENDING", null, "Platea restante", null, daysFromNow(7), null, daysAgo(5));
  await pay(project2.id, contractor1.id, item20.id, 2700000, "PENDING", null, "Losa de techo anticipo", null, daysFromNow(30), null, daysAgo(1));
  await pay(project2.id, contractor2.id, item21.id, 600000, "PAID", "BANK_TRANSFER", "Eléctrica anticipo", "FC-C-0050", daysAgo(10), daysAgo(8), daysAgo(12));
  await pay(project2.id, contractor2.id, item21.id, 600000, "OVERDUE", null, "Eléctrica 2do avance", null, daysAgo(2), null, daysAgo(8));

  console.log("  ✓ 26 pagos creados (con métodos de pago variados)");

  // ═══════════════════════════════════════════════════════════
  // GASTOS ADICIONALES
  // ═══════════════════════════════════════════════════════════
  await prisma.projectExpense.createMany({
    data: [
      { projectId: project1.id, description: "Cemento Portland x 50 bolsas", quantity: 50, unitPrice: 8500, amount: 425000, expenseType: "MATERIALS", expenseDate: daysAgo(40), invoiceRef: "FC-MAT-001", budgetItemId: item8.id },
      { projectId: project1.id, description: "Arena gruesa 10m³", quantity: 10, unitPrice: 35000, amount: 350000, expenseType: "MATERIALS", expenseDate: daysAgo(35), invoiceRef: "FC-MAT-002", budgetItemId: item10.id },
      { projectId: project1.id, description: "Alquiler retroexcavadora", quantity: 5, unitPrice: 120000, amount: 600000, expenseType: "EQUIPMENT", expenseDate: daysAgo(50), invoiceRef: "FC-EQ-001", budgetItemId: item1.id },
      { projectId: project1.id, description: "Permiso de obra municipal", quantity: 1, unitPrice: 280000, amount: 280000, expenseType: "PERMITS", expenseDate: daysAgo(90), invoiceRef: "PERM-2025-001" },
      { projectId: project1.id, description: "Seguro de obra (trimestre 1)", quantity: 1, unitPrice: 450000, amount: 450000, expenseType: "OVERHEAD", expenseDate: daysAgo(60), invoiceRef: "SEG-001" },
      { projectId: project1.id, description: "Ladrillos huecos 18cm x 5000", quantity: 5000, unitPrice: 850, amount: 4250000, expenseType: "MATERIALS", expenseDate: daysAgo(25), invoiceRef: "FC-MAT-003", budgetItemId: item8.id },
      { projectId: project1.id, description: "Hierro ø12 x 2000 barras", quantity: 2000, unitPrice: 4200, amount: 8400000, expenseType: "MATERIALS", expenseDate: daysAgo(55), invoiceRef: "FC-MAT-004", budgetItemId: item4.id },
      { projectId: project2.id, description: "Cemento x 20 bolsas", quantity: 20, unitPrice: 8500, amount: 170000, expenseType: "MATERIALS", expenseDate: daysAgo(20), invoiceRef: "FC-MAT-050", budgetItemId: item19.id },
      { projectId: project2.id, description: "Alquiler compactador", quantity: 2, unitPrice: 45000, amount: 90000, expenseType: "EQUIPMENT", expenseDate: daysAgo(25), invoiceRef: "FC-EQ-050" },
      { projectId: project2.id, description: "Gastos de oficina técnica", quantity: 1, unitPrice: 85000, amount: 85000, expenseType: "OVERHEAD", expenseDate: daysAgo(10) },
    ],
  });

  console.log("  ✓ 10 gastos adicionales (con cantidad, P.U. y partidas vinculadas)");

  // ═══════════════════════════════════════════════════════════
  // AVANCE FÍSICO (Progress Entries)
  // ═══════════════════════════════════════════════════════════
  await prisma.progressEntry.createMany({
    data: [
      { budgetItemId: item1.id, quantity: 200, date: daysAgo(30), recordedById: admin.id, notes: "Excavación tramo A completado" },
      { budgetItemId: item1.id, quantity: 150, date: daysAgo(15), recordedById: admin.id, notes: "Excavación tramo B completado" },
      { budgetItemId: item2.id, quantity: 120, date: daysAgo(8), recordedById: admin.id },
      { budgetItemId: item4.id, quantity: 45, date: daysAgo(35), recordedById: editor.id, notes: "Columnas P1 a P8 hormigonadas" },
      { budgetItemId: item5.id, quantity: 15, date: daysAgo(20), recordedById: editor.id },
      { budgetItemId: item6.id, quantity: 600, date: daysAgo(15), recordedById: admin.id, notes: "Losa pisos 1-3" },
      { budgetItemId: item11.id, quantity: 12, date: daysAgo(10), recordedById: editor.id },
      { budgetItemId: item14.id, quantity: 10, date: daysAgo(12), recordedById: admin.id },
      { budgetItemId: item17.id, quantity: 80, date: daysAgo(22), recordedById: admin.id, notes: "Excavación completa" },
      { budgetItemId: item19.id, quantity: 12, date: daysAgo(10), recordedById: admin.id },
    ],
  });

  console.log("  ✓ 10 registros de avance físico");

  // ═══════════════════════════════════════════════════════════
  // CERTIFICACIONES
  // ═══════════════════════════════════════════════════════════
  const cert1 = await prisma.certificate.create({
    data: {
      projectId: project1.id,
      contractorId: contractor1.id,
      certificateNumber: 1,
      periodStart: daysAgo(60),
      periodEnd: daysAgo(31),
      status: "APPROVED",
      totalAmount: 7035000,
      submittedAt: daysAgo(30),
      approvedAt: daysAgo(28),
      notes: "Certificación columnas completas + 50% vigas",
    },
  });

  await prisma.certificateItem.createMany({
    data: [
      { certificateId: cert1.id, budgetItemId: item4.id, previousQuantity: 0, currentQuantity: 45, accumulatedQuantity: 45, unitPrice: 95000, currentAmount: 4275000 },
      { certificateId: cert1.id, budgetItemId: item5.id, previousQuantity: 0, currentQuantity: 15, accumulatedQuantity: 15, unitPrice: 92000, currentAmount: 1380000 },
      { certificateId: cert1.id, budgetItemId: item6.id, previousQuantity: 0, currentQuantity: 0, accumulatedQuantity: 0, unitPrice: 32000, currentAmount: 0 },
      { certificateId: cert1.id, budgetItemId: item7.id, previousQuantity: 0, currentQuantity: 0, accumulatedQuantity: 0, unitPrice: 850000, currentAmount: 0 },
    ],
  });

  const cert2 = await prisma.certificate.create({
    data: {
      projectId: project1.id,
      contractorId: contractor4.id,
      certificateNumber: 2,
      periodStart: daysAgo(50),
      periodEnd: daysAgo(16),
      status: "APPROVED",
      totalAmount: 2635000,
      submittedAt: daysAgo(15),
      approvedAt: daysAgo(13),
    },
  });

  await prisma.certificateItem.createMany({
    data: [
      { certificateId: cert2.id, budgetItemId: item1.id, previousQuantity: 0, currentQuantity: 350, accumulatedQuantity: 350, unitPrice: 4500, currentAmount: 1575000 },
      { certificateId: cert2.id, budgetItemId: item2.id, previousQuantity: 0, currentQuantity: 120, accumulatedQuantity: 120, unitPrice: 3200, currentAmount: 384000 },
      { certificateId: cert2.id, budgetItemId: item3.id, previousQuantity: 0, currentQuantity: 150, accumulatedQuantity: 150, unitPrice: 2800, currentAmount: 420000 },
    ],
  });

  const cert3 = await prisma.certificate.create({
    data: {
      projectId: project1.id,
      contractorId: contractor2.id,
      certificateNumber: 3,
      periodStart: daysAgo(20),
      periodEnd: daysAgo(1),
      status: "SUBMITTED",
      totalAmount: 2000000,
      submittedAt: daysAgo(1),
      notes: "Pendiente de aprobación — electricidad deptos 1-12",
    },
  });

  await prisma.certificateItem.createMany({
    data: [
      { certificateId: cert3.id, budgetItemId: item11.id, previousQuantity: 0, currentQuantity: 12, accumulatedQuantity: 12, unitPrice: 180000, currentAmount: 2160000 },
      { certificateId: cert3.id, budgetItemId: item12.id, previousQuantity: 0, currentQuantity: 0, accumulatedQuantity: 0, unitPrice: 95000, currentAmount: 0 },
      { certificateId: cert3.id, budgetItemId: item13.id, previousQuantity: 0, currentQuantity: 0, accumulatedQuantity: 0, unitPrice: 650000, currentAmount: 0 },
    ],
  });

  console.log("  ✓ 3 certificaciones (2 aprobadas, 1 enviada)");

  // ═══════════════════════════════════════════════════════════
  // BUDGET SUMMARIES
  // ═══════════════════════════════════════════════════════════
  for (const projId of [project1.id, project2.id]) {
    const items = await prisma.budgetItem.aggregate({
      where: { category: { projectId: projId } },
      _sum: { costSubtotal: true, saleSubtotal: true },
    });
    const payments = await prisma.payment.groupBy({
      by: ["status"],
      where: { projectId: projId },
      _sum: { amount: true },
    });
    const expenses = await prisma.projectExpense.aggregate({
      where: { projectId: projId },
      _sum: { amount: true },
    });

    const paid = Number(payments.find((p) => p.status === "PAID")?._sum.amount ?? 0);
    const pending = Number(payments.find((p) => p.status === "PENDING")?._sum.amount ?? 0) +
      Number(payments.find((p) => p.status === "OVERDUE")?._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);
    const estimatedTotal = Number(items._sum.saleSubtotal ?? 0);
    const totalCostItems = Number(items._sum.costSubtotal ?? 0);

    await prisma.budgetSummary.create({
      data: {
        projectId: projId,
        estimatedTotal,
        actualTotal: paid + pending,
        totalPaid: paid,
        totalPending: pending,
        totalExpenses,
        totalCostItems,
        grossProfit: estimatedTotal - totalCostItems - totalExpenses,
        profitMargin: estimatedTotal > 0 ? ((estimatedTotal - totalCostItems - totalExpenses) / estimatedTotal) * 100 : 0,
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
    { action: "CREATE_EXPENSE", entityType: "ProjectExpense", days: 40 },
    { action: "CREATE_PAYMENT", entityType: "Payment", days: 25 },
    { action: "UPDATE_PAYMENT", entityType: "Payment", days: 18 },
    { action: "CREATE_CERTIFICATE", entityType: "Certificate", days: 30 },
    { action: "APPROVE_CERTIFICATE", entityType: "Certificate", days: 28 },
    { action: "CREATE_PAYMENT", entityType: "Payment", days: 12 },
    { action: "CREATE_PAYMENT", entityType: "Payment", days: 7 },
    { action: "CREATE_EXPENSE", entityType: "ProjectExpense", days: 5 },
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
  console.log("  ✓ 15 activity logs creados");

  // ═══════════════════════════════════════════════════════════
  // NOTIFICACIONES
  // ═══════════════════════════════════════════════════════════
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, type: "PAYMENT_OVERDUE", title: "Pago vencido hace 5 días", message: "Pago de $2.000.000 a Electricidad Moderna en Edificio Torres del Sol está vencido.", isRead: false, metadata: { projectId: project1.id }, createdAt: daysAgo(1) },
      { userId: admin.id, type: "PAYMENT_DUE", title: "Pago vence en 2 días", message: "Pago de $1.500.000 a Electricidad Moderna en Edificio Torres del Sol vence pronto.", isRead: false, metadata: { projectId: project1.id }, createdAt: daysAgo(0) },
      { userId: admin.id, type: "PAYMENT_OVERDUE", title: "Pago vencido hace 3 días", message: "Pago de $1.500.000 a Sanitarios Belgrano en Edificio Torres del Sol está vencido.", isRead: true, metadata: { projectId: project1.id }, createdAt: daysAgo(2) },
      { userId: admin.id, type: "GENERAL", title: "Bienvenido a BuildControl", message: "Tu cuenta fue creada exitosamente. Comenzá a gestionar tus obras.", isRead: true, metadata: {}, createdAt: daysAgo(70) },
      { userId: editor.id, type: "PAYMENT_OVERDUE", title: "Pago vencido hace 2 días", message: "Pago de $600.000 a Electricidad Moderna en Casa Familia Rodríguez está vencido.", isRead: false, metadata: { projectId: project2.id }, createdAt: daysAgo(0) },
    ],
  });
  console.log("  ✓ 5 notificaciones creadas");

  // ═══════════════════════════════════════════════════════════
  console.log("\n🎉 Seed completado!\n");
  console.log("  Credenciales de acceso:");
  console.log("  ┌──────────────────────────────┬──────────┬─────────────┐");
  console.log("  │ Email                        │ Password │ Rol         │");
  console.log("  ├──────────────────────────────┼──────────┼─────────────┤");
  console.log("  │ admin@buildcontrol.com       │ 123456   │ SUPER_ADMIN │");
  console.log("  │ editor@buildcontrol.com      │ 123456   │ USER        │");
  console.log("  │ viewer@buildcontrol.com      │ 123456   │ USER        │");
  console.log("  └──────────────────────────────┴──────────┴─────────────┘");
  console.log("");
  console.log("  Datos creados:");
  console.log("  • 3 usuarios");
  console.log("  • 3 proyectos (2 en progreso, 1 en planificación)");
  console.log("  • 5 contratistas (1 inactivo)");
  console.log("  • 8 categorías con 21 partidas (con costo y venta)");
  console.log("  • 17 asignaciones contratista-partida");
  console.log("  • 26 pagos (mixto: pagados, pendientes, vencidos + métodos de pago)");
  console.log("  • 10 gastos adicionales (con cantidad, P.U. y partidas vinculadas)");
  console.log("  • 10 registros de avance físico");
  console.log("  • 3 certificaciones (2 aprobadas, 1 enviada)");
  console.log("  • 15 logs de actividad");
  console.log("  • 5 notificaciones");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
