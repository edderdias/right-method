import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID } from "class-validator";

export class AddOpenFinanceCreditCardDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  connectionId!: string;

  @ApiProperty({ description: "Id da conta de cartão no provedor (Pluggy)." })
  @IsString()
  externalCardId!: string;
}
