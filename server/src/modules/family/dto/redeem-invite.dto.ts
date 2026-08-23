import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class RedeemInviteDto {
  @ApiProperty({ example: "7K9QXP4M" })
  @IsString()
  @Length(4, 12)
  code!: string;
}
