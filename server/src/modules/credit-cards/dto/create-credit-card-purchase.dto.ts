import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateCreditCardPurchaseDto {
  @ApiProperty({ example: "Supermercado" })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  description!: string;

  @ApiProperty({ example: 350.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: "2026-08-10" })
  @IsDateString()
  purchaseDate!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: "João", description: "Quem fez / é responsável pela compra" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  responsibleName?: string;

  @ApiPropertyOptional({ minimum: 2, maximum: 48, example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(48)
  totalInstallments?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
