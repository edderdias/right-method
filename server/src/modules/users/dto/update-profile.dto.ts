import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const SUPPORTED_CURRENCIES = ["BRL", "USD", "EUR"] as const;

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Maria Silva" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: "(11) 98877-4321" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: "BRL", enum: SUPPORTED_CURRENCIES })
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}
