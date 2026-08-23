import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateConversationDto {
  @ApiPropertyOptional({ example: "Planejamento da viagem" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;
}
