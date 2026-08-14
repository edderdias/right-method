import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min, MinLength, MaxLength } from "class-validator";

export class CreateAccountDto {
  @ApiProperty({ example: "Conta corrente" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialBalance?: number;
}
