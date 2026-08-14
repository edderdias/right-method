import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export const DASHBOARD_PERIOD_PRESETS = ["last30days", "last6months"] as const;
export type DashboardPeriodPreset = (typeof DASHBOARD_PERIOD_PRESETS)[number];

export class DashboardPeriodQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ minimum: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;

  @ApiPropertyOptional({ example: "2026-08-01" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-08-31" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: DASHBOARD_PERIOD_PRESETS })
  @IsOptional()
  @IsIn(DASHBOARD_PERIOD_PRESETS)
  preset?: DashboardPeriodPreset;
}
