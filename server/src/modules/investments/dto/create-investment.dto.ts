import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InvestmentType } from "@prisma/client";
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
  MinLength,
} from "class-validator";

export class CreateInvestmentDto {
  @ApiProperty({ enum: InvestmentType, example: InvestmentType.FIIS })
  @IsEnum(InvestmentType)
  type!: InvestmentType;

  @ApiPropertyOptional({ example: "XPML11" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ticker?: string;

  @ApiProperty({ example: "XP Malls" })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: "XP Investimentos" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  institutionName?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: 103.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  averagePrice?: number;

  @ApiPropertyOptional({ example: 10350.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  investedAmount?: number;

  @ApiPropertyOptional({ example: 10800.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentValue?: number;

  @ApiPropertyOptional({ example: 108.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  currentPrice?: number;

  @ApiPropertyOptional({ example: "Banco X" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  issuer?: string;

  @ApiPropertyOptional({ example: "110% CDI" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  rate?: string;

  @ApiPropertyOptional({ example: "CDI" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  indexer?: string;

  @ApiPropertyOptional({ example: "2029-08-20" })
  @IsOptional()
  @IsDateString()
  maturityDate?: string;

  @ApiPropertyOptional({ example: "Diária" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  liquidity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
