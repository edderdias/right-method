import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class TransferDto {
  @ApiProperty({ example: "b1f7c9a0-..." })
  @IsString()
  fromAccountId!: string;

  @ApiProperty({ example: "e3a2d4b1-..." })
  @IsString()
  toAccountId!: string;

  @ApiProperty({ example: 250.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: "2026-08-27" })
  @IsDateString()
  transferDate!: string;

  @ApiPropertyOptional({ example: "Reserva de emergência" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;
}
