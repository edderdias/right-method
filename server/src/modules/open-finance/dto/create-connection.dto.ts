import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class CreateConnectionDto {
  @ApiProperty({
    format: "uuid",
    description: "Item retornado pelo Pluggy Connect ao final do fluxo.",
  })
  @IsUUID()
  itemId!: string;
}
