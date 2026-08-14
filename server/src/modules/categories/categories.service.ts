import { Injectable } from "@nestjs/common";
import type { Category } from "@prisma/client";
import { CategoryType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CategoryNotFoundException } from "../../common/exceptions/app.exception";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, type: CategoryType = CategoryType.REVENUE): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { type, OR: [{ userId: null }, { userId }] },
      orderBy: { name: "asc" },
    });
  }

  async assertOwnershipOrGlobal(
    userId: string,
    categoryId: string,
    type: CategoryType = CategoryType.REVENUE,
  ): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, type, OR: [{ userId: null }, { userId }] },
    });
    if (!category) {
      throw new CategoryNotFoundException();
    }
    return category;
  }
}
