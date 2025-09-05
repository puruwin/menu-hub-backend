import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const allergens = ["gluten", "crustáceos", "huevos", "pescado", "cacahuetes", "soja", "lácteos", "cáscara", "apio", "mostaza", "sésamo", "sulfitos", "moluscos", "altramuces"];

  for (const name of allergens) {
    await prisma.allergen.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Alérgenos cargados ✅");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
