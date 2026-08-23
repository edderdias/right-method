import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: "Avisar sobre contas a vencer" })
  @IsOptional()
  @IsBoolean()
  notifyBillDue?: boolean;

  @ApiPropertyOptional({ description: "Avisar sobre fechamento/vencimento de faturas" })
  @IsOptional()
  @IsBoolean()
  notifyCardInvoice?: boolean;

  @ApiPropertyOptional({ description: "Avisar sobre progresso de metas" })
  @IsOptional()
  @IsBoolean()
  notifyGoalProgress?: boolean;

  @ApiPropertyOptional({ description: "Avisar quando o saldo ficar baixo" })
  @IsOptional()
  @IsBoolean()
  notifyLowBalance?: boolean;

  @ApiPropertyOptional({ description: "Avisar sobre investimentos (dividendos, vencimentos)" })
  @IsOptional()
  @IsBoolean()
  notifyInvestment?: boolean;
}
