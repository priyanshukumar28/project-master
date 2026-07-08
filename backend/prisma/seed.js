const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seed() {
  const lobNames = ["Gadget", "Auto", "Travel", "Finance", "Insurance"];
  const lobIds = {};
  for (const name of lobNames) {
    const lob = await prisma.lOB.upsert({ where: { name }, update: {}, create: { name } });
    lobIds[name] = lob.id;
  }

  const categories = ["Bug Fix", "Change Request", "Development", "Maintenance", "Production Movement"];
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  const developers = ["Rahul Sharma", "Ananya Iyer", "Vikram Singh", "Neha Gupta", "Arjun Mehta"];
  for (const name of developers) {
    await prisma.developer.upsert({ where: { name }, update: {}, create: { name } });
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
