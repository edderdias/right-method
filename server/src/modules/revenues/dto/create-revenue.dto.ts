import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RecurrenceType } from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

export const CREATABLE_REVENUE_STATUSES = ["PENDING", "RECEIVED"] as const;
export type CreatableRevenueStatus = (typeof CREATABLE_REVENUE_STATUSES)[number];

export class CreateRevenueDto {
  @ApiProperty({ example: "Salário" })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  description!: string;

  @ApiProperty({ example: 5000.0 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ example: "2026-08-05" })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ example: "2026-08-05" })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional({ enum: CREATABLE_REVENUE_STATUSES, default: "PENDING" })
  @IsOptional()
  @IsIn(CREATABLE_REVENUE_STATUSES)
  status?: CreatableRevenueStatus;

  @ApiPropertyOptional({ example: "Pagamento referente a agosto." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: RecurrenceType })
  @ValidateIf((dto: CreateRevenueDto) => dto.isRecurring === true)
  @IsEnum(RecurrenceType)
  recurrenceType?: RecurrenceType;

  @ApiPropertyOptional({ example: "2027-08-05" })
  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;
}
