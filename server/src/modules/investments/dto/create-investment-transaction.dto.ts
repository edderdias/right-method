import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InvestmentTransactionType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MaxLength,
} from "class-validator";

export class CreateInvestmentTransactionDto {
  @ApiProperty({ enum: InvestmentTransactionType, example: InvestmentTransactionType.BUY })
  @IsEnum(InvestmentTransactionType)
  type!: InvestmentTransactionType;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @ApiPropertyOptional({ example: 105.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  unitPrice?: number;

  @ApiProperty({ example: 2100.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fees?: number;

  @ApiProperty({ example: "2026-08-18" })
  @IsDateString()
  transactionDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
