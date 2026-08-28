import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateAccountDto {
  @ApiPropertyOptional({ example: "Conta corrente" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 1500.5, description: "Novo saldo da conta (valor absoluto)." })
  @IsOptional()
  @IsNumber()
  balance?: number;
}
