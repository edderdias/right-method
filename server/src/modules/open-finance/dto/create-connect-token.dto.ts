import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class CreateConnectTokenDto {
  @ApiPropertyOptional({
    format: "uuid",
    description: "Item existente do Pluggy — presente apenas ao reconectar/renovar uma conexão.",
  })
  @IsOptional()
  @IsUUID()
  itemId?: string;
}
