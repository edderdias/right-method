import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class SendMessageDto {
  @ApiProperty({ example: "Quanto gastei este mês?" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;
}
