import { Injectable } from "@nestjs/common";
import { BankTransactionType, CategoryType } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

interface CategoryRule {
  keywords: string[];
  categoryName: string;
}

/** Keyword → global category rules (spec section 20). Kept simple on purpose — the user can
 * always override the suggested category, and this is the single extension point for a future,
 * smarter (learned) categorizer (spec section 21). */
const EXPENSE_RULES: CategoryRule[] = [
  {
    keywords: [
      "uber",
      "99",
      "cabify",
      "posto",
      "combustivel",
      "combustível",
      "estacionamento",
      "pedagio",
      "pedágio",
    ],
    categoryName: "Transporte",
  },
  {
    keywords: ["ifood", "rappi", "supermercado", "mercado", "restaurante", "lanchonete", "padaria"],
    categoryName: "Alimentação",
  },
  {
    keywords: [
      "netflix",
      "spotify",
      "amazon prime",
      "disney",
      "hbo",
      "youtube premium",
      "assinatura",
    ],
    categoryName: "Assinaturas",
  },
  {
    keywords: ["farmacia", "farmácia", "drogaria", "hospital", "clinica", "clínica"],
    categoryName: "Saúde",
  },
  {
    keywords: [
      "energia",
      " luz",
      "agua",
      "água",
      "internet",
      "telefone",
      "condominio",
      "condomínio",
    ],
    categoryName: "Contas",
  },
  { keywords: ["escola", "faculdade", "curso", "udemy"], categoryName: "Educação" },
  { keywords: ["cinema", "ingresso", "steam", "playstation", "xbox"], categoryName: "Lazer" },
  { keywords: ["aluguel"], categoryName: "Moradia" },
  {
    keywords: ["magazine", "shopee", "americanas", "mercado livre", "mercadolivre"],
    categoryName: "Compras",
  },
];

const REVENUE_RULES: CategoryRule[] = [
  { keywords: ["salario", "salário", "folha de pagamento"], categoryName: "Salário" },
  { keywords: ["freela", "honorarios", "honorários"], categoryName: "Freelance" },
  { keywords: ["dividendo", "jcp"], categoryName: "Dividendos" },
  { keywords: ["aluguel"], categoryName: "Aluguel" },
  { keywords: ["venda", "marketplace"], categoryName: "Vendas" },
];

export type CategoryLookup = Map<string, string>;

@Injectable()
export class TransactionCategorizerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Preload every global category once per sync run instead of querying per transaction. */
  async buildCategoryLookup(): Promise<CategoryLookup> {
    const categories = await this.prisma.category.findMany({ where: { userId: null } });
    const lookup: CategoryLookup = new Map();
    for (const category of categories) {
      lookup.set(`${category.type}:${category.name}`, category.id);
    }
    return lookup;
  }

  categorize(
    lookup: CategoryLookup,
    type: BankTransactionType,
    description: string,
    merchantName?: string | null,
  ): string | null {
    const categoryType =
      type === BankTransactionType.CREDIT ? CategoryType.REVENUE : CategoryType.EXPENSE;
    const rules = type === BankTransactionType.CREDIT ? REVENUE_RULES : EXPENSE_RULES;
    const haystack = `${description} ${merchantName ?? ""}`.toLowerCase();

    for (const rule of rules) {
      if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
        return lookup.get(`${categoryType}:${rule.categoryName}`) ?? null;
      }
    }
    return null;
  }
}
