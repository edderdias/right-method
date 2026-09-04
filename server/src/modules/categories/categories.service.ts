import { Injectable } from "@nestjs/common";
import type { Category } from "@prisma/client";
import { CategoryType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  CategoryAlreadyExistsException,
  CategoryNotFoundException,
} from "../../common/exceptions/app.exception";
import type { CreateCategoryDto } from "./dto/create-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, type: CategoryType = CategoryType.REVENUE): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { type, OR: [{ userId: null }, { userId }] },
      orderBy: { name: "asc" },
    });
  }

  /** Creates a category owned by the user, visible only to them alongside the global ones. Rejects
   * a name that already exists (global or the user's own) for the same type, case-insensitively. */
  async create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    const name = dto.name.trim();
    const existing = await this.prisma.category.findFirst({
      where: {
        type: dto.type,
        name: { equals: name, mode: "insensitive" },
        OR: [{ userId: null }, { userId }],
      },
    });
    if (existing) {
      throw new CategoryAlreadyExistsException();
    }
    return this.prisma.category.create({ data: { userId, name, type: dto.type } });
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
