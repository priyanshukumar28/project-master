const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seed() {
  const lobs = [
    { name: "Gadget", code: "GDGT" },
    { name: "Auto", code: "AUTO" },
    { name: "Travel", code: "TRVL" },
    { name: "Finance", code: "FIN" },
    { name: "Insurance", code: "INS" },
  ];
  const lobIds = {};
  for (const { name, code } of lobs) {
    const lob = await prisma.lOB.upsert({ where: { name }, update: { code }, create: { name, code } });
    lobIds[name] = lob.id;
  }

  const categories = ["Bug Fix", "Change Request", "Development", "Maintenance", "Production Movement"];
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Developers are LOB-specific; a couple are left global (lobId: null) to show that path too.
  const developers = [
    { name: "Rahul Sharma", lob: "Gadget" },
    { name: "Ananya Iyer", lob: "Auto" },
    { name: "Vikram Singh", lob: "Travel" },
    { name: "Neha Gupta", lob: "Finance" },
    { name: "Arjun Mehta", lob: "Travel" },
  ];
  for (const d of developers) {
    const lobId = lobIds[d.lob] || null;
    const existing = await prisma.developer.findFirst({ where: { name: d.name, lobId } });
    if (!existing) await prisma.developer.create({ data: { name: d.name, lobId } });
  }

  const adminHash = await bcrypt.hash("Admin@123", 10);
  await prisma.user.upsert({
    where: { email: "admin@acrossassist.com" },
    update: {},
    create: { name: "System Admin", email: "admin@acrossassist.com", passwordHash: adminHash, role: "ADMIN" },
  });
  console.log("admin@acrossassist.com / Admin@123");

  const baHash = await bcrypt.hash("Ba@12345", 10);
  await prisma.user.upsert({
    where: { email: "ba.travel@acrossassist.com" },
    update: {},
    create: {
      name: "Priya Nair",
      email: "ba.travel@acrossassist.com",
      passwordHash: baHash,
      role: "BA",
      lobId: lobIds["Travel"],
    },
  });
  console.log("ba.travel@acrossassist.com / Ba@12345 (Travel LOB)");

  console.log("Seed complete.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());