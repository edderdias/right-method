import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class PayInvoiceDto {
  @ApiProperty({ format: "uuid", description: "Conta bancária de onde o valor sairá." })
  @IsUUID()
  accountId!: string;

  @ApiPropertyOptional({ example: "2026-08-20" })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
