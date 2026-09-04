import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

/**
 * Applies to both MANUAL and OPEN_FINANCE purchases. The service enforces that OPEN_FINANCE
 * purchases only ever accept categoryId/notes — description/purchaseDate stay exactly as
 * reported by the provider (spec section 27).
 */
export class UpdateCreditCardPurchaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: "Responsável pela compra (null limpa)" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  responsibleName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: "Defina como false para parar a recorrência — nenhuma nova ocorrência será lançada.",
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: "Data em que a recorrência deve parar (null limpa, repetindo sem prazo definido).",
  })
  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string | null;
}
