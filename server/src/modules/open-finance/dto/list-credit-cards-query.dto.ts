import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class ListOpenFinanceCreditCardsQueryDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  connectionId!: string;
}
