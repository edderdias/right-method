import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { RecurrenceType } from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
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
  ValidateIf,
} from "class-validator";

export const CREATABLE_EXPENSE_STATUSES = ["PENDING", "PAID"] as const;
export type CreatableExpenseStatus = (typeof CREATABLE_EXPENSE_STATUSES)[number];

export class CreateExpenseDto {
  @ApiProperty({ example: "Aluguel" })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  description!: string;

  @ApiProperty({ example: 1500.0 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ example: "2026-08-15" })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ example: "2026-08-15" })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ enum: CREATABLE_EXPENSE_STATUSES, default: "PENDING" })
  @IsOptional()
  @IsIn(CREATABLE_EXPENSE_STATUSES)
  status?: CreatableExpenseStatus;

  @ApiPropertyOptional({ example: "Pagamento referente ao mês de agosto." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: RecurrenceType })
  @ValidateIf((dto: CreateExpenseDto) => dto.isRecurring === true)
  @IsEnum(RecurrenceType)
  recurrenceType?: RecurrenceType;

  @ApiPropertyOptional({ example: "2027-08-15" })
  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isInstallment?: boolean;

  @ApiPropertyOptional({ minimum: 2, maximum: 48, example: 12 })
  @ValidateIf((dto: CreateExpenseDto) => dto.isInstallment === true)
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(48)
  totalInstallments?: number;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  creditCardId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  attachmentUrl?: string;
}
