import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InvestmentIncomeType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";

export class CreateInvestmentIncomeDto {
  @ApiProperty({ enum: InvestmentIncomeType, example: InvestmentIncomeType.RENDIMENTO_FII })
  @IsEnum(InvestmentIncomeType)
  type!: InvestmentIncomeType;

  @ApiProperty({ example: 85.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: "2026-08-20" })
  @IsDateString()
  paymentDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
