import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FinancialGoalCategory, GoalPriority } from "@prisma/client";
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

export class CreateFinancialGoalDto {
  @ApiProperty({ example: "Reserva de emergência" })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: "Construir uma reserva equivalente a 6 meses das despesas." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: FinancialGoalCategory, example: FinancialGoalCategory.RESERVA_EMERGENCIA })
  @IsEnum(FinancialGoalCategory)
  category!: FinancialGoalCategory;

  @ApiPropertyOptional({ enum: GoalPriority, example: GoalPriority.HIGH, default: GoalPriority.MEDIUM })
  @IsOptional()
  @IsEnum(GoalPriority)
  priority?: GoalPriority;

  @ApiProperty({ example: 30000.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  targetAmount!: number;

  @ApiPropertyOptional({ example: 5000.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialAmount?: number;

  @ApiProperty({ example: "2026-08-01" })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: "2027-12-31" })
  @IsDateString()
  targetDate!: string;

  @ApiPropertyOptional({ example: "b1f7c9a0-..." })
  @IsOptional()
  @IsString()
  linkedAccountId?: string;
}
