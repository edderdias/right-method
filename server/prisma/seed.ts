import { CategoryType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_REVENUE_CATEGORIES = [
  "Salário",
  "Freelance",
  "Investimentos",
  "Dividendos",
  "Aluguel",
  "Vendas",
  "Benefícios",
  "Outros",
];

const DEFAULT_EXPENSE_CATEGORIES = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Assinaturas",
  "Impostos",
  "Contas",
  "Investimentos",
  "Outros",
];

async function seedCategories(names: string[], type: CategoryType): Promise<void> {
  for (const name of names) {
    const existing = await prisma.category.findFirst({
      where: { userId: null, name, type },
    });
    if (!existing) {
      await prisma.category.create({ data: { userId: null, name, type } });
      // eslint-disable-next-line no-console
      console.log(`Categoria criada (${type}): ${name}`);
    }
  }
}

async function main(): Promise<void> {
  await seedCategories(DEFAULT_REVENUE_CATEGORIES, CategoryType.REVENUE);
  await seedCategories(DEFAULT_EXPENSE_CATEGORIES, CategoryType.EXPENSE);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
