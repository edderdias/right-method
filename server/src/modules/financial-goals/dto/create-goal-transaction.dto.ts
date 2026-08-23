import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GoalTransactionType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";

export class CreateGoalTransactionDto {
  @ApiProperty({ enum: GoalTransactionType, example: GoalTransactionType.DEPOSIT })
  @IsEnum(GoalTransactionType)
  type!: GoalTransactionType;

  @ApiProperty({ example: 1000.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: "2026-08-18" })
  @IsDateString()
  transactionDate!: string;

  @ApiPropertyOptional({ example: "b1f7c9a0-..." })
  @IsOptional()
  @IsString()
  sourceAccountId?: string;

  @ApiPropertyOptional({ example: "Aporte mensal" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
