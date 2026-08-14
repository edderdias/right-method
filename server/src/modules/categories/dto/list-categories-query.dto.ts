import { ApiPropertyOptional } from "@nestjs/swagger";
import { CategoryType } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({ enum: CategoryType, default: CategoryType.REVENUE })
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;
}
