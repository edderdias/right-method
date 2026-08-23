import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator";

export const REPORT_PERIOD_PRESETS = [
  "today",
  "this_week",
  "this_month",
  "last_month",
  "last_3_months",
  "last_6_months",
  "this_year",
  "last_year",
] as const;
export type ReportPeriodPreset = (typeof REPORT_PERIOD_PRESETS)[number];

export class ReportsQueryDto {
  @ApiPropertyOptional({ enum: REPORT_PERIOD_PRESETS })
  @IsOptional()
  @IsIn(REPORT_PERIOD_PRESETS)
  preset?: ReportPeriodPreset;

  @ApiPropertyOptional({ example: "2026-08-01" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-08-31" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
