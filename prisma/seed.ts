import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const existingUser = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        username: "admin",
        password: passwordHash,
      },
    });
    console.log("Usuario admin creado ✅");
  } else {
    console.log("Usuario admin ya existe ⚠️");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
