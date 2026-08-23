import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateCreditCardDto {
  @ApiProperty({ example: "Nubank" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: "Mastercard" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  brand?: string;

  @ApiPropertyOptional({ example: "4589" })
  @IsOptional()
  @Matches(/^\d{4}$/, { message: "Informe os últimos 4 dígitos do cartão." })
  lastFourDigits?: string;

  @ApiPropertyOptional({ example: 5000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  creditLimit?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 31, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  closingDay?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 31, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;
}
