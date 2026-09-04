import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CategoryType } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/types/authenticated-request";
import { CategoriesService } from "./categories.service";
import { ListCategoriesQueryDto } from "./dto/list-categories-query.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";

@ApiTags("categories")
@ApiBearerAuth()
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "Lista categorias globais e do usuário autenticado" })
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListCategoriesQueryDto) {
    const data = await this.categoriesService.list(user.sub, query.type ?? CategoryType.REVENUE);
    return { message: "Categorias.", data };
  }

  @Post()
  @ApiOperation({ summary: "Cadastra uma categoria personalizada do usuário" })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCategoryDto) {
    const data = await this.categoriesService.create(user.sub, dto);
    return { message: "Categoria cadastrada com sucesso.", data };
  }
}
