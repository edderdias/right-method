import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class DisconnectAccountQueryDto {
  @ApiPropertyOptional({
    default: true,
    description: "Quando falso, também apaga o histórico de movimentações já sincronizado.",
  })
  @IsOptional()
  @Transform(({ value }) => value === undefined || value === "true" || value === true)
  @IsBoolean()
  keepHistory?: boolean = true;
}
