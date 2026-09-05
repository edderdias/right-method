import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class ReverseInvoicePaymentDto {
  @ApiProperty({ description: "Motivo do estorno.", minLength: 3, maxLength: 300 })
  @IsString()
  @Length(3, 300)
  reason!: string;
}
