import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
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
} from "class-validator";

export class CreateCreditCardPurchaseDto {
  @ApiProperty({ example: "Supermercado" })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  description!: string;

  @ApiProperty({ example: 350.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: "2026-08-10" })
  @IsDateString()
  purchaseDate!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: "João", description: "Quem fez / é responsável pela compra" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  responsibleName?: string;

  @ApiPropertyOptional({ minimum: 2, maximum: 48, example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(48)
  totalInstallments?: number;

  @ApiPropertyOptional({
    description:
      "Compra recorrente: lançada automaticamente todo mês até a data de término informada (ou indefinidamente, se não informada). Não pode ser combinada com parcelamento.",
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    example: "2027-08-10",
    description: "Data em que a recorrência deve parar. Deixe em branco para repetir sem prazo definido.",
  })
  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
